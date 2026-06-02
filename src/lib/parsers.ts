/**
 * TypeFlow Parser Utilities
 * Handles extraction of data from various formats (YAML, XML, CURL, SQL)
 */

import yaml from 'js-yaml';
import { XMLParser } from 'fast-xml-parser';

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
    return parsed as Record<string, unknown>;
  } catch (err: any) {
    // Return a structured error so the UI can display it
    return { _parseError: err?.message ?? 'YAML parse failed' };
  }
};

// ---------------------------------------------------------------------------
// XML Parser — uses fast-xml-parser for full XML support
// (nested elements, attributes, CDATA, namespaces, etc.)
// ---------------------------------------------------------------------------

/** Recursively coerce numeric strings to numbers */
const coerceNumbers = (obj: any): any => {
  if (Array.isArray(obj)) return obj.map(coerceNumbers);
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, coerceNumbers(v)])
    );
  }
  if (typeof obj === 'string' && obj.trim() !== '' && !isNaN(Number(obj))) {
    return Number(obj);
  }
  return obj;
};

export const parseXML = (str: string): any => {
  try {
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
    return coerceNumbers(raw);
  } catch (err: any) {
    return { _parseError: err?.message ?? 'XML parse failed' };
  }
};

export const parseCurl = (curl: string) => {
  // Normalize whitespaces
  const cleanCurl = curl.replace(/\s+/g, ' ');
  
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
  // Matches -d '...', --data '...', --data-raw '...', etc.
  const bodyMatch = cleanCurl.match(/(?:-d|--data|--data-raw|--data-binary)\s+(?:'([^']*)'|"([^"]*)")/i);
  let body = '';
  let bodyJson = null;
  if (bodyMatch) {
    body = bodyMatch[1] || bodyMatch[2] || '';
    try {
      bodyJson = JSON.parse(body);
    } catch {
      // Maybe escaping double quotes inside double quoted curl?
      // e.g. "{\"a\": 1}"
      try {
        bodyJson = JSON.parse(body.replace(/\\"/g, '"'));
      } catch {}
    }
  }
  
  return { method, url, headers, body, bodyJson };
};

export const parseSQLToZod = (sql: string) => {
  const tableName = sql.match(/CREATE TABLE\s+(\w+)/i)?.[1] || 'Schema';
  const columns = sql.matchAll(/(\w+)\s+(\w+)/g);
  let out = `export const ${tableName}Schema = z.object({\n`;
  const sqlKeywords = new Set([
    'CREATE', 'TABLE', 'PRIMARY', 'KEY', 'NOT', 'NULL', 'FOREIGN', 'REFERENCES', 
    'CONSTRAINT', 'UNIQUE', 'INDEX', 'DEFAULT', 'CHECK', 'AUTO_INCREMENT', 
    'ON', 'UPDATE', 'DELETE', 'CASCADE', 'SET', 'ENGINE', 'CHARSET', 'COLLATE',
    'UNSIGNED', 'SIGNED', 'ZEROFILL', 'COMMENT', 'AFTER', 'FIRST', 'ADD', 'COLUMN',
    'IF', 'EXISTS', 'TEMPORARY', 'WITH', 'WITHOUT', 'ROWID',
    // Common SQL type keywords that should not be treated as column names
    'BIGINT', 'SMALLINT', 'MEDIUMINT', 'TINYINT',
    'VARCHAR', 'NVARCHAR', 'CHAR', 'NCHAR',
    'TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'TINYTEXT',
    'BLOB', 'LONGBLOB', 'MEDIUMBLOB', 'TINYBLOB',
    'DATE', 'DATETIME', 'TIMESTAMP', 'TIME', 'YEAR',
    'SERIAL', 'BIGSERIAL', 'SMALLSERIAL',
    'JSON', 'JSONB', 'UUID', 'ENUM', 'SET',
  ]);
  
  for (const col of columns) {
    const colNameUpper = col[1].toUpperCase();
    if (sqlKeywords.has(colNameUpper)) continue;
    // Skip pure numbers (e.g. VARCHAR(255) → '255')
    if (/^\d+$/.test(col[1])) continue;
    
    const type = col[2].toUpperCase();
    let zodType = 'z.string()';
    if (['INT', 'INTEGER', 'FLOAT', 'DECIMAL', 'DOUBLE', 'NUMERIC', 'REAL',
         'BIGINT', 'SMALLINT', 'MEDIUMINT', 'SERIAL', 'BIGSERIAL', 'SMALLSERIAL'].includes(type)) zodType = 'z.number()';
    if (['BOOLEAN', 'BOOL', 'BIT'].includes(type)) zodType = 'z.boolean()';
    if (['DATE', 'DATETIME', 'TIMESTAMP', 'TIME'].includes(type)) zodType = 'z.string() /* datetime */';
    if (['JSON', 'JSONB'].includes(type)) zodType = 'z.any() /* json */';
    if (type === 'UUID') zodType = 'z.string().uuid()';
    out += `  ${col[1]}: ${zodType},\n`;
  }
  out += `});`;
  return out;
};

export const curlToTypeScript = (parsed: any) => {
  const { method, url, headers, body, bodyJson } = parsed;
  let out = `/**\n * TypeFlow Generated React Hook\n */\n`;
  out += `export const useApiCall = async () => {\n`;
  if (Object.keys(headers).length > 0) {
    out += `  const headers = ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')};\n\n`;
  }
  out += `  const res = await fetch('${url}', {\n`;
  out += `    method: '${method}',\n`;
  if (Object.keys(headers).length > 0) out += `    headers,\n`;
  if (body) out += `    body: ${bodyJson ? 'JSON.stringify(body)' : `'${body}'`},\n`;
  out += `  });\n\n`;
  out += `  return await res.json();\n`;
  out += `};`;
  return out;
};
