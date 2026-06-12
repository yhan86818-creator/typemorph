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
  godotGen, haskellGen, rGen, scalaGen, solidityGen, djangoGen, railsGen,
  apiRouteGen, reactHookGen
} from './generators-extended';
import { Schema, SchemaType } from './types';
import { createHash } from 'crypto';
import { parseYAML, parseXML, parseCurl, parseSQLToZod, curlToTypeScript, parseOpenAPI, parseTypeScriptToSchema } from './parsers';
import { trackInferenceError, trackInferenceFallback, trackUnsupportedOutputTarget } from './analytics';

export { type Schema };
export { parseYAML, parseXML, parseCurl, parseSQLToZod, curlToTypeScript, parseOpenAPI, parseTypeScriptToSchema };

// ---------------------------------------------------------------------------
// Primitive types that can participate in a union (non-object, non-array)
// ---------------------------------------------------------------------------
const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean']);

/**
 * Promote two incompatible primitive types to a union schema.
 * e.g. string + number → { type: 'union', unionTypes: ['string', 'number'] }
 */
const makeUnion = (a: Schema, b: Schema): Schema => {
  const aTypes = a.type === 'union' ? (a.unionTypes ?? []) : [a.type];
  const bTypes = b.type === 'union' ? (b.unionTypes ?? []) : [b.type];
  const merged = Array.from(new Set([...aTypes, ...bTypes]));
  // If all types are still the same single type, collapse back
  if (merged.length === 1) return { type: merged[0] as SchemaType };
  return { type: 'union', unionTypes: merged };
};

// Default tunable parameters
const MAX_DEPTH = 20;
export interface InferOptions {
  maxDepth?: number;
  enumMinSamples?: number; // minimum number of samples to consider enum
  enumMaxUnique?: number;  // maximum unique values to treat as enum
  enumConfidenceThreshold?: number; // 0〜1, default 0.6 — confidence threshold for enum detection
  // Array sampling controls for large arrays
  arrayLargeThreshold?: number; // if array length > this, sampling is used
  arraySampleCount?: number;    // total number of items to sample from large arrays
  arrayPrefixSample?: number;   // always include first N items in the sample
  includeMeta?: boolean;
}

const mergeSchemas = (s1: Schema, s2: Schema, depth: number = 0): Schema => {
  if (depth > MAX_DEPTH) return { type: 'any' };
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
      // Only merge if the other type is primitive or union
      const otherType = s1.type === 'union' ? s2.type : s1.type;
      if (otherType === 'union' || PRIMITIVE_TYPES.has(otherType)) {
        return { ...makeUnion(s1, s2), optional, nullable };
      }
    }
    // Incompatible complex types (e.g. object vs array, or union vs object) → any
    return { type: 'any', optional, nullable };
  }

  if (s1.type === 'union') {
    return { ...makeUnion(s1, s2), optional, nullable };
  }

  if (s1.type === 'number' && s2.type === 'number') {
    // If either is float, the result is float
    const format = (s1.format === 'float' || s2.format === 'float') ? 'float' : 'int';
    return { ...s1, optional, nullable, format };
  }

  if (s1.type === 'string' && s2.type === 'string') {
    // Merge enum values
    let enumValues: string[] | undefined = undefined;
    if (s1.enumValues || s2.enumValues) {
      const mergedEnum = Array.from(new Set([...(s1.enumValues ?? []), ...(s2.enumValues ?? [])]));
      // Keep as closed enum if unique string count is small (e.g. max 6)
      if (mergedEnum.length <= 6) {
        enumValues = mergedEnum;
      }
    }
    if (s1.format === s2.format) {
      return { ...s1, optional, nullable, enumValues };
    }
    // Formats differ → no shared format
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
        fields[k] = mergeSchemas(s1Fields[k], s2Fields[k], depth + 1);
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
      itemType: mergeSchemas(s1.itemType as Schema, s2.itemType as Schema, depth + 1),
      optional,
      nullable,
    };
  }

  return { ...s1, optional, nullable };
};

const getFieldStringValues = (arr: any[]): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  for (const item of arr) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      for (const [k, v] of Object.entries(item)) {
        if (typeof v === 'string') {
          if (!result[k]) result[k] = [];
          result[k].push(v);
        }
      }
    }
  }
  return result;
};

const enumKeywordsSet = new Set([
  // 既存
  'status', 'type', 'role', 'gender', 'state', 'category', 'mode', 'level', 'phase', 'kind', 'visibility', 'scope', 'method', 'action', 'currency', 'priority',
  // 追加
  'tier', 'plan', 'severity', 'permission', 'provider', 'platform', 'environment',
  'locale', 'theme', 'layout', 'variant', 'direction', 'alignment', 'position',
]);

/**
 * Enum の確信度を 0〜1 のスコアで返す。
 * - キーワードマッチ: +0.4
 * - ユニーク率が低い (重複が多い): 最大+0.4
 * - サンプル数が多い (信頼できるデータ量): 最大+0.2
 * 閾値 0.6 以上で enum 判定。
 */
const calcEnumConfidence = (key: string, values: string[], options?: InferOptions): number => {
  if (values.length === 0) return 0;
  let score = 0;

  const k = key.toLowerCase();
  const minSamples = options?.enumMinSamples ?? 3;
  const keywordMatch = Array.from(enumKeywordsSet).some(kw => k.includes(kw));

  // 1. キーワードマッチはサンプル数に関わらずフル加点
  if (keywordMatch) {
    score += 0.4;
  }

  const unique = new Set(values);
  const uniqueRatio = unique.size / values.length;
  if (unique.size === 1) {
    score += 0.4;
  } else if (uniqueRatio <= 0.2) {
    score += 0.4;
  } else if (uniqueRatio <= 0.4 && values.length >= minSamples) {
    score += 0.2;
  }

  // 少数値に収束している = enum らしい分布
  const maxUnique = options?.enumMaxUnique ?? 6;
  if (unique.size >= 2 && unique.size <= maxUnique) {
    score += 0.25;
  }

  if (values.length >= 10) score += 0.2;
  else if (values.length >= 5) score += 0.1;

  const commonConstants = new Set(['yes', 'no', 'true', 'false', 'get', 'post', 'put', 'delete', 'active', 'inactive', 'pending', 'success', 'error', 'failed']);
  if (values.every(v => commonConstants.has(v.toLowerCase()))) {
    score += values.length >= minSamples ? 0.5 : 0.2;
  }

  return Math.min(score, 1.0);
};

