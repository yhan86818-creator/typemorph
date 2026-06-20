/**
 * TypeMorph Parser Utilities
 * Handles extraction of data from various formats (YAML, XML, CURL, SQL)
 */

import yaml from 'js-yaml';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { Schema } from './types';
import { extractTypeGraph, splitMembers, type TypeNode } from './graph';

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
    if (type === 'UUID') zodType = 'z.uuid()';

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

// ---------------------------------------------------------------------------
// .env File Parser
// ---------------------------------------------------------------------------

export const parseEnvFile = (str: string): Schema | null => {
  const fields: Record<string, Schema> = {};
  let count = 0;

  for (const line of str.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const eqIdx = trimmed.indexOf('=');
    if (eqIdx < 1) continue;

    const key = trimmed.slice(0, eqIdx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    let rawValue = trimmed.slice(eqIdx + 1).trim();
    // strip surrounding quotes
    rawValue = rawValue.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');

    let schema: Schema;
    if (rawValue === 'true' || rawValue === 'false') {
      schema = { type: 'boolean' };
    } else if (/^\d+$/.test(rawValue) && rawValue.length > 0) {
      schema = { type: 'number', format: 'int' };
    } else if (/^\d+\.\d+$/.test(rawValue)) {
      schema = { type: 'number', format: 'float' };
    } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rawValue)) {
      // matches https://, postgresql://, redis://, mysql://, etc.
      schema = { type: 'string', format: 'url' };
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) {
      schema = { type: 'string', format: 'email' };
    } else if (rawValue === '') {
      schema = { type: 'string', optional: true };
    } else {
      schema = { type: 'string' };
    }

    fields[key] = schema;
    count++;
  }

  if (count === 0) return null;

  const result: Schema = { type: 'object', fields };
  (result as any)._isTypeMorphSchema = true;
  return result;
};

// Depth-aware splitter for TS type expressions (respects <>, (), [], {}).
function splitTopLevelTs(str: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === '<' || ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === '>' || ch === ')' || ch === ']' || ch === '}') depth--;
    else if (depth === 0 && str.slice(i, i + sep.length) === sep) {
      parts.push(cur.trim());
      cur = '';
      i += sep.length;
      continue;
    }
    cur += ch;
    i++;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

// Shared context for the recursive TS→Schema resolution.
interface TsParseCtx {
  interfaces: Map<string, TypeNode>;
  objectAliases: Map<string, string>;   // name → body between the braces
  simpleAliases: Map<string, string>;   // name → right-hand-side type expression
  enums: Map<string, string[] | null>;  // name → string values, or null for numeric/native
  resolving: Set<string>;               // cycle guard for named types
}

