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
  const method = curl.match(/-X\s+(\w+)/)?.[1] || 'GET';
  const url = curl.match(/'(https?:\/\/[^']+)'/)?.[1] || curl.match(/"(https?:\/\/[^"]+)"/)?.[1] || "";
  const headers: any = {};
  const headerMatches = curl.matchAll(/-H\s+'([^']+)'/g);
  for (const m of headerMatches) {
    const [k, v] = m[1].split(':').map(s => s.trim());
    headers[k] = v;
  }
  const bodyMatch = curl.match(/-d\s+'([^']+)'/);
  let bodyJson = null;
  if (bodyMatch) {
    try { bodyJson = JSON.parse(bodyMatch[1]); } catch(e) {}
  }
  return { method, url, headers, body: bodyMatch?.[1] || "", bodyJson };
};

export const parseSQLToZod = (sql: string) => {
  const tableName = sql.match(/CREATE TABLE (\w+)/)?.[1] || 'Schema';
  const columns = sql.matchAll(/(\w+)\s+(\w+)/g);
  let out = `export const ${tableName}Schema = z.object({\n`;
  for (const col of columns) {
    if (['CREATE', 'TABLE', 'PRIMARY', 'KEY', 'NOT', 'NULL'].includes(col[1].toUpperCase())) continue;
    const type = col[2].toUpperCase();
    let zodType = 'z.string()';
    if (['INT', 'INTEGER', 'FLOAT', 'DECIMAL'].includes(type)) zodType = 'z.number()';
    if (['BOOLEAN', 'BOOL'].includes(type)) zodType = 'z.boolean()';
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