const isKeyEnum = (key: string, values: string[], options?: InferOptions): boolean => {
  const threshold = options?.enumConfidenceThreshold ?? 0.6;
  return calcEnumConfidence(key, values, options) >= threshold;
};


/**
 * 隣接フィールドの文脈を使って format を補正する。
 * 例: currency が隣にあれば amount/price/tax を float に昇格。
 */
const applyContextCorrections = (fields: Record<string, Schema>): void => {
  const keys = Object.keys(fields);

  // --- currency/amount パターン ---
  const hasCurrency = keys.some(k => /currency|curr/i.test(k));
  if (hasCurrency) {
    for (const k of keys) {
      if (/amount|price|cost|fee|tax|total|subtotal/i.test(k) && fields[k].type === 'number') {
        fields[k].format = 'float';
      }
    }
  }

  // --- lat/lng パターン ---
  const hasLat = keys.some(k => /^lat(itude)?$/i.test(k));
  const hasLng = keys.some(k => /^(lng|lon|longitude)$/i.test(k));
  if (hasLat && hasLng) {
    for (const k of keys) {
      if (/^lat(itude)?$|^(lng|lon|longitude)$/i.test(k) && fields[k].type === 'number') {
        fields[k].format = 'float';
      }
    }
  }

  // --- createdBy/updatedBy → uuid パターン ---
  const hasTimestamp = keys.some(k => /created_?at|updated_?at/i.test(k));
  if (hasTimestamp) {
    for (const k of keys) {
      if (/created_?by|updated_?by/i.test(k) && fields[k].type === 'string') {
        fields[k].format = 'uuid';
      }
    }
  }
};

