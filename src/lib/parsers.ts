/**
 * TypeMorph Parser Utilities
 * Handles extraction of data from various formats (YAML, XML, CURL, SQL)
 */

import yaml from 'js-yaml';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

// ---------------------------------------------------------------------------
// YAML Parser — uses js-yaml for full spec compliance
// (nested objects, arrays, anchors, multi-line strings, etc.)
// ---------------------------------------------------------------------------
export const parseYAML = (str: string): any => {
  try {
    const parsed = yaml.load(str);
    if (parsed === null || parsed === undefined) return {};
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      // Wrap primitive / array results so callers always get a plain object
      return { value: parsed };
    }
    const result = parsed as Record<string, unknown>;
    // Bug 1 fix: guard against the parsed object accidentally having a _parseError key
    // (shouldn't happen on success, but defensive check)
    if ('_parseError' in result) return {};
    return result;
  } catch {
    // Return null so the caller can distinguish parse failure from empty data.
    // Previously returned { _parseError: msg } which was falsely treated as valid schema input.
    return null;
  }
};

// ---------------------------------------------------------------------------
// XML Parser — uses fast-xml-parser for full XML support
// (nested elements, attributes, CDATA, namespaces, etc.)
// ---------------------------------------------------------------------------

/** Recursively coerce numeric strings to numbers (max depth guard) */
const coerceNumbers = (obj: any, depth = 0): any => {
  if (depth > 50) return obj;
  if (Array.isArray(obj)) return obj.map(v => coerceNumbers(v, depth + 1));
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, coerceNumbers(v, depth + 1)])
    );
  }
  if (typeof obj === 'string' && obj.trim() !== '' && !isNaN(Number(obj))) {
    return Number(obj);
  }
  return obj;
};

/**
 * Recursively strip the '@_' attribute prefix added by fast-xml-parser.
 * This prevents TypeMorph from generating invalid TypeScript field names like '@_id'.
 * e.g. { '@_id': 1, name: 'foo' } → { id: 1, name: 'foo' }
 */
const stripAttrPrefix = (obj: any, depth = 0): any => {
  if (depth > 50) return obj;
  if (Array.isArray(obj)) return obj.map(v => stripAttrPrefix(v, depth + 1));
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.startsWith('@_') ? k.slice(2) : k,
        stripAttrPrefix(v, depth + 1),
      ])
    );
  }
  return obj;
};

export const parseXML = (str: string): any => {
  try {
    if (XMLValidator.validate(str) !== true) return null;
    const parser = new XMLParser({
      ignoreAttributes: false,       // preserve attributes (e.g. id="1")
      attributeNamePrefix: '@_',     // attributes prefixed with @_
      allowBooleanAttributes: true,
      parseAttributeValue: true,     // auto-cast attribute values
      parseTagValue: true,           // auto-cast tag text content
      trimValues: true,
      cdataPropName: '__cdata',
    });
    const raw = parser.parse(str);
    // Bug 3 fix: strip '@_' prefix so TypeScript field names are valid identifiers
    return stripAttrPrefix(coerceNumbers(raw));
  } catch {
    // Return null so the caller can detect failure (mirrors parseYAML behaviour)
    return null;
  }
};

