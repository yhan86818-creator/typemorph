import { 
  tsGen, zodGen, goGen, rustGen, javaGen, prismaGen, uiGen,
  dartGen, phpGen, pythonGen, protoGen, gqlGen, mockGen,
  csharpGen, swiftGen, kotlinGen, jsonSchemaGen
} from './generators';
import { Schema } from './types';
import { parseYAML, parseXML, parseCurl, parseSQLToZod, curlToTypeScript } from './parsers';

export { type Schema };
export { parseYAML, parseXML, parseCurl, parseSQLToZod, curlToTypeScript };

const mergeSchemas = (s1: Schema, s2: Schema): Schema => {
  if (!s1) return s2;
  if (!s2) return s1;
  if (s1.type === 'any') return s2;
  if (s2.type === 'any') return s1;
  if (s1.type !== s2.type) return { type: 'any' };
  
  if (s1.type === 'string' && s2.type === 'string') {
    if (s1.format === s2.format) return s1;
    return { type: 'string' };
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
      case 'typescript': return `/**\n * TypeFlow Generated TypeScript Interface\n */\n` + tsGen.generate(schema, 'Root', options);
      case 'zod': return `import { z } from "zod";\n\n` + zodGen.generate(schema, 'root', options);
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
      case 'csharp': return csharpGen.generate(schema);
      case 'swift': return swiftGen.generate(schema);
      case 'kotlin': return kotlinGen.generate(schema);
      case 'jsonschema': return jsonSchemaGen.generate(schema);
      default: return JSON.stringify(json, null, 2);
    }
  } catch (e) { return "// Error: " + String(e); }
};
