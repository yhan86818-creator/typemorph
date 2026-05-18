import { 
  tsGen, zodGen, goGen, rustGen, javaGen, prismaGen, uiGen,
  dartGen, phpGen, pythonGen, protoGen, gqlGen, mockGen,
  csharpGen, swiftGen, kotlinGen, jsonSchemaGen, docGen
} from './generators';
import {
  csvGen, sqlInsertGen, mysqlGen, postgresGen, sqliteGen, snowflakeGen,
  tomlGen, yamlOutputGen, envGen, propertiesGen, markdownTableGen,
  asciidocTableGen, latexTableGen, mermaidERGen, avroGen, bigQueryGen,
  dynamoDBGen, openApiGen, postmanGen, httpFileGen, vscodeSnippetGen,
  curlOutputGen, mongooseGen, sequelizeGen, typeormGen, drizzleGen,
  kyselyGen, yupGen, joiGen, valibotGen, superstructGen, reactPropsGen,
  reactContextGen, reduxSliceGen, piniaStoreGen, vuePropsGen, sveltePropsGen,
  solidPropsGen, arduinoGen, cobolGen, clojureGen, elixirGen, elmGen,
  godotGen, haskellGen, rGen, scalaGen, solidityGen, djangoGen, railsGen
} from './generators-extended';
import { Schema } from './types';
import { parseYAML, parseXML, parseCurl, parseSQLToZod, curlToTypeScript } from './parsers';

export { type Schema };
export { parseYAML, parseXML, parseCurl, parseSQLToZod, curlToTypeScript };

// ---------------------------------------------------------------------------
// Primitive types that can participate in a union (non-object, non-array)
// ---------------------------------------------------------------------------
const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean']);

/**
 * Promote two incompatible primitive types to a union schema.
 * e.g. string + number → { type: 'union', unionTypes: ['string', 'number'] }
 */
const makeUnion = (a: Schema, b: Schema): Schema => {
  const aTypes = a.type === 'union' ? (a.unionTypes ?? [a.type]) : [a.type];
  const bTypes = b.type === 'union' ? (b.unionTypes ?? [b.type]) : [b.type];
  const merged = Array.from(new Set([...aTypes, ...bTypes]));
  // If all types are still the same single type, collapse back
  if (merged.length === 1) return { type: merged[0] };
  return { type: 'union', unionTypes: merged };
};

const mergeSchemas = (s1: Schema, s2: Schema): Schema => {
  if (!s1) return s2;
  if (!s2) return s1;

  const optional = s1.optional || s2.optional;
  const nullable = s1.nullable || s2.nullable;

  if (s1.type === 'any') return { ...s2, optional, nullable };
  if (s2.type === 'any') return { ...s1, optional, nullable };

  // Both are union or same primitive — merge unionTypes
  if (s1.type !== s2.type) {
    if (PRIMITIVE_TYPES.has(s1.type) && PRIMITIVE_TYPES.has(s2.type)) {
      return { ...makeUnion(s1, s2), optional, nullable };
    }
    if (s1.type === 'union' || s2.type === 'union') {
      return { ...makeUnion(s1, s2), optional, nullable };
    }
    // Incompatible complex types (e.g. object vs array) → any
    return { type: 'any', optional, nullable };
  }

  if (s1.type === 'union') {
    return { ...makeUnion(s1, s2), optional, nullable };
  }

  if (s1.type === 'string' && s2.type === 'string') {
    // Merge enum values
    let enumValues: string[] | undefined = undefined;
    if (s1.enumValues && s2.enumValues) {
      const mergedEnum = Array.from(new Set([...s1.enumValues, ...s2.enumValues]));
      // Keep as closed enum if unique string count is small (e.g. max 6)
      if (mergedEnum.length <= 6) {
        enumValues = mergedEnum;
      }
    }
    if (s1.format === s2.format) {
      return { ...s1, optional, nullable, enumValues };
    }
    return { type: 'string', optional, nullable, enumValues };
  }

  if (s1.type === 'object' && s2.type === 'object') {
    const s1Fields = s1.fields ?? {};
    const s2Fields = s2.fields ?? {};
    const allKeys = new Set([...Object.keys(s1Fields), ...Object.keys(s2Fields)]);
    const fields: Record<string, Schema> = {};

    for (const k of allKeys) {
      const inS1 = k in s1Fields;
      const inS2 = k in s2Fields;
      if (inS1 && inS2) {
        fields[k] = mergeSchemas(s1Fields[k], s2Fields[k]);
      } else if (inS1) {
        // Key only in s1 → absent in s2 → optional
        fields[k] = { ...s1Fields[k], optional: true };
      } else {
        // Key only in s2 → absent in s1 → optional
        fields[k] = { ...s2Fields[k], optional: true };
      }
    }
    return { type: 'object', fields, optional, nullable };
  }

  if (s1.type === 'array' && s2.type === 'array') {
    return {
      type: 'array',
      itemType: mergeSchemas(s1.itemType as Schema, s2.itemType as Schema),
      optional,
      nullable,
    };
  }

  return { ...s1, optional, nullable };
};