export const inferSchema = (val: any, keyName?: string, depth: number = 0, allowedEnumKeys?: Set<string>, options?: InferOptions): Schema => {
  const maxDepth = options?.maxDepth ?? MAX_DEPTH;
  const addMeta = (s: Schema, reason: string, info?: any): Schema => {
    if (!options?.includeMeta) return s;
    s._meta = { reason, info };
    return s;
  };

  if (depth > maxDepth) return addMeta({ type: 'any' }, 'max_depth_exceeded');
  if (val === null) return addMeta({ type: 'any', nullable: true }, 'null_value');
  if (val === undefined) return addMeta({ type: 'any', optional: true }, 'undefined_value');

  if (Array.isArray(val)) {
    if (val.length === 0) return addMeta({ type: 'array', itemType: { type: 'any' } }, 'empty_array');
    
    // 配列が大きい場合はサンプリングして統計処理・推論を行う
    const len = val.length;
    const threshold = options?.arrayLargeThreshold ?? 1000;
    const sampleCount = options?.arraySampleCount ?? 200;
    const prefixSample = options?.arrayPrefixSample ?? 10;

    const indicesSet = new Set<number>();
    if (len <= threshold) {
      for (let i = 0; i < len; i++) indicesSet.add(i);
    } else {
      const prefixCount = Math.min(prefixSample, len);
      for (let i = 0; i < prefixCount; i++) indicesSet.add(i);
      const remaining = Math.max(0, Math.min(sampleCount - prefixCount, len - prefixCount));
      if (remaining > 0) {
        const step = (len - prefixCount) / remaining;
        for (let j = 0; j < remaining; j++) {
          indicesSet.add(Math.min(len - 1, Math.floor(prefixCount + j * step)));
        }
      }
    }
    const sampledItems = Array.from(indicesSet).sort((a, b) => a - b).map(i => val[i]);

    // 配列内のオブジェクトのキーに対して、統計的な Enum 判定を実施（サンプリングベース）
    const allowed = new Set<string>();
    const stringFields = getFieldStringValues(sampledItems);
    for (const [k, v] of Object.entries(stringFields)) {
      if (isKeyEnum(k, v, options)) {
        allowed.add(k);
      }
    }

    let itemType = inferSchema(sampledItems[0], undefined, depth + 1, allowed, options);
    for (let si = 1; si < sampledItems.length; si++) {
      itemType = mergeSchemas(itemType, inferSchema(sampledItems[si], undefined, depth + 1, allowed, options), depth + 1);
    }
    return addMeta({ type: 'array', itemType }, 'array_inferred', { samples: len, sampled: sampledItems.length });
  }

  if (typeof val === 'object') {
    const fields: Record<string, Schema> = {};
    for (const key in val) {
      fields[key] = inferSchema(val[key], key, depth + 1, allowedEnumKeys, options);
    }
    // 隣接フィールドの文脈で format を補正
    applyContextCorrections(fields);
    return addMeta({ type: 'object', fields }, 'object', { fieldCount: Object.keys(fields).length });
  }

  if (typeof val === 'string') {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return addMeta({ type: 'string', format: 'uuid' }, 'format:uuid');
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return addMeta({ type: 'string', format: 'email' }, 'format:email');
    if (/^https?:\/\/[^\s]+$/.test(val)) return addMeta({ type: 'string', format: 'url' }, 'format:url');
    
    // Pure YYYY-MM-DD date format
    if (/^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val))) return addMeta({ type: 'string', format: 'date' }, 'format:date');
    
    // Strict datetime detection (must look like YYYY-... or YYYY/... or contain T)
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(val) && !isNaN(Date.parse(val))) return addMeta({ type: 'string', format: 'datetime' }, 'format:datetime');
    if (/^\d/.test(val) && val.includes('T') && !isNaN(Date.parse(val)) && val.length > 7) return addMeta({ type: 'string', format: 'datetime' }, 'format:datetime');
    
    // インテリジェントな Enum 候補推論
    let isEnumCandidate = false;
    if (keyName) {
      const k = keyName.toLowerCase();
      const enumKeywords = Array.from(enumKeywordsSet);

      // キー名に基づいた format 推論辞書（値パターンマッチの前に適用）
      const floatKeyPattern = /price|amount|cost|fee|tax|rate|ratio|percent|score|weight|height|width|balance|salary|revenue/i;
      const uuidKeyPattern = /^id$|_id$|^uuid$|^guid$|^token$/i;
      const urlKeyPattern = /url|uri|href|link|src|endpoint|avatar|thumbnail|image|photo/i;
      const emailKeyPattern = /email|mail/i;

      if (uuidKeyPattern.test(keyName)) return addMeta({ type: 'string', format: 'uuid' }, 'format:uuid:keyname');
      if (emailKeyPattern.test(keyName)) return addMeta({ type: 'string', format: 'email' }, 'format:email:keyname');
      if (urlKeyPattern.test(keyName)) return addMeta({ type: 'string', format: 'url' }, 'format:url:keyname');

      if (allowedEnumKeys) {
        // 統計判定情報が存在する場合はそれを利用
        isEnumCandidate = allowedEnumKeys.has(keyName);
      } else {
        // 単一オブジェクト（配列外）の場合は、強いキーワードマッチのみ許容し、汎用文字列の誤爆を防ぐ
        if (enumKeywords.some(kw => k.includes(kw))) {
          isEnumCandidate = true;
        } else {
          // 単一オブジェクトの場合は極めて限定的な共通定数のみEnumにする
          const commonConstants = new Set(['yes', 'no', 'true', 'false', 'get', 'post', 'put', 'delete', 'active', 'inactive', 'pending', 'success', 'error', 'failed']);
          if (commonConstants.has(val.toLowerCase())) {
            isEnumCandidate = true;
          }
        }
      }
      // float key: 統計的enum判定が優先。判定されなかった場合のみ float として扱う
      if (!isEnumCandidate && floatKeyPattern.test(keyName)) {
        return addMeta({ type: 'string' }, 'format:float:keyname');
      }
    }

    if (isEnumCandidate && val.trim() !== '') {
      return addMeta({ type: 'string', enumValues: [val] }, 'enum_candidate', { sample: val });
    }
    return addMeta({ type: 'string' }, 'string');
  }

  if (typeof val === 'number') {
    const isInt = Number.isInteger(val);
    return addMeta({ type: 'number', format: isInt ? 'int' : 'float' }, 'number');
  }

  const t = typeof val;
  if (t === 'string' || t === 'number' || t === 'boolean' || t === 'object') {
    return addMeta({ type: t as SchemaType }, 'primitive');
  }
  return addMeta({ type: 'any' }, 'primitive');
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

  // Extended targets — previously missing entries
  'mongodb': '// Required dependencies: npm install mongoose\n\n',
  'dynamodb': '// AWS SDK required: npm install @aws-sdk/client-dynamodb\n\n',
  'bigquery': '// Required dependencies: npm install @google-cloud/bigquery\n\n',
  'openapi': '// OpenAPI 3.0 specification (YAML format)\n\n',
  'avro': '// Apache Avro schema format\n\n',
  'mermaid': '// Mermaid ER Diagram — paste into https://mermaid.live\n\n',
  'postman': '// Postman Collection v2.1 format\n\n',
  'http': '// HTTP file format (JetBrains IDE / VS Code REST Client compatible)\n\n',
  'vscode': '// VS Code snippet format — paste into .vscode/snippets.json\n\n',
  'curl': '// cURL command\n\n',
  'cobol': '* COBOL Copybook format\n\n',
  'scala': '// Scala case class\n\n',
  'solidity': '// SPDX-License-Identifier: MIT\n\n',
  'r-lang': '# R dataframe scaffold\n\n',
  'react-query': '// Required dependencies: npm install @tanstack/react-query\n\n',
  'api-route': '// Generated Next.js App Router API Route\n// Required: Next.js 13+ with App Router enabled\n\n',
  'nextjs-api': '// Generated Next.js App Router API Route\n// Required: Next.js 13+ with App Router enabled\n\n',
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

// Structure hash calculation using SHA-256 for robustness and a WeakMap cache
const structureHashCache = new WeakMap<Schema, string>();
const calculateStructureHash = (s: Schema): string => {
  if (structureHashCache.has(s)) return structureHashCache.get(s)!;

  const build = (node?: Schema): any => {
    if (!node) return null;
    if (node.type === 'object' && node.fields) {
      const keys = Object.keys(node.fields).sort((a, b) => a.localeCompare(b));
      const obj: Record<string, any> = {};
      for (const k of keys) {
        obj[k] = build(node.fields![k]);
      }
      return { type: 'object', fields: obj };
    }
    if (node.type === 'array' && node.itemType) {
      return { type: 'array', item: build(node.itemType) };
    }
    const base: Record<string, any> = {
      type: node.type,
      optional: !!node.optional,
      nullable: !!node.nullable,
    };
    if (node.enumValues && node.enumValues.length > 0) base.enum = [...node.enumValues].sort();
    if (node.format) base.format = node.format;
    return base;
  };

  const canonical = JSON.stringify(build(s));
  const hash = createHash('sha256').update(canonical).digest('hex');
  structureHashCache.set(s, hash);
  s._structureHash = hash;
  return hash;
};

// 全オブジェクトノードの収集
const collectObjectNodes = (s: Schema, list: { schema: Schema; parentKey: string }[] = [], parentKey: string = 'Root') => {
  if (s.type === 'object' && s.fields) {
    list.push({ schema: s, parentKey });
    for (const [k, v] of Object.entries(s.fields)) {
      collectObjectNodes(v, list, k);
    }
  } else if (s.type === 'array' && s.itemType) {
    collectObjectNodes(s.itemType, list, parentKey + 'Item');
  }
};