export const parseCurl = (curl: string) => {
  // Step 1: handle only the line-continuation backslashes (keep body whitespace intact)
  const joinedCurl = curl.replace(/\\\s*\n\s*/g, ' ').trim();

  // Step 2: collapse whitespace only for flag-parsing purposes, but keep original for body extraction
  const cleanCurl = joinedCurl.replace(/\s+/g, ' ').trim();

  // Extract Method
  let method = 'GET';
  const methodMatch = cleanCurl.match(/(?:-X|--request)\s+(\w+)/i);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  } else if (/(?:-d|--data|--data-raw|--data-binary)\s+/.test(cleanCurl)) {
    method = 'POST'; // Default to POST if data is present but no method specified
  }

  // Extract URL (starts with http/https, matches inside single/double quotes or unquoted)
  let url = '';
  const urlMatch = cleanCurl.match(/(?:https?:\/\/[^\s'"]+)/);
  if (urlMatch) {
    url = urlMatch[0];
  }

  // Extract Headers
  const headers: any = {};
  // Matches both -H 'Header: Value' and -H "Header: Value" and --header '...' and --header "..."
  const headerMatches = cleanCurl.matchAll(/(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)")/gi);
  for (const m of headerMatches) {
    const headerStr = m[1] || m[2];
    if (headerStr) {
      const firstColon = headerStr.indexOf(':');
      if (firstColon !== -1) {
        const k = headerStr.slice(0, firstColon).trim();
        const v = headerStr.slice(firstColon + 1).trim();
        headers[k] = v;
      }
    }
  }

  // Extract Body
  // Bug 5 fix: previous regex used '[^']*' which stops at the first embedded single quote.
  // New approach: try single-quoted first with escaped-quote support, then double-quoted,
  // then fall back to the rest of the string after the flag.
  let body = '';
  let bodyJson = null;

  // Try single-quoted body with POSIX-escaped inner quotes (it'\''s fine)
  const bodySingleMatch = cleanCurl.match(
    /(?:-d|--data|--data-raw|--data-binary)\s+'((?:[^'\\]|\\.)*)'/i
  );
  // Try double-quoted body
  const bodyDoubleMatch = cleanCurl.match(
    /(?:-d|--data|--data-raw|--data-binary)\s+"((?:[^"\\]|\\.)*)"/i
  );
  // Try unquoted body (everything up to next flag or end of string)
  const bodyUnquotedMatch = cleanCurl.match(
    /(?:-d|--data|--data-raw|--data-binary)\s+([^\s-][^\s]*)/i
  );

  // Extract body from the original joined (non-collapsed) string to preserve JSON whitespace
  if (bodySingleMatch) {
    body = bodySingleMatch[1];
  } else if (bodyDoubleMatch) {
    body = bodyDoubleMatch[1].replace(/\\"/g, '"');
  } else {
    // Fallback: try on the original joined curl to preserve whitespace
    const singleFromRaw = joinedCurl.match(
      /(?:-d|--data|--data-raw|--data-binary)\s+'((?:[^'\\]|\\.)*)'/i
    );
    const doubleFromRaw = joinedCurl.match(
      /(?:-d|--data|--data-raw|--data-binary)\s+"((?:[^"\\]|\\.)*)"/i
    );
    if (singleFromRaw) body = singleFromRaw[1];
    else if (doubleFromRaw) body = doubleFromRaw[1].replace(/\\"/g, '"');
    else if (bodyUnquotedMatch) body = bodyUnquotedMatch[1];
  }

  if (body) {
    try {
      // JSON doesn't allow escaped single quotes, so unescape them if they were bash-escaped
      const unescapedBody = body.replace(/\\'/g, "'");
      bodyJson = JSON.parse(unescapedBody);
    } catch {
      try {
        const unescapedBody = body.replace(/\\'/g, "'").replace(/\\"/g, '"');
        bodyJson = JSON.parse(unescapedBody);
      } catch {}
    }
  }

  return { method, url, headers, body, bodyJson };
};

const extractOuterParens = (sql: string): string => {
  let depth = 0, start = -1, result = '';
  let inString = false;
  let stringChar = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    // Track string literals to skip their contents
    if (!inString && (ch === `'` || ch === '"' || ch === '`')) {
      inString = true;
      stringChar = ch;
      continue;
    }
    if (inString) {
      // Handle escaped characters inside string
      if (ch === '\\') { i++; continue; }
      if (ch === stringChar) inString = false;
      continue;
    }
    if (ch === '(') { if (depth++ === 0) start = i + 1; }
    else if (ch === ')') { if (--depth === 0) { result = sql.slice(start, i); break; } }
  }
  return result;
};