function tsObjectBodyToSchema(body: string, ctx: TsParseCtx, depth: number): Schema {
  const fields: Record<string, Schema> = {};
  let indexSig: string | undefined;
  for (const member of splitMembers(body)) {
    const idx = member.match(/^\[\s*\w+\s*:\s*(?:string|number|symbol)\s*\]\s*:\s*([\s\S]+)$/);
    if (idx) { indexSig = idx[1].trim(); continue; }
    const fm = member.match(/^(?:readonly\s+)?(['"]?[\w$]+['"]?)(\?)?\s*:\s*([\s\S]+)$/);
    if (!fm) continue;
    const name = fm[1].replace(/['"]/g, '');
    const sub = tsTypeExprToSchema(fm[3].trim(), ctx, depth);
    if (fm[2] === '?') sub.optional = true;
    fields[name] = sub;
  }
  // Pure index signature → record. A mix of named fields + index signature keeps the
  // named fields and drops the catchall (a single Schema can't carry both).
  if (Object.keys(fields).length === 0 && indexSig) {
    return { type: 'object', fields: {}, recordValueType: tsTypeExprToSchema(indexSig, ctx, depth) };
  }
  return { type: 'object', fields };
}

function tsInterfaceToSchema(node: TypeNode, ctx: TsParseCtx, depth: number): Schema {
  const fields: Record<string, Schema> = {};
  // Inherited fields first so the interface's own fields win on name collision.
  for (const parent of node.extendsList ?? []) {
    const ps = resolveNamedTsType(parent, ctx, depth + 1);
    if (ps.type === 'object' && ps.fields) Object.assign(fields, ps.fields);
  }
  for (const f of node.fields) {
    const sub = tsTypeExprToSchema(f.type, ctx, depth + 1);
    if (f.optional) sub.optional = true;
    fields[f.name] = sub;
  }
  const obj: Schema = { type: 'object', fields };
  if (node.indexSignature && node.fields.length === 0 && !node.extendsList?.length) {
    obj.recordValueType = tsTypeExprToSchema(node.indexSignature, ctx, depth + 1);
  }
  return obj;
}

// Resolves a named reference (interface / type alias / enum) to a Schema. Object
// results carry `_sharedTypeName` so the generators dedupe and emit one class.
function resolveNamedTsType(name: string, ctx: TsParseCtx, depth: number): Schema {
  if (ctx.enums.has(name)) {
    const vals = ctx.enums.get(name);
    return vals && vals.length ? { type: 'string', enumValues: vals } : { type: 'string' };
  }
  if (ctx.simpleAliases.has(name)) {
    return tsTypeExprToSchema(ctx.simpleAliases.get(name)!, ctx, depth + 1);
  }
  if (ctx.objectAliases.has(name)) {
    if (ctx.resolving.has(name)) return { type: 'object', fields: {}, _sharedTypeName: name };
    ctx.resolving.add(name);
    const s = tsObjectBodyToSchema(ctx.objectAliases.get(name)!, ctx, depth + 1);
    ctx.resolving.delete(name);
    s._sharedTypeName = name;
    return s;
  }
  if (ctx.interfaces.has(name)) {
    if (ctx.resolving.has(name)) return { type: 'object', fields: {}, _sharedTypeName: name };
    ctx.resolving.add(name);
    const s = tsInterfaceToSchema(ctx.interfaces.get(name)!, ctx, depth + 1);
    ctx.resolving.delete(name);
    s._sharedTypeName = name;
    return s;
  }
  return { type: 'any' };
}

// Converts a TS type-expression string into a Schema. Mirrors ts-to-zod's typeToZod
// so the main-editor path (TS → any target) matches the dedicated TS→Zod tab in
// quality: extends, Record, enums, index signatures, tuples, nested objects (NEW-A).
function tsTypeExprToSchema(typeStr: string, ctx: TsParseCtx, depth: number): Schema {
  if (depth > 12) return { type: 'any' };
  const t = typeStr.trim().replace(/;$/, '');

  // Union (top-level |)
  const unionParts = splitTopLevelTs(t, '|');
  if (unionParts.length > 1) {
    const hasNull = unionParts.some(m => m === 'null');
    const hasUndef = unionParts.some(m => m === 'undefined');
    const real = unionParts.filter(m => m !== 'null' && m !== 'undefined');
    let s: Schema;
    if (real.length && real.every(m => /^['"`].*['"`]$/.test(m))) {
      s = { type: 'string', enumValues: real.map(m => m.replace(/^['"`]|['"`]$/g, '')) };
    } else if (real.length === 1) {
      s = { ...tsTypeExprToSchema(real[0], ctx, depth) };
    } else if (real.length > 1) {
      const subs = real.map(m => tsTypeExprToSchema(m, ctx, depth + 1));
      s = subs.every(x => x.type === 'string' || x.type === 'number' || x.type === 'boolean')
        ? { type: 'union', unionTypes: subs.map(x => x.type) }
        : { type: 'union' };
    } else {
      s = { type: 'any' };
    }
    if (hasNull) s.nullable = true;
    if (hasUndef) s.optional = true;
    return s;
  }

  // Intersection (&) — merge object members best-effort
  const interParts = splitTopLevelTs(t, '&');
  if (interParts.length > 1) {
    const merged: Record<string, Schema> = {};
    for (const p of interParts) {
      const ps = tsTypeExprToSchema(p, ctx, depth + 1);
      if (ps.type === 'object' && ps.fields) Object.assign(merged, ps.fields);
    }
    return Object.keys(merged).length ? { type: 'object', fields: merged } : { type: 'any' };
  }

  // Primitives & literals
  switch (t) {
    case 'string': return { type: 'string' };
    case 'number': case 'bigint': return { type: 'number' };
    case 'boolean': case 'true': case 'false': return { type: 'boolean' };
    case 'Date': return { type: 'string', format: 'datetime' };
    case 'null': return { type: 'any', nullable: true };
    case 'any': case 'unknown': case 'never': case 'void': case 'undefined': case 'symbol':
      return { type: 'any' };
  }
  if (/^['"`].*['"`]$/.test(t)) return { type: 'string', enumValues: [t.replace(/^['"`]|['"`]$/g, '')] };
  if (/^-?\d+(\.\d+)?$/.test(t)) return { type: 'number', format: Number.isInteger(Number(t)) ? 'int' : 'float' };

  // Array: T[] / Array<T>
  const arr1 = t.match(/^(.+)\[\]$/);
  if (arr1) return { type: 'array', itemType: tsTypeExprToSchema(arr1[1].trim(), ctx, depth + 1) };
  const arr2 = t.match(/^Array<([\s\S]+)>$/);
  if (arr2) return { type: 'array', itemType: tsTypeExprToSchema(arr2[1].trim(), ctx, depth + 1) };

  // Record<K, V>
  const rec = t.match(/^Record<([\s\S]+)>$/);
  if (rec) {
    const args = splitTopLevelTs(rec[1], ',');
    const valueExpr = args.slice(1).join(',').trim() || 'any';
    return { type: 'object', fields: {}, recordValueType: tsTypeExprToSchema(valueExpr, ctx, depth + 1) };
  }

  // Pass-through type wrappers
  const wrap = t.match(/^(?:Promise|Partial|Required|Readonly|NonNullable)<([\s\S]+)>$/);
  if (wrap) return tsTypeExprToSchema(wrap[1].trim(), ctx, depth + 1);

  // Tuple: [A, B, ...]
  if (t.startsWith('[') && t.endsWith(']')) {
    const parts = splitTopLevelTs(t.slice(1, -1), ',').map(m => tsTypeExprToSchema(m.trim(), ctx, depth + 1));
    if (parts.length > 0) return { type: 'array', itemType: { type: 'any' }, tupleTypes: parts };
    return { type: 'array', itemType: { type: 'any' } };
  }

  // Inline object literal
  if (t.startsWith('{') && t.endsWith('}')) {
    return tsObjectBodyToSchema(t.slice(1, -1), ctx, depth + 1);
  }

  // Named reference (interface / alias / enum)
  return resolveNamedTsType(t, ctx, depth);
}

// Builds the parse context (interfaces / object aliases / simple aliases / enums).
function buildTsParseCtx(tsCode: string): TsParseCtx {
  const interfaces = new Map<string, TypeNode>();
  for (const node of extractTypeGraph(tsCode).nodes) interfaces.set(node.id, node);

  const objectAliases = new Map<string, string>();
  const objRe = /(?:export\s+)?type\s+(\w+)\s*=\s*\{/g;
  let m: RegExpExecArray | null;
  while ((m = objRe.exec(tsCode)) !== null) {
    let depth = 1;
    let pos = m.index + m[0].length;
    while (pos < tsCode.length && depth > 0) {
      if (tsCode[pos] === '{') depth++;
      else if (tsCode[pos] === '}') depth--;
      pos++;
    }
    if (!objectAliases.has(m[1])) objectAliases.set(m[1], tsCode.slice(m.index + m[0].length, pos - 1));
  }

  const simpleAliases = new Map<string, string>();
  const simpleRe = /(?:export\s+)?type\s+(\w+)\s*=\s*([^{<\n][^;\n]*?)\s*;/g;
  while ((m = simpleRe.exec(tsCode)) !== null) {
    if (!simpleAliases.has(m[1]) && !objectAliases.has(m[1])) simpleAliases.set(m[1], m[2].trim());
  }

  const enums = new Map<string, string[] | null>();
  const enumRe = /(?:export\s+)?(?:const\s+)?enum\s+(\w+)\s*\{([^}]*)\}/g;
  while ((m = enumRe.exec(tsCode)) !== null) {
    const members = m[2].split(',').map(s => s.trim()).filter(Boolean);
    const values = members.map(mem => {
      const eq = mem.match(/^(\w+)\s*=\s*(.+)$/);
      return eq ? eq[2].trim() : undefined;
    });
    const allStr = values.length > 0 && values.every(v => v && /^['"`].*['"`]$/.test(v));
    enums.set(m[1], allStr ? values.map(v => v!.replace(/^['"`]|['"`]$/g, '')) : null);
  }

  return { interfaces, objectAliases, simpleAliases, enums, resolving: new Set() };
}

export const parseTypeScriptToSchema = (str: string): Schema | null => {
  try {
    const ctx = buildTsParseCtx(str);
    const named: { name: string; kind: 'interface' | 'object' }[] = [
      ...[...ctx.interfaces.keys()].map(n => ({ name: n, kind: 'interface' as const })),
      ...[...ctx.objectAliases.keys()].map(n => ({ name: n, kind: 'object' as const })),
    ];
    if (named.length === 0) return null;

    // The root is a named type that no other declaration references.
    const referenced = new Set<string>();
    const scanRefs = (body: string) => {
      for (const tok of body.split(/[^A-Za-z0-9_$]+/)) {
        if (tok && /^[A-Z]/.test(tok)) referenced.add(tok);
      }
    };
    for (const node of ctx.interfaces.values()) {
      for (const f of node.fields) scanRefs(f.type);
      for (const p of node.extendsList ?? []) referenced.add(p);
    }
    for (const body of ctx.objectAliases.values()) scanRefs(body);

    const root = named.find(n => !referenced.has(n.name)) ?? named[0];
    const schema = root.kind === 'interface'
      ? tsInterfaceToSchema(ctx.interfaces.get(root.name)!, ctx, 0)
      : tsObjectBodyToSchema(ctx.objectAliases.get(root.name)!, ctx, 0);

    if (schema.type !== 'object' || !schema.fields ||
        (Object.keys(schema.fields).length === 0 && !schema.recordValueType)) {
      return null;
    }
    delete schema._sharedTypeName; // the root is the top-level type, not a shared ref
    (schema as any)._isTypeMorphSchema = true;
    return schema;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Zod Schema → TypeMorph Schema (Reverse Mode)
// Converts Zod schema text into our internal Schema so mockGen can produce JSON.
// ---------------------------------------------------------------------------

function findMatchingClose(str: string, start: number, open: string, close: string): number {
  let depth = 0;
  for (let i = start; i < str.length; i++) {
    if (str[i] === open) depth++;
    else if (str[i] === close) { depth--; if (depth === 0) return i; }
  }
  return -1;
}

function splitTopLevelCommas(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  let inStr = false;
  let strChar = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (inStr) {
      cur += c;
      if (c === strChar && str[i - 1] !== '\\') inStr = false;
    } else if (c === '"' || c === "'") {
      inStr = true; strChar = c; cur += c;
    } else if (c === '(' || c === '{' || c === '[') {
      depth++; cur += c;
    } else if (c === ')' || c === '}' || c === ']') {
      depth--; cur += c;
    } else if (c === ',' && depth === 0) {
      if (cur.trim()) parts.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

// Constraint/refinement methods preserved verbatim for round-trip (R4). Excludes
// format-defining calls (.email/.url/.uuid/.datetime/.date/.ip/.int) — those are
// already captured as `format` — and structural ones (.optional/.nullable/.nullish).
const REFINEMENT_METHODS = new Set([
  'min', 'max', 'length', 'gt', 'gte', 'lt', 'lte', 'positive', 'negative',
  'nonnegative', 'nonpositive', 'multipleOf', 'step', 'finite', 'regex',
  'includes', 'startsWith', 'endsWith', 'trim', 'toLowerCase', 'toUpperCase',
  'default', 'catch', 'describe', 'brand', 'readonly',
]);

// Walks a method chain and returns the whitelisted refinement calls verbatim
// (e.g. ".min(0)", '.regex(/^a$/)', '.describe("hi")'). String- and regex-literal
// aware so parens/commas inside "..." or /.../ never desync the paren matching.
function extractRefinements(str: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < str.length) {
    const dot = str.indexOf('.', i);
    if (dot === -1) break;
    const mm = /^\.([a-zA-Z]+)\s*\(/.exec(str.slice(dot));
    if (!mm) { i = dot + 1; continue; }
    const name = mm[1];
    let j = dot + mm[0].length; // index just after '('
    let depth = 1;
    let prev = '('; // previous significant char — distinguishes regex literal from divide
    while (j < str.length && depth > 0) {
      const c = str[j];
      if (c === '"' || c === "'" || c === '`') {
        const q = c; j++;
        while (j < str.length && !(str[j] === q && str[j - 1] !== '\\')) j++;
        j++; prev = 'x'; continue;
      }
      if (c === '/' && (prev === '(' || prev === ',')) {
        j++;
        while (j < str.length && !(str[j] === '/' && str[j - 1] !== '\\')) {
          if (str[j] === '[') { j++; while (j < str.length && !(str[j] === ']' && str[j - 1] !== '\\')) j++; }
          j++;
        }
        j++; // past closing '/'
        while (j < str.length && /[a-z]/i.test(str[j])) j++; // flags
        prev = 'x'; continue;
      }
      if (c === '(') { depth++; prev = '('; j++; continue; }
      if (c === ')') { depth--; j++; if (depth === 0) break; prev = ')'; continue; }
      if (c === ',') { prev = ','; j++; continue; }
      if (!/\s/.test(c)) prev = 'x';
      j++;
    }
    if (REFINEMENT_METHODS.has(name)) out.push(str.slice(dot, j));
    i = j;
  }
  return out;
}

// Registry of TS enum / `as const` object values found in the same input, so
// z.nativeEnum(X) / z.enum(X) can resolve X's values. Set per parseZodToSchema call.
let nativeEnumRegistry: Map<string, string[]> = new Map();

// Scans TS source for string-valued enum definitions resolvable by z.nativeEnum(X):
//   enum X { A = "a", B = "b" }   and   const X = { A: "a", B: "b" } as const
function scanEnumDefinitions(input: string): Map<string, string[]> {
  const reg = new Map<string, string[]>();
  let m: RegExpExecArray | null;

  const enumRe = /enum\s+(\w+)\s*\{([^}]*)\}/g;
  while ((m = enumRe.exec(input))) {
    const vals: string[] = [];
    for (const member of m[2].split(',')) {
      const mm = member.match(/\w+\s*=\s*(['"`])(.*?)\1/);
      if (mm) vals.push(mm[2]);
    }
    if (vals.length) reg.set(m[1], vals);
  }

  const constRe = /const\s+(\w+)\s*=\s*\{([^}]*)\}\s*as\s+const/g;
  while ((m = constRe.exec(input))) {
    const vals: string[] = [];
    for (const member of m[2].split(',')) {
      const mm = member.match(/\w+\s*:\s*(['"`])(.*?)\1/);
      if (mm) vals.push(mm[2]);
    }
    if (vals.length) reg.set(m[1], vals);
  }

  return reg;
}

function parseZodTypeStr(typeStr: string): Schema {
  const s = typeStr.trim();
  const isOptional = /\.optional\(\)|\.nullish\(\)/.test(s);
  const isNullable = /\.nullable\(\)|\.nullish\(\)/.test(s);

  // z.object({...})
  if (/^z\.object\s*\(/.test(s)) {
    const braceOpen = s.indexOf('{');
    if (braceOpen === -1) return { type: 'any' };
    const braceClose = findMatchingClose(s, braceOpen, '{', '}');
    const body = braceClose > -1 ? s.slice(braceOpen + 1, braceClose) : '';
    const fields: Record<string, Schema> = {};
    parseZodFields(body, fields);
    return { type: 'object', fields, optional: isOptional || undefined, nullable: isNullable || undefined };
  }

  // z.array(...)
  if (/^z\.array\s*\(/.test(s)) {
    const parenOpen = s.indexOf('(');
    const parenClose = findMatchingClose(s, parenOpen, '(', ')');
    const inner = parenClose > -1 ? s.slice(parenOpen + 1, parenClose).trim() : 'z.string()';
    const itemType = parseZodTypeStr(inner);
    // Outer array-level constraints (e.g. z.array(...).min(1)) — extract only the chain
    // AFTER the array's closing paren so inner element refinements aren't double-counted.
    const refinements = parenClose > -1 ? extractRefinements(s.slice(parenClose + 1)) : [];
    return { type: 'array', itemType, optional: isOptional || undefined, ...(refinements.length ? { refinements } : {}) };
  }

  // z.nativeEnum(X) / z.enum(X) referencing a TS enum or `as const` object (not an array).
  // z.enum([...]) starts with '[', so the [A-Za-z_$] lookahead disambiguates.
  if (/^z\.(?:nativeEnum|enum)\s*\(\s*[A-Za-z_$]/.test(s)) {
    const nm = s.match(/^z\.(?:nativeEnum|enum)\s*\(\s*([A-Za-z_$][\w$]*)/);
    const enumName = nm?.[1];
    const resolved = enumName ? nativeEnumRegistry.get(enumName) : undefined;
    if (resolved && resolved.length) {
      return { type: 'string', enumValues: resolved, optional: isOptional || undefined };
    }
    // Unresolvable (enum defined in another file) — keep the exact expression so the
    // Zod round-trip is lossless; other languages degrade to the string base type.
    return {
      type: 'string',
      rawZodType: enumName ? `z.nativeEnum(${enumName})` : s,
      optional: isOptional || undefined,
    };
  }

  // z.enum([...]) or z.nativeEnum
  if (/^z\.enum\s*\(/.test(s)) {
    const bracketOpen = s.indexOf('[');
    const bracketClose = bracketOpen > -1 ? findMatchingClose(s, bracketOpen, '[', ']') : -1;
    const vals = bracketClose > -1
      ? splitTopLevelCommas(s.slice(bracketOpen + 1, bracketClose))
          .map(v => v.trim().replace(/^['"`]|['"`]$/g, ''))
          .filter(Boolean)
      : [];
    return { type: 'string', enumValues: vals.length ? vals : undefined, optional: isOptional || undefined };
  }

  // z.union([...]) or z.discriminatedUnion('key', [...])
  if (/^z\.(?:union|discriminatedUnion)\s*\(/.test(s)) {
    const isDiscriminated = /^z\.discriminatedUnion/.test(s);
    let discriminatorField: string | undefined;
    if (isDiscriminated) {
      const dm = s.match(/^z\.discriminatedUnion\s*\(\s*(['"`])(.+?)\1/);
      if (dm) discriminatorField = dm[2];
    }
    const arrStart = s.indexOf('[');
    if (arrStart > -1) {
      const arrEnd = findMatchingClose(s, arrStart, '[', ']');
      if (arrEnd > -1) {
        const rawMembers = splitTopLevelCommas(s.slice(arrStart + 1, arrEnd))
          .map(m => m.trim())
          .filter(Boolean);

        // z.null()/z.undefined() members express nullability, not a type variant
        let memberNullable = false;
        let memberOptional = false;
        const parsed: Schema[] = [];
        for (const m of rawMembers) {
          if (/^z\.null\s*\(\s*\)/.test(m)) { memberNullable = true; continue; }
          if (/^z\.undefined\s*\(\s*\)/.test(m)) { memberOptional = true; continue; }
          parsed.push(parseZodTypeStr(m));
        }

        const finalize = (sc: Schema): Schema => {
          if (isOptional || memberOptional) sc.optional = true;
          if (memberNullable) sc.nullable = true;
          return sc;
        };

        if (parsed.length === 0) return finalize({ type: 'any' });
        if (parsed.length === 1) return finalize({ ...parsed[0] });

        // All members are string literals / enums → merge into one enum (dedup)
        if (parsed.every(p => p.enumValues && p.enumValues.length > 0)) {
          const merged: string[] = [];
          for (const p of parsed) for (const v of p.enumValues!) if (!merged.includes(v)) merged.push(v);
          return finalize({ type: 'string', enumValues: merged });
        }

        // All members are objects → merge fields; fields absent in any variant become optional
        if (parsed.every(p => p.type === 'object' && p.fields)) {
          const mergedFields: Record<string, Schema> = {};
          for (const p of parsed) {
            for (const [k, v] of Object.entries(p.fields!)) {
              if (!(k in mergedFields)) mergedFields[k] = { ...v };
            }
          }
          for (const k of Object.keys(mergedFields)) {
            if (!parsed.every(p => p.fields && k in p.fields)) mergedFields[k].optional = true;
          }
          const objSchema: Schema = { type: 'object', fields: mergedFields };
          if (discriminatorField) objSchema.discriminatorField = discriminatorField;
          return finalize(objSchema);
        }

        // Heterogeneous primitives → type-level union (preserve every member's type)
        const typeNames: string[] = [];
        for (const p of parsed) if (!typeNames.includes(p.type)) typeNames.push(p.type);
        if (typeNames.length === 1) return finalize({ ...parsed[0] });
        return finalize({ type: 'union', unionTypes: typeNames });
      }
    }
    return { type: 'any', optional: isOptional || undefined };
  }

  // z.tuple([...]) — preserve each positional element type (R2)
  if (/^z\.tuple\s*\(/.test(s)) {
    const arrStart = s.indexOf('[');
    if (arrStart > -1) {
      const arrEnd = findMatchingClose(s, arrStart, '[', ']');
      if (arrEnd > -1) {
        const elems = splitTopLevelCommas(s.slice(arrStart + 1, arrEnd)).map(m => m.trim()).filter(Boolean);
        if (elems.length > 0) {
          const tupleTypes = elems.map(e => parseZodTypeStr(e));
          return { type: 'array', itemType: { type: 'any' }, tupleTypes, optional: isOptional || undefined };
        }
      }
    }
    return { type: 'array', itemType: { type: 'any' }, optional: isOptional || undefined };
  }

  // z.record(...) — preserve the value type (R3). v4: z.record(keyType, valueType); v3: z.record(valueType)
  if (/^z\.record\s*\(/.test(s)) {
    const parenOpen = s.indexOf('(');
    const parenClose = parenOpen > -1 ? findMatchingClose(s, parenOpen, '(', ')') : -1;
    if (parenClose > -1) {
      const args = splitTopLevelCommas(s.slice(parenOpen + 1, parenClose)).map(a => a.trim()).filter(Boolean);
      const valueArg = args.length >= 2 ? args[1] : args[0];
      if (valueArg) {
        return { type: 'object', fields: {}, recordValueType: parseZodTypeStr(valueArg), optional: isOptional || undefined };
      }
    }
    return { type: 'object', fields: {}, optional: isOptional || undefined };
  }

  // Primitives
  const schema: Schema = { type: 'any' };

  const coerceBase = s.match(/z\.coerce\.(string|number|boolean|bigint)\b/);
  if (coerceBase) {
    schema.coerced = true;
    schema.type = coerceBase[1] === 'string' ? 'string'
      : coerceBase[1] === 'boolean' ? 'boolean'
      : 'number';
    if (schema.type === 'number' && /\.int\(\)/.test(s)) schema.format = 'int';
  } else if (/z\.string\b|z\.email\b|z\.url\b|z\.uuid\b|z\.cuid\b|z\.ulid\b|z\.ip\b|z\.iso\b/.test(s)) {
    schema.type = 'string';
    if (/\.email\(\)|z\.email\(\)/.test(s)) schema.format = 'email';
    else if (/\.uuid\(\)|z\.uuid\(\)/.test(s)) schema.format = 'uuid';
    else if (/\.url\(\)|z\.url\(\)/.test(s)) schema.format = 'url';
    else if (/z\.iso\.datetime\(\)|\.datetime\(\)/.test(s)) schema.format = 'datetime';
    else if (/z\.iso\.date\(\)/.test(s)) schema.format = 'date';
    else if (/z\.iso\.time\(\)/.test(s)) schema.format = 'datetime';
    else if (/z\.ip\(\)|\.ip\(\)/.test(s)) schema.format = 'ip';
    else if (/z\.cuid\(\)|z\.ulid\(\)/.test(s)) schema.format = 'uuid';
  } else if (/z\.number\b|z\.int\b|z\.float\b/.test(s)) {
    schema.type = 'number';
    if (/\.int\(\)/.test(s)) schema.format = 'int';
  } else if (/z\.boolean\b|z\.bool\b/.test(s)) {
    schema.type = 'boolean';
  } else if (/z\.coerce\.date\b|z\.date\b/.test(s)) {
    schema.type = 'string'; schema.format = 'date';
  } else if (/z\.null\(\)/.test(s)) {
    schema.type = 'any'; schema.nullable = true;
  } else if (/z\.any\(\)|z\.unknown\(\)/.test(s)) {
    schema.type = 'any';
  } else if (/z\.literal\(/.test(s)) {
    const strLit = s.match(/z\.literal\s*\(\s*(['"`])([\s\S]*?)\1\s*\)/);
    const numLit = s.match(/z\.literal\s*\(\s*(-?\d+(?:\.\d+)?)\s*\)/);
    const boolLit = s.match(/z\.literal\s*\(\s*(true|false)\s*\)/);
    if (strLit) {
      schema.type = 'string';
      schema.literalValue = strLit[2];
      // Keep enumValues for non-Zod generators (TS emits "user" via the single-value enum path).
      schema.enumValues = [strLit[2]];
    } else if (numLit) {
      schema.type = 'number';
      schema.literalValue = parseFloat(numLit[1]);
    } else if (boolLit) {
      schema.type = 'boolean';
      schema.literalValue = boolLit[1] === 'true';
    } else {
      schema.type = 'string';
    }
  }

  if (isOptional) schema.optional = true;
  if (isNullable) schema.nullable = true;
  // Preserve value-level constraints verbatim (R4). Primitives have no nesting, so
  // extracting from the whole chain is unambiguous.
  const refinements = extractRefinements(s);
  if (refinements.length) schema.refinements = refinements;
  return schema;
}

function parseZodFields(body: string, fields: Record<string, Schema>): void {
  const entries = splitTopLevelCommas(body);
  for (const entry of entries) {
    const colonIdx = entry.indexOf(':');
    if (colonIdx === -1) continue;
    const key = entry.slice(0, colonIdx).trim().replace(/^['"`]|['"`]$/g, '');
    const typeStr = entry.slice(colonIdx + 1).trim();
    if (!key || !typeStr) continue;
    fields[key] = parseZodTypeStr(typeStr);
  }
}

export const parseZodToSchema = (input: string): Schema | null => {
  try {
    nativeEnumRegistry = scanEnumDefinitions(input);
    const trimmed = input.trim();
    // Allow: z.object({...}), const x = z.object({...}), export const x = z.object({...})
    if (!trimmed.includes('z.object(') && !trimmed.includes('z.array(') && !trimmed.includes('z.string(')
        && !trimmed.includes('z.number(') && !trimmed.includes('z.boolean(')) {
      return null;
    }

    // Find the main schema expression: const x = <expr> or just <expr>
    let expr = trimmed;
    const assignMatch = trimmed.match(/(?:const|let|var|export\s+(?:const|let|var)|export\s+default)\s+\w+\s*(?::\s*\w+\s*)?=\s*(z\.[\s\S]+)/);
    if (assignMatch) expr = assignMatch[1].trim();
    // Strip trailing semicolons
    expr = expr.replace(/;\s*$/, '').trim();

    const schema = parseZodTypeStr(expr);
    if (schema.type === 'any' && !schema.optional) return null;
    (schema as any)._isTypeMorphSchema = true;
    return schema;
  } catch {
    return null;
  } finally {
    nativeEnumRegistry = new Map();
  }
};