const areFieldsIsomorphic = (s1: Schema, s2: Schema, visited = new Set<string>(), options: { minMatchRatio?: number; maxTypeMismatches?: number; minFieldsForIsomorphic?: number } = {}): boolean => {
  if (s1.type !== 'object' || s2.type !== 'object') return false;
  if (!s1.fields || !s2.fields) return false;

  const keys1 = Object.keys(s1.fields);
  const keys2 = Object.keys(s2.fields);
  const minFields = options.minFieldsForIsomorphic ?? 2;
  if (keys1.length < minFields || keys2.length < minFields) return false;

  const s1Hash = s1._structureHash;
  const s2Hash = s2._structureHash;
  const pairKey = s1Hash && s2Hash ? `${s1Hash}-${s2Hash}` : undefined;
  if (pairKey && visited.has(pairKey)) return true;
  if (pairKey) visited.add(pairKey);

  const allKeys = Array.from(new Set([...keys1, ...keys2]));
  let matchingKeys = 0;
  let typeMismatches = 0;
  let missingKeys = 0;

  for (const k of allKeys) {
    const f1 = s1.fields[k];
    const f2 = s2.fields[k];

    if (f1 && f2) {
      if (f1.type === 'any' || f2.type === 'any') {
        matchingKeys++;
      } else if (f1.type === f2.type) {
        if (f1.type === 'object' && f1.fields && f2.fields) {
          if (areFieldsIsomorphic(f1, f2, visited, options as any)) {
            matchingKeys++;
          } else {
            typeMismatches++;
          }
        } else if (f1.type === 'array' && f1.itemType && f2.itemType) {
          const item1 = f1.itemType;
          const item2 = f2.itemType;
          if (item1.type === 'any' || item2.type === 'any') {
            matchingKeys++;
          } else if (item1.type === 'object' && item2.type === 'object') {
            if (areFieldsIsomorphic(item1, item2, visited, options as any)) {
              matchingKeys++;
            } else {
              typeMismatches++;
            }
          } else if (item1.type === item2.type) {
            matchingKeys++;
          } else {
            typeMismatches++;
          }
        } else {
          matchingKeys++;
        }
      } else {
        typeMismatches++;
      }
    } else {
      const presentField = f1 || f2;
      if (presentField.optional || presentField.type === 'any') {
        matchingKeys++;
      } else {
        missingKeys++;
      }
    }
  }

  const allCompared = matchingKeys + typeMismatches + missingKeys;
  if (allCompared === 0) return true;
  const matchRatio = matchingKeys / allCompared;
  const minMatchRatio = options.minMatchRatio ?? 0.5;
  const maxTypeMismatches = options.maxTypeMismatches ?? 0;
  return matchRatio >= minMatchRatio && typeMismatches <= maxTypeMismatches;
};

const mergeIsomorphicObjects = (target: Schema, source: Schema) => {
  if (!target.fields || !source.fields) return;
  
  // 1. sourceにあるがtargetにないキーを追加 (optionalとして)
  for (const [k, v] of Object.entries(source.fields)) {
    if (!target.fields[k]) {
      target.fields[k] = { ...v, optional: true };
    } else {
      const t = target.fields[k];
      t.optional = t.optional || v.optional;
      t.nullable = t.nullable || v.nullable;
      if (t.type === 'any') {
        target.fields[k] = { ...v, optional: t.optional, nullable: t.nullable };
      } else if (t.type === 'string' && v.type === 'string') {
        if (t.enumValues || v.enumValues) {
          const merged = Array.from(new Set([...(t.enumValues ?? []), ...(v.enumValues ?? [])]));
          t.enumValues = merged.length <= 6 ? merged : undefined;
        }
      } else if (t.type === 'object' && v.type === 'object') {
        mergeIsomorphicObjects(t, v);
      } else if (t.type === 'array' && t.itemType && v.type === 'array' && v.itemType) {
        if (t.itemType.type === 'any') {
          t.itemType = { ...v.itemType };
        } else if (t.itemType.type === 'object' && v.itemType.type === 'object') {
          mergeIsomorphicObjects(t.itemType, v.itemType);
        } else if (t.itemType.type === v.itemType.type) {
          t.itemType = mergeSchemas(t.itemType, v.itemType);
        }
      }
    }
  }
  
  // 2. targetにあるがsourceにないキーをoptionalに変更
  for (const k of Object.keys(target.fields)) {
    if (!source.fields[k]) {
      target.fields[k].optional = true;
    }
  }
};

interface IsomorphicGroup {
  group: Schema[];
  semanticName: string;
}