export const parseSQLToZod = (sql: string) => {
  const tableName = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`]?(\w+)["`]?/i)?.[1] || 'Schema';

  // Extract only the column definition block between the outermost parentheses,
  // then parse each line individually. Handles nested parentheses safely.
  const body = extractOuterParens(sql);

  const sqlKeywords = new Set([
    'CREATE', 'TABLE', 'PRIMARY', 'KEY', 'NOT', 'NULL', 'FOREIGN', 'REFERENCES',
    'CONSTRAINT', 'UNIQUE', 'INDEX', 'DEFAULT', 'CHECK', 'AUTO_INCREMENT',
    'ON', 'UPDATE', 'DELETE', 'CASCADE', 'SET', 'ENGINE', 'CHARSET', 'COLLATE',
    'UNSIGNED', 'SIGNED', 'ZEROFILL', 'COMMENT', 'AFTER', 'FIRST', 'ADD', 'COLUMN',
    'IF', 'EXISTS', 'TEMPORARY', 'WITH', 'WITHOUT', 'ROWID',
    'BIGINT', 'SMALLINT', 'MEDIUMINT', 'TINYINT',
    'VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR',
    'TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'TINYTEXT',
    'BLOB', 'LONGBLOB', 'MEDIUMBLOB', 'TINYBLOB',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR',
    'SERIAL', 'BIGSERIAL', 'SMALLSERIAL',
    'JSON', 'JSONB', 'UUID', 'ENUM', 'SET',
  ]);

  let out = `export const ${tableName}Schema = z.object({\n`;

  // Split by top-level commas only — robustly skips commas inside parentheses
  // (e.g. DECIMAL(10,2)) AND inside string literals (e.g. DEFAULT 'a,b,c').
  const splitTopLevelCommas = (s: string): string[] => {
    const parts: string[] = [];
    let depth = 0, inStr = false, strChar = '', cur = '';
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (!inStr && (ch === "'" || ch === '"' || ch === '`')) {
        inStr = true; strChar = ch; cur += ch; continue;
      }
      if (inStr) {
        if (ch === '\\') { cur += ch + s[++i]; continue; }
        if (ch === strChar) inStr = false;
        cur += ch; continue;
      }
      if (ch === '(') { depth++; cur += ch; continue; }
      if (ch === ')') { depth--; cur += ch; continue; }
      if (ch === ',' && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  };
  const lines = splitTopLevelCommas(body);
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    // Match: columnName TYPE[(size)] [modifiers...]
    const colMatch = trimmedLine.match(/^["`]?(\w+)["`]?\s+(\w+)/);
    if (!colMatch) continue;

    const colName = colMatch[1];
    const colNameUpper = colName.toUpperCase();
    const type = colMatch[2].toUpperCase();

    // Skip SQL keywords used as column names (PRIMARY KEY, CONSTRAINT, etc.)
    if (sqlKeywords.has(colNameUpper)) continue;
    // Skip pure numbers (e.g. from VARCHAR(255) → '255')
    if (/^\d+$/.test(colName)) continue;

    let zodType = 'z.string()';
    if (['INT', 'INTEGER', 'FLOAT', 'DECIMAL', 'DOUBLE', 'NUMERIC', 'REAL',
         'BIGINT', 'SMALLINT', 'MEDIUMINT', 'SERIAL', 'BIGSERIAL', 'SMALLSERIAL'].includes(type)) zodType = 'z.number()';
    if (['BOOLEAN', 'BOOL', 'BIT'].includes(type)) zodType = 'z.boolean()';
    if (['DATE', 'DATETIME', 'TIMESTAMP', 'TIME'].includes(type)) zodType = 'z.string() /* datetime */';
    if (['JSON', 'JSONB'].includes(type)) zodType = 'z.any() /* json */';
    if (type === 'UUID') zodType = 'z.string().uuid()';

    // Mark optional if column allows NULL
    const isNullable = /\bNULL\b/i.test(trimmedLine) && !/NOT\s+NULL/i.test(trimmedLine);
    if (isNullable) zodType += '.nullable()';

    out += `  ${colName}: ${zodType},\n`;
  }

  out += `});`;
  return out;
};

export const curlToTypeScript = (parsed: any) => {
  const { method, url, headers, body, bodyJson } = parsed;
  let out = `/**\n * TypeMorph Generated React Hook\n */\n`;
  out += `export const useApiCall = async () => {\n`;

  // Bug 4 fix: auto-inject Content-Type when sending a JSON body,
  // unless the user's original cURL already specified it.
  const mergedHeaders = { ...headers };
  if (bodyJson && !Object.keys(mergedHeaders).some(k => k.toLowerCase() === 'content-type')) {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  if (Object.keys(mergedHeaders).length > 0) {
    out += `  const headers = ${JSON.stringify(mergedHeaders, null, 2).replace(/\n/g, '\n  ')};\n\n`;
  }
  if (bodyJson) {
    out += `  const body = ${JSON.stringify(bodyJson, null, 2).replace(/\n/g, '\n  ')};\n\n`;
  }
  out += `  const res = await fetch('${url}', {\n`;
  out += `    method: '${method}',\n`;
  if (Object.keys(mergedHeaders).length > 0) out += `    headers,\n`;
  if (bodyJson) {
    out += `    body: JSON.stringify(body),\n`;
  } else if (body) {
    // Safely escape single quotes and backslashes in raw text body
    const escapedBody = body.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    out += `    body: '${escapedBody}',\n`;
  }
  out += `  });\n\n`;
  out += `  return await res.json();\n`;
  out += `};`;
  return out;
};
