/**
 * TypeMorph Parser Utilities
 * Handles extraction of data from various formats (YAML, XML, CURL, SQL)
 */

import yaml from 'js-yaml';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { Schema } from './types';

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
  } else if (/(?:-d|--data|--data-raw|--data-binary)\s*\S/.test(cleanCurl)) {
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
  // Try single-quoted first (with escaped-quote support), then double-quoted,
  // then unquoted.  \s* allows -d'...' (no space between flag and quote).
  let body = '';
  let bodyJson = null;

  const bodySingleMatch =
    cleanCurl.match(/(?:-d|--data|--data-raw|--data-binary)\s*'((?:[^'\\]|\\.)*)'/i) ||
    joinedCurl.match(/(?:-d|--data|--data-raw|--data-binary)\s*'((?:[^'\\]|\\.)*)'/i);

  const bodyDoubleMatch =
    cleanCurl.match(/(?:-d|--data|--data-raw|--data-binary)\s*"((?:[^"\\]|\\.)*)"/i) ||
    joinedCurl.match(/(?:-d|--data|--data-raw|--data-binary)\s*"((?:[^"\\]|\\.)*)"/i);

  // Unquoted body: capture non-flag tokens after the data flag
  const bodyUnquotedMatch = cleanCurl.match(
    /(?:-d|--data|--data-raw|--data-binary)\s+(\S+(?:\s+(?!-[a-zA-Z])\S+)*)/i
  );

  if (bodySingleMatch) {
    body = bodySingleMatch[1];
  } else if (bodyDoubleMatch) {
    body = bodyDoubleMatch[1].replace(/\\"/g, '"');
  } else if (bodyUnquotedMatch) {
    body = bodyUnquotedMatch[1];
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

    if (type === 'ENUM') {
      const enumMatch = trimmedLine.match(/ENUM\s*\(([^)]+)\)/i);
      if (enumMatch) {
        const values = enumMatch[1]
          .split(',')
          .map(v => v.trim().replace(/^['"`]|['"`]$/g, ''));
        if (values.length > 0) {
          zodType = `z.enum([${values.map(v => `'${v}'`).join(', ')}])`;
        }
      }
    }

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

// ---------------------------------------------------------------------------
// OpenAPI / Swagger Parser
// ---------------------------------------------------------------------------

const resolveRef = (ref: string, spec: any): any => {
  if (!ref.startsWith('#/')) return {};
  const parts = ref.split('/').slice(1);
  let current = spec;
  for (const part of parts) {
    if (!current) return {};
    current = current[part.replace(/~1/g, '/').replace(/~0/g, '~')];
  }
  return current;
};

const openApiSchemaToSchema = (oaSchema: any, spec: any, depth: number = 0): Schema => {
  if (depth > 10 || !oaSchema) return { type: 'any' };

  if (oaSchema.$ref) {
    const resolved = resolveRef(oaSchema.$ref, spec);
    return openApiSchemaToSchema(resolved, spec, depth + 1);
  }

  if (oaSchema.allOf && Array.isArray(oaSchema.allOf)) {
    const merged: any = { type: 'object', properties: {}, required: [] };
    for (const sub of oaSchema.allOf) {
      const subSchema = resolveRef(sub.$ref, spec) || sub;
      if (subSchema.properties) {
        Object.assign(merged.properties, subSchema.properties);
      }
      if (subSchema.required) {
        merged.required.push(...subSchema.required);
      }
    }
    oaSchema = { ...oaSchema, ...merged };
  } else if (oaSchema.anyOf || oaSchema.oneOf) {
    return { type: 'union' };
  }

  const typeMap: Record<string, 'string'|'number'|'boolean'|'object'|'array'|'any'> = {
    'string': 'string',
    'integer': 'number',
    'number': 'number',
    'boolean': 'boolean',
    'object': 'object',
    'array': 'array',
  };

  const schemaType = typeMap[oaSchema.type] || 'any';
  const result: Schema = { type: schemaType as any };

  if (schemaType === 'string' && oaSchema.format) {
    if (oaSchema.format === 'email') result.format = 'email';
    if (oaSchema.format === 'uri') result.format = 'url';
    if (oaSchema.format === 'uuid') result.format = 'uuid';
    if (oaSchema.format === 'date-time') result.format = 'datetime';
  }

  if (schemaType === 'number') {
    if (oaSchema.type === 'integer' || oaSchema.format === 'int32' || oaSchema.format === 'int64') {
      result.format = 'int';
    } else if (oaSchema.format === 'float' || oaSchema.format === 'double') {
      result.format = 'float';
    }
  }

  if (oaSchema.enum && Array.isArray(oaSchema.enum)) {
    result.type = 'string';
    result.enumValues = oaSchema.enum.map(String);
  }

  if (schemaType === 'object' && oaSchema.properties) {
    result.fields = {};
    const requiredProps = Array.isArray(oaSchema.required) ? oaSchema.required : [];
    for (const [key, propObj] of Object.entries(oaSchema.properties)) {
      const fieldSchema = openApiSchemaToSchema(propObj, spec, depth + 1);
      if (!requiredProps.includes(key)) {
        fieldSchema.optional = true;
      }
      result.fields[key] = fieldSchema;
    }
  }

  if (schemaType === 'array' && oaSchema.items) {
    result.itemType = openApiSchemaToSchema(oaSchema.items, spec, depth + 1);
  }

  return result;
};

export const parseOpenAPI = (input: string): Schema | null => {
  try {
    let spec;
    try {
      spec = JSON.parse(input);
    } catch {
      spec = yaml.load(input);
    }
    
    if (!spec || typeof spec !== 'object') return null;

    const isOpenAPI3 = spec.openapi && String(spec.openapi).startsWith('3');
    const isSwagger2 = spec.swagger && String(spec.swagger).startsWith('2');

    if (!isOpenAPI3 && !isSwagger2) return null;

    let targetSchemaObj = null;

    if (isOpenAPI3 && spec.components?.schemas) {
      const keys = Object.keys(spec.components.schemas);
      if (keys.length > 0) targetSchemaObj = spec.components.schemas[keys[0]];
    } else if (isSwagger2 && spec.definitions) {
      const keys = Object.keys(spec.definitions);
      if (keys.length > 0) targetSchemaObj = spec.definitions[keys[0]];
    } else if (spec.paths) {
      for (const path of Object.values(spec.paths)) {
        const getOp = (path as any)?.get;
        if (getOp?.responses?.['200']?.content?.['application/json']?.schema) {
          targetSchemaObj = getOp.responses['200'].content['application/json'].schema;
          break;
        } else if (getOp?.responses?.['200']?.schema) {
          targetSchemaObj = getOp.responses['200'].schema;
          break;
        }
      }
    }

    if (!targetSchemaObj) return null;

    const finalSchema = openApiSchemaToSchema(targetSchemaObj, spec);
    (finalSchema as any)._isTypeMorphSchema = true;
    return finalSchema;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// TypeScript Interface / Type Parser
// ---------------------------------------------------------------------------

const mapSimpleTsTypeToSchema = (typeStr: string): Schema => {
  if (typeStr === 'string') return { type: 'string' };
  if (typeStr === 'number') return { type: 'number' };
  if (typeStr === 'boolean') return { type: 'boolean' };
  if (typeStr === 'Date') return { type: 'string', format: 'datetime' };
  return { type: 'any' };
};

export const parseTypeScriptToSchema = (str: string): Schema | null => {
  try {
    const interfaceMatch = str.match(/(?:export\s+)?(?:interface|type)\s+(\w+)\s*(?:=\s*)?\{([\s\S]+?)\}/);
    if (!interfaceMatch) return null;

    const body = interfaceMatch[2];

    const result: Schema = {
      type: 'object',
      fields: {},
    };
    (result as any)._isTypeMorphSchema = true;

    // Match patterns like: name?: string;
    const fieldRegex = /(['"]?\w+['"]?)\s*(\??)\s*:\s*([^;,\n]+)/g;
    let m;
    while ((m = fieldRegex.exec(body)) !== null) {
      let key = m[1].replace(/['"]/g, ''); // Remove quotes if any
      const isOptional = m[2] === '?';
      let typeStr = m[3].trim();
      
      // Remove inline comments
      typeStr = typeStr.split('//')[0].trim();

      let fieldSchema: Schema = { type: 'any' };

      if (typeStr === 'string') {
        fieldSchema.type = 'string';
      } else if (typeStr === 'number') {
        fieldSchema.type = 'number';
      } else if (typeStr === 'boolean') {
        fieldSchema.type = 'boolean';
      } else if (typeStr === 'Date') {
        fieldSchema.type = 'string';
        fieldSchema.format = 'datetime';
      } else if (typeStr.endsWith('[]')) {
        fieldSchema.type = 'array';
        const inner = typeStr.slice(0, -2).trim();
        fieldSchema.itemType = mapSimpleTsTypeToSchema(inner);
      } else if (typeStr.startsWith('Array<') && typeStr.endsWith('>')) {
        fieldSchema.type = 'array';
        const inner = typeStr.substring(6, typeStr.length - 1).trim();
        fieldSchema.itemType = mapSimpleTsTypeToSchema(inner);
      } else if (typeStr.includes('|')) {
        const parts = typeStr.split('|').map(p => p.trim());
        const isLiteralUnion = parts.every(p => /^['"].*['"]$/.test(p));
        if (isLiteralUnion) {
          fieldSchema.type = 'string';
          fieldSchema.enumValues = parts.map(p => p.slice(1, -1));
        } else {
          fieldSchema.type = 'union';
        }
      }

      if (isOptional) {
        fieldSchema.optional = true;
      }

      if (result.fields) {
        result.fields[key] = fieldSchema;
      }
    }

    if (Object.keys(result.fields || {}).length === 0) return null;

    return result;
  } catch {
    return null;
  }
};