const buildIsomorphicGroups = (
  nodes: { schema: Schema; parentKey: string }[],
  options: { sharedPrefix?: string; minMatchRatio?: number; maxTypeMismatches?: number; minFieldsForIsomorphic?: number; customTypeNames?: Record<string, string>; disabledUnifications?: string[] } = {}
): IsomorphicGroup[] => {
  const prefix = options.sharedPrefix !== undefined ? options.sharedPrefix : 'Shared';
  const rawGroups: Schema[][] = [];

  for (const node of nodes) {
    let found = false;
    for (const group of rawGroups) {
      if (areFieldsIsomorphic(node.schema, group[0], new Set(), options as any)) {
        group.push(node.schema);
        found = true;
        break;
      }
    }
    if (!found) rawGroups.push([node.schema]);
  }

  const sharedNames = new Set<string>();
  const result: IsomorphicGroup[] = [];

  for (const group of rawGroups) {
    let counter = 1;
    if (group.length < 2) continue;
    group.sort((a, b) => Object.keys(b.fields || {}).length - Object.keys(a.fields || {}).length);
    const rep = group[0];
    const repNode = nodes.find(n => n.schema === rep) || nodes.find(n => group.includes(n.schema));
    const representativeKey = repNode?.parentKey || 'Object';
    const fieldNames = Object.keys(rep.fields || {});

    let semanticName = '';
    if (fieldNames.includes('city') && (fieldNames.includes('street') || fieldNames.includes('zip'))) {
      semanticName = prefix ? `${prefix}Address` : 'Address';
    } else if (fieldNames.includes('amount') && fieldNames.includes('currency')) {
      semanticName = prefix ? `${prefix}Money` : 'Money';
    } else if (fieldNames.includes('created_at') && fieldNames.includes('updated_at')) {
      semanticName = prefix ? `${prefix}Metadata` : 'Metadata';
    } else if (fieldNames.includes('name') && (fieldNames.includes('email') || fieldNames.includes('age') || fieldNames.includes('profile') || fieldNames.includes('role'))) {
      semanticName = prefix ? `${prefix}User` : 'User';
    } else if (fieldNames.includes('id') && fieldNames.includes('profile') && fieldNames.includes('permissions')) {
      semanticName = prefix ? `${prefix}Member` : 'Member';
    } else {
      const allParentKeys = group
        .map(s => nodes.find(n => n.schema === s)?.parentKey)
        .filter((k): k is string => !!k && k !== 'Root' && k !== 'Object');
      let bestKey = allParentKeys.length > 0
        ? allParentKeys.sort((a, b) => a.length - b.length)[0]
        : representativeKey;
      // Simple singularization: remove trailing 's' for common plural patterns,
      // but preserve words that are singular despite ending in 's'
      const singularExceptions = new Set(['status', 'address', 'business', 'process', 'class', 'series', 'species', 'means', 'news', 'analysis', 'basis', 'crisis', 'thesis', 'oasis', 'bonus', 'genius', 'campus', 'focus', 'corpus', 'census', 'consensus', 'virus', 'canvas', 'atlas', 'alias', 'bias', 'gas']);
      if (bestKey.endsWith('s') && !bestKey.endsWith('ss') && !singularExceptions.has(bestKey.toLowerCase())) {
        bestKey = bestKey.slice(0, -1);
      }
      const camelKey = bestKey.replace(/(^\w|_\w)/g, m => m.replace(/_/, '').toUpperCase());
      semanticName = prefix ? `${prefix}${camelKey}` : camelKey;
    }

    let finalName = semanticName;
    while (sharedNames.has(finalName)) finalName = `${semanticName}${counter++}`;
    sharedNames.add(finalName);

    result.push({ group, semanticName: finalName });
  }

  return result;
};

// 共通型の自動推論とスキーマリファクタリング (構造同型性発見器: Structural Isomorphism Discovery)
export const extractSharedTypes = (
  rootSchema: Schema,
  options: {
    sharedPrefix?: string;
    disabledUnifications?: string[];
    customTypeNames?: Record<string, string>;
    minMatchRatio?: number;
    maxTypeMismatches?: number;
    minFieldsForIsomorphic?: number;
  } = {}
) => {
  const nodes: { schema: Schema; parentKey: string }[] = [];
  collectObjectNodes(rootSchema, nodes, 'Root');

  // 事前に基本構造ハッシュを設定
  for (const node of nodes) {
    node.schema._structureHash = calculateStructureHash(node.schema);
  }

  const groups = buildIsomorphicGroups(nodes, options);

  for (const { group, semanticName } of groups) {
    if (options.disabledUnifications?.includes(semanticName)) continue;
    const finalName = options.customTypeNames?.[semanticName] ?? semanticName;
    const rep = group[0];

    for (let i = 1; i < group.length; i++) mergeIsomorphicObjects(rep, group[i]);
    for (let i = 1; i < group.length; i++) group[i].fields = rep.fields;
    for (const s of group) s._sharedTypeName = finalName;
  }


};

export interface Decision {
  id: string;
  type: 'unification' | 'timestamp' | 'flattening';
  title: string;
  description: string;
  meta: {
    semanticName?: string;
    originalName?: string;
    count?: number;
    fields?: string[];
    disabled: boolean;
  };
}

export const getDecisions = (json: any, options: any = {}): Decision[] => {
  const decisions: Decision[] = [];
  if (!json || typeof json !== 'object') return decisions;
  try {
    const tempSchema = inferSchema(json);
    
    // We want to find all isomorphic groups
    const nodes: { schema: Schema; parentKey: string }[] = [];
    collectObjectNodes(tempSchema, nodes, 'Root');
    for (const node of nodes) {
      node.schema._structureHash = calculateStructureHash(node.schema);
    }
    
    const groups = buildIsomorphicGroups(nodes, options);

    for (const { group, semanticName } of groups) {
      const isDisabled = !!options.disabledUnifications?.includes(semanticName);
      const displayName = options.customTypeNames?.[semanticName] ?? semanticName;
      const rep = group[0];

      decisions.push({
        id: `unify_${semanticName}`,
        type: 'unification',
        title: `Unify similar objects as ${displayName}`,
        description: `Detected ${group.length} objects with similar fields. Unified them into ${displayName} to avoid duplicate class definitions.`,
        meta: {
          semanticName: displayName,
          originalName: semanticName,
          count: group.length,
          fields: Object.keys(rep.fields || {}),
          disabled: isDisabled
        }
      });
    }



    // Now check for Timestamp Extraction
    const timestampFields = ['createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at', 'deleted_at'];
    let timestampApplicable = false;
    for (const node of nodes) {
      if (node.schema.type === 'object' && node.schema.fields) {
        const found = Object.keys(node.schema.fields).filter(f => timestampFields.includes(f));
        if (found.length >= 2) {
          timestampApplicable = true;
          break;
        }
      }
    }

    if (timestampApplicable) {
      const isDisabled = options.extractTimestamps === false;
      decisions.push({
        id: 'timestamp_inheritance',
        type: 'timestamp',
        title: 'Timestamp Inheritance',
        description: 'Automatically extracts audit trails (createdAt, updatedAt) to a common TimestampModel base class.',
        meta: {
          disabled: isDisabled
        }
      });
    }

    // Check for Wrapper Flattening
    let flatteningApplicable = false;
    for (const node of nodes) {
      if (node.schema.type === 'object' && node.schema.fields) {
        const keys = Object.keys(node.schema.fields);
        if (keys.length === 1) {
          const child = node.schema.fields[keys[0]];
          if (child.type === 'object') {
            flatteningApplicable = true;
            break;
          }
        }
      }
    }

    if (flatteningApplicable) {
      const isDisabled = options.flattenWrappers === false;
      decisions.push({
        id: 'wrapper_flattening',
        type: 'flattening',
        title: 'Flatten Single-Field Wrappers',
        description: 'Removes redundant nested single-key objects and merges their fields directly into the parent model.',
        meta: {
          disabled: isDisabled
        }
      });
    }

  } catch (e) {
    console.error('Error analyzing decisions:', e);
  }
  return decisions;
};

