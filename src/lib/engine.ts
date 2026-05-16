import { 
  tsGen, zodGen, goGen, rustGen, javaGen, prismaGen, uiGen,
  dartGen, phpGen, pythonGen, protoGen, gqlGen, mockGen
} from './generators';
import { Schema } from './types';

export { type Schema };

const mergeSchemas = (s1: Schema, s2: Schema): Schema => {
  if (!s1) return s2;
  if (!s2) return s1;
  if (s1.type === 'any') return s2;
  if (s2.type === 'any') return s1;
  if (s1.type !== s2.type) return { type: 'any' };
  
  if (s1.type === 'string' && s2.type === 'string') {
    if (s1.format === s2.format) return s1;
    return { type: 'string' }; // Degrade to plain string if formats differ
  }

  if (s1.type === 'object' && s2.type === 'object') {
    const fields: Record<string, Schema> = { ...(s1.fields || {}) };
    const s2Fields = s2.fields || {};
    for (const k in s2Fields) {
      fields[k] = fields[k] ? mergeSchemas(fields[k], s2Fields[k]) : s2Fields[k];
    }
    return { type: 'object', fields };
  }
  if (s1.type === 'array' && s2.type === 'array') {
    return { type: 'array', itemType: mergeSchemas(s1.itemType as Schema, s2.itemType as Schema) };
  }
  return s1;
};

export const inferSchema = (val: any): Schema => {
  if (val === null || val === undefined) return { type: 'any' };
  if (Array.isArray(val)) {
    if (val.length === 0) return { type: 'array', itemType: { type: 'any' } };
    let itemType = inferSchema(val[0]);
    for (let i = 1; i < val.length; i++) {
      itemType = mergeSchemas(itemType, inferSchema(val[i]));
    }
    return { type: 'array', itemType };
  }
  if (typeof val === 'object') {
    const fields: Record<string, Schema> = {};
    for (const key in val) {
      fields[key] = inferSchema(val[key]);
    }
    return { type: 'object', fields };
  }
  
  if (typeof val === 'string') {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return { type: 'string', format: 'uuid' };
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return { type: 'string', format: 'email' };
    if (/^https?:\/\/[^\s]+$/.test(val)) return { type: 'string', format: 'url' };
    if (!isNaN(Date.parse(val)) && (val.includes('T') || val.includes('-') || val.includes('/')) && val.length > 7 && /\d/.test(val)) return { type: 'string', format: 'datetime' };
    return { type: 'string' };
  }

  return { type: typeof val };
};

export const runEngine = (json: any, lang: string, slug: string = "", options: any = {}): any => {
  try {
    const schema = inferSchema(json);
    switch (lang) {
      case 'typescript': 
        return `/**\n * TypeFlow Generated TypeScript Interface\n */\n` + tsGen.generate(schema, 'Root', options);
      case 'zod': 
        return `import { z } from "zod";\n\n` + zodGen.generate(schema, 'root', options);
      case 'go': return goGen.generate(schema);
      case 'rust': return rustGen.generate(schema);
      case 'java': return javaGen.generate(schema);
      case 'sql': return prismaGen.generate(schema);
      case 'ui': return uiGen.generate(schema);
      case 'mock': return mockGen.generate(schema);
      case 'dart': return dartGen.generate(schema);
      case 'php': return `<?php\n\n` + phpGen.generate(schema);
      case 'python': return `from pydantic import BaseModel\n\n` + pythonGen.generate(schema);
      case 'protobuf': return `syntax = "proto3";\n\n` + protoGen.generate(schema);
      case 'graphql': return gqlGen.generate(schema);
      case 'csharp':
        return `public class Root\n{\n` + 
          Object.keys(json).map(k => `    public ${typeof json[k] === 'number' ? 'double' : 'string'} ${k} { get; set; }`).join('\n') + `\n}`;
      case 'swift':
        return `struct Root: Codable {\n` + 
          Object.keys(json).map(k => `    let ${k}: ${typeof json[k] === 'number' ? 'Double' : 'String'}`).join('\n') + `\n}`;
      case 'kotlin':
        return `data class Root(\n` + 
          Object.keys(json).map(k => `    val ${k}: ${typeof json[k] === 'number' ? 'Double' : 'String'}`).join(',\n') + `\n)`;
      case 'jsonschema':
        return JSON.stringify({ 
          $schema: "http://json-schema.org/draft-07/schema#", 
          type: "object", 
          properties: Object.keys(json).reduce((acc, k) => ({ ...acc, [k]: { type: typeof json[k] } }), {})
        }, null, 2);
      default: return JSON.stringify(json, null, 2);
    }
  } catch (e) { return "// Error: " + String(e); }
};

export const parseYAML = (str: string) => {
  const obj: any = {};
  str.split('\n').forEach(line => {
    const [k, v] = line.split(':').map(s => s.trim());
    if (k && v) obj[k] = isNaN(Number(v)) ? v : Number(v);
  });
  return obj;
};

export const parseXML = (str: string) => {
  const match = str.match(/<(\w+)>([^<]+)<\/\1>/g);
  const obj: any = {};
  match?.forEach(m => {
    const k = m.match(/<(\w+)>/)?.[1];
    const v = m.match(/>([^<]+)</)?.[1];
    if (k && v) obj[k] = isNaN(Number(v)) ? v : Number(v);
  });
  return obj;
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