export const inferSchema = (val: any): Schema => {
  if (val === null) return { type: 'any', nullable: true };
  if (val === undefined) return { type: 'any', optional: true };

  if (Array.isArray(val)) {
    if (val.length === 0) return { type: 'array', itemType: { type: 'any' } };
    // Merge all items — this is what detects optional keys across object samples
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
    
    // Shorter clean strings are registered as enum candidates
    if (val.length < 50 && !val.includes('\n') && val.trim() !== '') {
      return { type: 'string', enumValues: [val] };
    }
    return { type: 'string' };
  }

  return { type: typeof val };
};

const DEPENDENCY_COMMENTS: Record<string, string> = {
  // Languages
  'typescript': '// Required dependencies: npm install typescript\n\n',
  'zod': '// Required dependencies: npm install zod\n\n',
  'go': '// Go version 1.18+ required (supports generics)\n\n',
  'rust': '// Required Cargo dependencies:\n// serde = { version = "1.0", features = ["derive"] }\n\n',
  'java': '// Java version 8+ required (compatible with Jackson/Gson)\n\n',
  'sql': '// Prisma schema format (requires: npx prisma generate)\n\n',
  'php': '// PHP version 8.1+ required\n\n',
  'python': '# Required dependencies: pip install pydantic\n\n',
  'protobuf': '// Protocol Buffers v3 specification\n\n',
  'csharp': '// C# (.NET Core 6.0+) standard class model\n\n',
  'swift': '// Swift 5.0+ (Codable protocol compliant)\n\n',
  'kotlin': '// Kotlin standard library data class (compatible with kotlinx.serialization)\n\n',

  // SEO & Special Slugs
  'csv': '// CSV Data Format (Excel compatible)\n\n',
  'sql-insert': '// ANSI SQL standard compliant INSERT statement\n\n',
  'mysql': '-- MySQL / MariaDB compatible DDL (Requires MySQL 5.7+)\n\n',
  'postgres': '-- PostgreSQL compatible DDL (Requires PostgreSQL 10+)\n\n',
  'sqlite': '-- SQLite compatible DDL schema\n\n',
  'snowflake': '-- Snowflake Data Cloud compatible DDL table schema\n\n',
  'toml': '# TOML configuration format\n\n',
  'yaml': '# YAML standard data format\n\n',
  'env': '# Environment variables (.env template)\n\n',
  'properties': '# Java .properties key-value configuration\n\n',
  'mongoose': '// Required dependencies: npm install mongoose\n\n',
  'sequelize': '// Required dependencies: npm install sequelize pg pg-hstore (or mysql2/sqlite3)\n\n',
  'typeorm': '// Required dependencies: npm install typeorm reflect-metadata\n// Note: Enable emitDecoratorMetadata and experimentalDecorators in tsconfig.json\n\n',
  'drizzle': '// Required dependencies: npm install drizzle-orm drizzle-kit\n\n',
  'kysely': '// Required dependencies: npm install kysely\n\n',
  'yup': '', // Already prepended by yupGen
  'joi': '', // Already prepended by joiGen
  'valibot': '', // Already prepended by valibotGen
  'superstruct': '', // Already prepended by superstructGen
  'react-props': '// Required dependencies: npm install react\n\n',
  'react-context': '// Required dependencies: npm install react\n\n',
  'redux-slice': '// Required dependencies: npm install @reduxjs/toolkit react-redux\n\n',
  'pinia-store': '// Required dependencies: npm install pinia\n\n',
  'vue-props': '// Vue 3 <script setup lang="ts"> standard format\n\n',
  'svelte-props': '// Svelte 3/4 TypeScript component props scaffold\n\n',
  'solid-props': '// Required dependencies: npm install solid-js\n\n',
  'arduino': '// Required libraries: ArduinoJson (v6 or v7)\n\n',
  'clojure': ';; Clojure clojure.spec/alpha definition\n\n',
  'elixir': '# Required dependencies: Ecto (mix ecto)\n\n',
  'elm': '-- Required Elm packages:\n-- elm install elm/json\n-- elm install elm-community/json-extra\n\n',
  'godot': '# Godot Engine 4.0+ GDScript class_name script\n\n',
  'haskell': '-- Required GHC extensions and packages: aeson\n\n',
  'django': '# Required dependencies: pip install django djangorestframework\n\n',
  'rails': '# Rails ActiveRecord Migration template\n\n',
};