// Lightweight, on-demand metadata attachment.
// This is cheap and does not inspect sample values; it annotates nodes with
// simple reasons and counts so callers can request explainability without
// re-running expensive format/enum detection.
export const attachLightMeta = (schema: Schema): Schema => {
  const visit = (s?: Schema) => {
    if (!s) return;
    if (!s._meta) s._meta = {};
    if (s.type === 'object') {
      s._meta.reason = 'object';
      s._meta.fieldCount = s.fields ? Object.keys(s.fields).length : 0;
    } else if (s.type === 'array') {
      s._meta.reason = 'array';
      s._meta.itemType = s.itemType ? s.itemType.type : undefined;
    } else if (s.type === 'string') {
      s._meta.reason = 'string';
      if (s.enumValues && s.enumValues.length > 0) s._meta.enumCount = s.enumValues.length;
    } else {
      s._meta.reason = 'primitive';
    }

    if (s.fields) {
      for (const v of Object.values(s.fields)) visit(v);
    }
    if (s.itemType) visit(s.itemType);
  };
  visit(schema);
  return schema;
};

// Full metadata injection: walks the schema and inspects provided samples to
// produce richer `_meta` entries (format detection, enum values, sample counts).
export const attachFullMeta = (schema: Schema, samples: any, options: InferOptions = {}): Schema => {
  const ITEM = Symbol('item');
  // Normalize root samples to an array for easier traversal
  const rootSamples: any[] = Array.isArray(samples) ? samples : [samples];

  const collectValues = (path: Array<string | symbol>): any[] => {
    let current = rootSamples.slice();
    for (const p of path) {
      const next: any[] = [];
      if (p === ITEM) {
        for (const v of current) {
          if (Array.isArray(v)) next.push(...v);
        }
      } else {
        for (const v of current) {
          if (v && typeof v === 'object' && p in v) next.push((v as any)[p as string]);
        }
      }
      current = next;
      if (current.length === 0) break;
    }
    // Flatten nested arrays
    return current.flat(Infinity);
  };

  const detectFormats = (vals: any[]) => {
    const res: Record<string, any> = {};
    if (!vals || vals.length === 0) return res;
    const strs = vals.filter(v => typeof v === 'string').map(s => (s as string).trim()).filter(Boolean);
    if (strs.length === 0) return res;

    const total = strs.length;
    const pct = (count: number) => count / total;

    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const urlRe = /^https?:\/\/[\S]+$/;
    const dateOnlyRe = /^\d{4}-\d{2}-\d{2}$/;

    const uuidCount = strs.filter(s => uuidRe.test(s)).length;
    if (pct(uuidCount) >= 0.9) { res.format = 'uuid'; return res; }

    const emailCount = strs.filter(s => emailRe.test(s)).length;
    if (pct(emailCount) >= 0.9) { res.format = 'email'; return res; }

    const urlCount = strs.filter(s => urlRe.test(s)).length;
    if (pct(urlCount) >= 0.9) { res.format = 'url'; return res; }

    const dateOnlyCount = strs.filter(s => dateOnlyRe.test(s) && !isNaN(Date.parse(s))).length;
    if (pct(dateOnlyCount) >= 0.85) { res.format = 'date'; return res; }

    const datetimeCount = strs.filter(s => ((/^[0-9]{4}[-/]/.test(s) || (s.includes('T') && /^[0-9]/.test(s))) && !isNaN(Date.parse(s)))).length;
    if (pct(datetimeCount) >= 0.85) { res.format = 'datetime'; return res; }

    return res;
  };

  const visit = (s?: Schema, path: Array<string | symbol> = []) => {
    if (!s) return;
    if (!s._meta) s._meta = {};

    if (s.type === 'string') {
      const vals = collectValues(path);
      s._meta.sampleCount = vals.length;
      const formats = detectFormats(vals);
      if (formats.format) {
        s._meta.reason = `format:${formats.format}`;
      }

      // Enum detection using sample values
      const stringVals = vals.filter(v => typeof v === 'string').map(v => (v as string).trim()).filter(v => v !== '');
      const unique = Array.from(new Set(stringVals));
      const minSamples = options.enumMinSamples ?? 3;
      const maxUnique = options.enumMaxUnique ?? 6;
      const uniqueRatio = unique.length / Math.max(1, stringVals.length);
      // Accept enum when there are enough samples and either the unique count is small
      // or the unique ratio is low (many duplicates) to avoid false negatives on large sets
      if (stringVals.length >= minSamples && (unique.length <= maxUnique || uniqueRatio <= 0.2) && unique.length > 0) {
        s.enumValues = unique;
        s._meta.reason = s._meta.reason || 'enum_detected';
        s._meta.enumValues = unique;
      }
    }

    if (s.type === 'object' && s.fields) {
      s._meta.fieldCount = Object.keys(s.fields).length;
      for (const [k, v] of Object.entries(s.fields)) {
        visit(v, path.concat(k));
      }
    }

    if (s.type === 'array' && s.itemType) {
      // for arrays, descend into itemType and mark samples collected from array items
      visit(s.itemType, path.concat(ITEM));
      const vals = collectValues(path.concat(ITEM));
      s._meta.sampleCount = vals.length;
    }
  };

  visit(schema, []);
  return schema;
};

// Convenience wrapper: run inference in a worker thread to avoid blocking.
export const inferSchemaAsync = async (json: any, options: InferOptions = {}) => {
  try {
    if (typeof window === 'undefined') {
      const runPath = ['..','..','server','worker','runInferenceInWorker'].join('/');
      // Attempt to dynamically import the worker module (preferred) and
      // fall back to CommonJS `require` if import fails at runtime.
      const dynamicLoad = async (p: string) => {
        try {
          // Prevent some bundlers from statically analyzing this import
          // @ts-ignore
          const m = await import(/* webpackIgnore: true */ p);
          return (m && (m.runInferenceInWorker ? m : (m.default || m)));
        } catch (e) {
          if (typeof require !== 'undefined') {
            try {
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const m = require(p);
              return m;
            } catch (e2) {
              throw e;
            }
          }
          throw e;
        }
      };

      const mod = await dynamicLoad(runPath);
      const runFn = mod?.runInferenceInWorker ?? (typeof mod === 'function' ? mod : undefined);
      if (typeof runFn === 'function') {
        return await runFn(json, options);
      }
      // If worker cannot be loaded, fall back to synchronous inference
      trackInferenceFallback('worker_unavailable');
      return inferSchema(json, undefined, 0, undefined, options);
    }
    // Fallback to synchronous inference if in browser
    return inferSchema(json, undefined, 0, undefined, options);
  } catch (e) {
    trackInferenceError('infer_schema_async_error', {
      message: e instanceof Error ? e.name : 'unknown',
      stage: 'async_fallback',
    });
    // Fallback to synchronous inference on error
    return inferSchema(json, undefined, 0, undefined, options);
  }
};