const cleanAndFormatCode = (code: string): string => {
  // Trim trailing whitespace from each line
  const lines = code.split('\n').map(line => line.trimEnd());
  
  // Condense multiple sequential empty lines to a single empty line
  const result: string[] = [];
  let prevWasEmpty = false;
  for (const line of lines) {
    if (line === '') {
      if (!prevWasEmpty) {
        result.push('');
        prevWasEmpty = true;
      }
    } else {
      result.push(line);
      prevWasEmpty = false;
    }
  }

  return result.join('\n').trim();
};

export const runEngine = (json: any, lang: string, slug: string = "", options: any = {}): any => {
  try {
    const schema = inferSchema(json);
    let out = "";
    let matchedKey = "";

    // 1. Slug-specific exact matches to prevent SEO/feature gaps
    if (slug) {
      const s = slug.toLowerCase();
      matchedKey = s;
      if (s.includes('csv')) out = csvGen.generate(schema);
      else if (s.includes('sql-insert')) out = sqlInsertGen.generate(schema, 'table_name');
      else if (s.includes('mysql') || s.includes('mariadb')) out = mysqlGen.generate(schema, 'Root');
      else if (s.includes('postgres')) out = postgresGen.generate(schema, 'Root');
      else if (s.includes('sqlite')) out = sqliteGen.generate(schema, 'Root');
      else if (s.includes('snowflake')) out = snowflakeGen.generate(schema, 'Root');
      else if (s.includes('toml')) out = tomlGen.generate(schema, 'config');
      else if (s.includes('yaml') && !s.includes('xml')) out = yamlOutputGen.generate(schema);
      else if (s.includes('env')) out = envGen.generate(schema);
      else if (s.includes('properties')) out = propertiesGen.generate(schema);
      else if (s.includes('markdown-table')) out = markdownTableGen.generate(schema);
      else if (s.includes('asciidoc-table')) out = asciidocTableGen.generate(schema);
      else if (s.includes('latex-table')) out = latexTableGen.generate(schema);
      else if (s.includes('mermaid')) out = mermaidERGen.generate(schema, 'Root');
      else if (s.includes('avro')) out = avroGen.generate(schema, 'Root');
      else if (s.includes('bigquery-schema')) out = bigQueryGen.generate(schema);
      else if (s.includes('dynamodb-json')) out = dynamoDBGen.generate(schema, 'Root');
      else if (s.includes('openapi-3')) out = openApiGen.generate(schema, 'Root');
      else if (s.includes('postman-collection')) out = postmanGen.generate(schema, 'Root');
      else if (s.includes('http-file')) out = httpFileGen.generate(schema, 'Root');
      else if (s.includes('vscode-snippet')) out = vscodeSnippetGen.generate(schema, 'Root');
      else if (s.includes('curl')) out = curlOutputGen.generate(schema, 'Root');
      else if (s.includes('mongoose-schema') || s.includes('mongoose-model')) out = mongooseGen.generate(schema, 'Root');
      else if (s.includes('sequelize-model')) out = sequelizeGen.generate(schema, 'Root');
      else if (s.includes('typeorm-entity')) out = typeormGen.generate(schema, 'Root');
      else if (s.includes('drizzle-schema')) out = drizzleGen.generate(schema, 'Root');
      else if (s.includes('kysely-schema')) out = kyselyGen.generate(schema, 'Root');
      else if (s.includes('yup')) out = yupGen.generate(schema, 'root');
      else if (s.includes('joi')) out = joiGen.generate(schema, 'root');
      else if (s.includes('valibot')) out = valibotGen.generate(schema, 'root');
      else if (s.includes('superstruct')) out = superstructGen.generate(schema, 'root');
      else if (s.includes('react-props')) out = reactPropsGen.generate(schema, 'Component');
      else if (s.includes('react-context')) out = reactContextGen.generate(schema, 'State');
      else if (s.includes('redux-slice')) out = reduxSliceGen.generate(schema, 'User');
      else if (s.includes('pinia-store')) out = piniaStoreGen.generate(schema, 'User');
      else if (s.includes('vue-props')) out = vuePropsGen.generate(schema, 'Component');
      else if (s.includes('svelte-props')) out = sveltePropsGen.generate(schema, 'Component');
      else if (s.includes('solid-props')) out = solidPropsGen.generate(schema, 'Component');
      else if (s.includes('arduino')) out = arduinoGen.generate(schema, 'Data');
      else if (s.includes('cobol')) out = cobolGen.generate(schema, 'RECORD');
      else if (s.includes('clojure-spec')) out = clojureGen.generate(schema, 'data');
      else if (s.includes('elixir-struct')) out = elixirGen.generate(schema, 'Data');
      else if (s.includes('elm-decoder')) out = elmGen.generate(schema, 'Model');
      else if (s.includes('godot-gdscript')) out = godotGen.generate(schema, 'Data');
      else if (s.includes('haskell-type')) out = haskellGen.generate(schema, 'Root');
      else if (s.includes('r-dataframe')) out = rGen.generate(schema, 'df');
      else if (s.includes('scala-case-class')) out = scalaGen.generate(schema, 'Root');
      else if (s.includes('solidity')) out = solidityGen.generate(schema, 'Record');
      else if (s.includes('django-model') || s.includes('django-rest-serializer')) out = djangoGen.generate(schema, 'Post');
      else if (s.includes('rails-migration')) out = railsGen.generate(schema, 'User');
    }

    // 2. Default fallback language router
    if (!out) {
      matchedKey = lang.toLowerCase();
      switch (lang) {
        case 'typescript': out = `/**\n * TypeFlow Generated TypeScript Interface\n */\n` + tsGen.generate(schema, 'Root', options); break;
        case 'zod': out = `import { z } from "zod";\n\n` + zodGen.generate(schema, 'root', options); break;
        case 'go': out = goGen.generate(schema); break;
        case 'rust': out = rustGen.generate(schema); break;
        case 'java': out = javaGen.generate(schema); break;
        case 'sql': out = prismaGen.generate(schema); break;
        case 'ui': out = uiGen.generate(schema); break;
        case 'mock': out = mockGen.generate(schema); break;
        case 'dart': out = dartGen.generate(schema); break;
        case 'php': out = `<?php\n\n` + phpGen.generate(schema); break;
        case 'python': out = `from pydantic import BaseModel\n\n` + pythonGen.generate(schema); break;
        case 'protobuf': out = `syntax = "proto3";\n\n` + protoGen.generate(schema); break;
        case 'graphql': out = gqlGen.generate(schema); break;
        case 'csharp': out = csharpGen.generate(schema); break;
        case 'swift': out = swiftGen.generate(schema); break;
        case 'kotlin': out = kotlinGen.generate(schema); break;
        case 'jsonschema': out = jsonSchemaGen.generate(schema); break;
        case 'doc': out = docGen.generate(schema); break;
        default: out = JSON.stringify(json, null, 2); break;
      }
    }

    // 3. Find dependencies comment
    let depHeader = "";
    const lowerKey = matchedKey.toLowerCase();
    for (const [k, comment] of Object.entries(DEPENDENCY_COMMENTS)) {
      if (lowerKey.includes(k)) {
        depHeader = comment;
        break;
      }
    }

    let finalCode = depHeader ? depHeader + out : out;
    return cleanAndFormatCode(finalCode);
  } catch (e) { return "// Error: " + String(e); }
};