export const runEngine = (json: any, lang: string, slug: string = "", options: any = {}): any => {
  try {
    const schema = json && json._isTypeMorphSchema ? json : inferSchema(json);
    extractSharedTypes(schema, options); // 共通型のハッシュ抽出＆マーク
    let out = "";
    let matchedKey = "";

    // 1. Unified Router for Slug-based and Language-based requests
    const s = (lang || slug || "").toLowerCase();
    matchedKey = s;

    const rootName: string = options.rootName ?? 'Root';
    const rootNameLower = rootName.charAt(0).toLowerCase() + rootName.slice(1);

    // Explicit Language Mappings
    if (s === 'typescript' || s === 'ts') {
      out = `/**\n * TypeMorph Generated TypeScript Interface\n */\n` + tsGen.generate(schema, rootName, options);
    } else if (s === 'zod') {
      out = `import { z } from "zod";\n\n` + zodGen.generate(schema, rootNameLower, options);
    } else if (s === 'go' || s === 'golang') {
      out = goGen.generate(schema, rootName, options);
    } else if (s === 'rust') {
      out = rustGen.generate(schema, rootName, options);
    } else if (s === 'java') {
      out = javaGen.generate(schema, rootName, options);
    } else if (s === 'python') {
      out = `from pydantic import BaseModel\n\n` + pythonGen.generate(schema, rootName, options);
    } else if (s === 'php') {
      out = `<?php\n\n` + phpGen.generate(schema, rootName, options);
    } else if (s === 'sql' || s === 'prisma') {
      out = prismaGen.generate(schema, rootName, options);
    } else if (s === 'proto' || s === 'protobuf') {
      out = `// Protocol Buffers v3 specification\n\nsyntax = "proto3";\n\n` + protoGen.generate(schema, rootName, options);
    } else if (s === 'graphql' || s === 'gql') {
      out = gqlGen.generate(schema, rootName, options);
    } 
    // Extended & Framework Specific (Slug matching)
    else if (s.includes('csv')) out = csvGen.generate(schema);
    else if (s.includes('sql-insert')) out = sqlInsertGen.generate(schema, 'table_name');
    else if (s.includes('mysql')) out = mysqlGen.generate(schema, 'Root');
    else if (s.includes('postgres')) out = postgresGen.generate(schema, 'Root');
    else if (s.includes('sqlite')) out = sqliteGen.generate(schema, 'Root');
    else if (s.includes('snowflake')) out = snowflakeGen.generate(schema, 'Root');
    else if (s.includes('mongodb') || s.includes('mongoose')) out = mongooseGen.generate(schema, 'Root');
    else if (s.includes('ruby') || s.includes('rails')) out = railsGen.generate(schema, 'Root');
    else if (s.includes('django')) out = djangoGen.generate(schema, 'Root');
    else if (s.includes('dart') || s.includes('flutter')) out = dartGen.generate(schema, 'Root', options);
    else if (s.includes('swift')) out = swiftGen.generate(schema);
    else if (s.includes('kotlin')) out = kotlinGen.generate(schema);
    else if (s.includes('csharp') || s.includes('c-sharp')) out = csharpGen.generate(schema);
    else if (s.includes('openapi')) out = openApiGen.generate(schema, 'Root');
    else if (s.includes('jsonschema')) out = jsonSchemaGen.generate(schema);
    else if (s.includes('yup')) out = yupGen.generate(schema, 'root');
    else if (s.includes('joi')) out = joiGen.generate(schema, 'root');
    else if (s.includes('valibot')) out = valibotGen.generate(schema, 'root');
    else if (s.includes('react-props')) out = reactPropsGen.generate(schema, 'Component');
    else if (s.includes('vue-props')) out = vuePropsGen.generate(schema, 'Component');
    else if (s.includes('svelte-props')) out = sveltePropsGen.generate(schema, 'Component');
    else if (s.includes('solid-props')) out = solidPropsGen.generate(schema, 'Component');
    else if (s.includes('react-context')) out = reactContextGen.generate(schema, 'Root');
    else if (s.includes('react-query')) out = reactHookGen.generate(schema, rootName);
    else if (s.includes('api-route') || s.includes('nextjs-api')) out = apiRouteGen.generate(schema, rootName);
    else if (s.includes('redux-slice')) out = reduxSliceGen.generate(schema, 'root');
    else if (s.includes('pinia')) out = piniaStoreGen.generate(schema, 'root');
    else if (s.includes('sequelize')) out = sequelizeGen.generate(schema, 'Root');
    else if (s.includes('typeorm')) out = typeormGen.generate(schema, 'Root');
    else if (s.includes('drizzle')) out = drizzleGen.generate(schema, 'Root');
    else if (s.includes('kysely')) out = kyselyGen.generate(schema, 'Root');
    else if (s.includes('superstruct')) out = superstructGen.generate(schema, 'root');
    else if (s.includes('arduino')) out = arduinoGen.generate(schema, 'Data');
    else if (s.includes('mock')) out = mockGen.generate(schema);
    else if (s.includes('ui')) out = uiGen.generate(schema, 'Component');
    else if (s.includes('asciidoc')) out = asciidocTableGen.generate(schema);
    else if (s.includes('doc')) out = docGen.generate(schema);
    else if (s.includes('avro')) out = avroGen.generate(schema, 'Root');
    else if (s.includes('toml')) out = tomlGen.generate(schema, 'config');
    else if (s.includes('yaml')) out = yamlOutputGen.generate(schema);
    else if (s.includes('env')) out = envGen.generate(schema);
    else if (s.includes('properties')) out = propertiesGen.generate(schema);
    else if (s.includes('markdown')) out = markdownTableGen.generate(schema);
    else if (s.includes('latex')) out = latexTableGen.generate(schema);
    else if (s.includes('mermaid')) out = mermaidERGen.generate(schema, 'Root');
    else if (s.includes('bigquery')) out = bigQueryGen.generate(schema);
    else if (s.includes('dynamodb')) out = dynamoDBGen.generate(schema, 'Root');
    else if (s.includes('postman')) out = postmanGen.generate(schema);
    else if (s.includes('http')) out = httpFileGen.generate(schema);
    else if (s.includes('vscode')) out = vscodeSnippetGen.generate(schema);
    else if (s.includes('curl')) out = curlOutputGen.generate(schema);
    else if (s.includes('cobol')) out = cobolGen.generate(schema, 'ROOT');
    else if (s.includes('clojure')) out = clojureGen.generate(schema, 'Root');
    else if (s.includes('elixir')) out = elixirGen.generate(schema, 'Root');
    else if (s.includes('elm')) out = elmGen.generate(schema, 'Root');
    else if (s.includes('godot') || s.includes('gdscript')) out = godotGen.generate(schema, 'Root');
    else if (s.includes('haskell')) out = haskellGen.generate(schema, 'Root');
    else if (s.includes('r-lang') || s === 'r') { out = rGen.generate(schema, 'Root'); matchedKey = 'r-lang'; }
    else if (s.includes('scala')) out = scalaGen.generate(schema, 'Root');
    else if (s.includes('solidity')) out = solidityGen.generate(schema, 'Root');

    // Whether the requested target matched a known generator branch above.
    // (Used to avoid mislabelling a *recognised* target that legitimately produced
    //  an empty string — e.g. an empty input — as "unsupported".)
    const KNOWN_TARGETS_EXACT = new Set(['typescript', 'ts', 'zod', 'go', 'golang', 'rust', 'java', 'python', 'php', 'sql', 'prisma', 'proto', 'protobuf', 'graphql', 'gql', 'json', 'r']);
    const KNOWN_TARGET_SUBSTR = ['csv', 'sql-insert', 'mysql', 'postgres', 'sqlite', 'snowflake', 'mongodb', 'mongoose', 'ruby', 'rails', 'django', 'dart', 'flutter', 'swift', 'kotlin', 'csharp', 'c-sharp', 'openapi', 'jsonschema', 'yup', 'joi', 'valibot', 'react-props', 'vue-props', 'svelte-props', 'solid-props', 'react-context', 'react-query', 'api-route', 'nextjs-api', 'redux-slice', 'pinia', 'sequelize', 'typeorm', 'drizzle', 'kysely', 'superstruct', 'arduino', 'mock', 'ui', 'doc', 'avro', 'toml', 'yaml', 'env', 'properties', 'markdown', 'asciidoc', 'latex', 'mermaid', 'bigquery', 'dynamodb', 'postman', 'http', 'vscode', 'curl', 'cobol', 'clojure', 'elixir', 'elm', 'godot', 'gdscript', 'haskell', 'r-lang', 'scala', 'solidity'];
    const targetMatched = KNOWN_TARGETS_EXACT.has(s) || KNOWN_TARGET_SUBSTR.some(k => s.includes(k));

    // Explicit JSON output when requested, otherwise surface unsupported targets.
    if (s === 'json') {
      out = JSON.stringify(json, null, 2);
    } else if (!out && targetMatched) {
      // Target was recognised but produced no output (e.g. empty/array-less input).
      out = `// No output generated for "${lang || slug || s}". The input may be empty or lack the structure this format expects.`;
    } else if (!out) {
      matchedKey = 'unsupported';
      trackUnsupportedOutputTarget(lang || slug || 'unknown', s);
      out = `// Unsupported output target: "${lang || slug || 'unknown'}"
// Supported targets include: typescript, zod, go, rust, java, python, php, sql, protobuf, graphql, swift, kotlin, jsonschema, mock, ui, doc, openapi, yup, joi, valibot, react-props, vue-props, svelte-props, solid-props, react-context, redux-slice, pinia, sequelize, typeorm, drizzle, kysely, superstruct, arduino, clojure, elixir, elm, godot, haskell, r, scala, solidity
`;
    }

    // 3. Find dependencies comment
    let depHeader = "";
    const lowerKey = matchedKey.toLowerCase();
    for (const [k, comment] of Object.entries(DEPENDENCY_COMMENTS)) {
      if (lowerKey === k) {
        depHeader = comment;
        break;
      }
    }

    const finalCode = depHeader ? depHeader + out : out;
    return cleanAndFormatCode(finalCode);
  } catch (e) { return "// Error: " + String(e); }
};
