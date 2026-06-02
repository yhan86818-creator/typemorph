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
import { createHash } from 'crypto';
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
  const aTypes = a.type === 'union' ? (a.unionTypes ?? []) : [a.type];
  const bTypes = b.type === 'union' ? (b.unionTypes ?? []) : [b.type];
  const merged = Array.from(new Set([...aTypes, ...bTypes]));
  // If all types are still the same single type, collapse back
  if (merged.length === 1) return { type: merged[0] };
  return { type: 'union', unionTypes: merged };
};

// Default tunable parameters
const MAX_DEPTH = 20;
export interface InferOptions {
  maxDepth?: number;
  enumMinSamples?: number; // minimum number of samples to consider enum
  enumMaxUnique?: number;  // maximum unique values to treat as enum
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
      return { ...makeUnion(s1, s2), optional, nullable };
    }
    // Incompatible complex types (e.g. object vs array) → any
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

const isKeyEnum = (key: string, values: string[], options?: InferOptions): boolean => {
  if (values.length === 0) return false;
  
  // 1. 強力なキーワードマッチ
  const k = key.toLowerCase();
  const enumKeywords = ['status', 'type', 'role', 'gender', 'state', 'category', 'mode', 'level', 'phase', 'kind', 'visibility', 'scope', 'method', 'action', 'currency', 'priority'];
  if (enumKeywords.some(kw => k.includes(kw))) {
    return true;
  }
  
  // 2. 統計的判断：要素数が十分あり（3つ以上）、かつ値に重複があるか？
  const unique = new Set(values);
  const minSamples = options?.enumMinSamples ?? 3;
  const maxUnique = options?.enumMaxUnique ?? 6;
  if (values.length >= minSamples && unique.size < values.length) {
    if (unique.size <= maxUnique) {
      return true;
    }
  }
  
  // 3. 極めて限定的な共通の定数値
  const commonConstants = new Set(['yes', 'no', 'true', 'false', 'get', 'post', 'put', 'delete', 'active', 'inactive', 'pending', 'success', 'error', 'failed']);
  if (values.every(v => commonConstants.has(v.toLowerCase()))) {
    return true;
  }
  
  return false;
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

    let indices: number[] = [];
    if (len <= threshold) {
      indices = Array.from({ length: len }, (_, i) => i);
    } else {
      const prefix = Math.min(prefixSample, len);
      indices = Array.from({ length: prefix }, (_, i) => i);
      const remaining = Math.max(0, Math.min(sampleCount - prefix, len - prefix));
      if (remaining > 0) {
        const step = (len - prefix) / remaining;
        for (let j = 0; j < remaining; j++) {
          const idx = Math.min(len - 1, Math.floor(prefix + j * step));
          if (!indices.includes(idx)) indices.push(idx);
        }
      }
    }

    const sampledItems = indices.map(i => val[i]);

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
      const enumKeywords = ['status', 'type', 'role', 'gender', 'state', 'category', 'mode', 'level', 'phase', 'kind', 'visibility', 'scope', 'method', 'action', 'currency', 'priority'];
      
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

  return addMeta({ type: typeof val }, 'primitive');
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

  const pairKey = `${s1._structureHash || ''}-${s2._structureHash || ''}`;
  if (visited.has(pairKey)) return true;
  visited.add(pairKey);

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
      if (t.type === 'any') {
        target.fields[k] = { ...v };
      } else if (t.type === 'object' && v.type === 'object') {
        mergeIsomorphicObjects(t, v);
      } else if (t.type === 'array' && t.itemType && v.type === 'array' && v.itemType) {
        if (t.itemType.type === 'any') {
          t.itemType = { ...v.itemType };
        } else if (t.itemType.type === 'object' && v.itemType.type === 'object') {
          mergeIsomorphicObjects(t.itemType, v.itemType);
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

  const prefix = options.sharedPrefix !== undefined ? options.sharedPrefix : 'Shared';

  // 1. 構造的同型性に基づくグループ化
  const isomorphicGroups: Schema[][] = [];
  
    for (const node of nodes) {
    let foundGroup = false;
    for (const group of isomorphicGroups) {
      if (areFieldsIsomorphic(node.schema, group[0], new Set(), options as any)) {
        group.push(node.schema);
        foundGroup = true;
        break;
      }
    }
    if (!foundGroup) {
      isomorphicGroups.push([node.schema]);
    }
  }

  const sharedNames = new Set<string>();
  let sharedCounter = 1;

  // 2. 2回以上出現する、または再帰構造を持つグループに対して共通定義を展開
  for (const group of isomorphicGroups) {
    if (group.length >= 2) {
      // フィールド数が最も多く定義されている代表ノードを選択
      group.sort((a, b) => Object.keys(b.fields || {}).length - Object.keys(a.fields || {}).length);
      const rep = group[0];

      // 代表となるノードの命名推論
      const repNode = nodes.find(n => n.schema === rep) || nodes.find(n => group.includes(n.schema));
      const representativeKey = repNode?.parentKey || 'Object';
      
      let semanticName = "";
      const fieldNames = Object.keys(rep.fields || {});
      
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
        // Collect all parent keys in this group
        const allParentKeys = group.map(s => nodes.find(n => n.schema === s)?.parentKey).filter(k => k && k !== 'Root' && k !== 'Object') as string[];
        let bestKey = representativeKey;
        
        // Find a representative key that isn't too specific (like 'ceo' or 'manager')
        if (allParentKeys.length > 0) {
          // Find shortest key to encourage abstract names (e.g. 'staff' over 'manager')
          bestKey = allParentKeys.sort((a, b) => a.length - b.length)[0];
          // Plural check (if it ends with s, make it singular)
          if (bestKey.endsWith('s') && bestKey !== 'status' && bestKey !== 'address') {
            bestKey = bestKey.slice(0, -1);
          }
        }
        
        const camelKey = bestKey.replace(/(^\w|_\w)/g, m => m.replace(/_/, '').toUpperCase());
        semanticName = prefix ? `${prefix}${camelKey}` : camelKey;
      }
      
      let finalName = semanticName;
      while (sharedNames.has(finalName)) {
        finalName = `${semanticName}${sharedCounter++}`;
      }

      // もしこの共通型名が disabledUnifications に入っていたら、このグループの共通化をスキップ！
      if (options.disabledUnifications?.includes(finalName)) {
        continue;
      }

      // もしこの共通型名にカスタム名が指定されていたら、そちらを採用！
      if (options.customTypeNames && options.customTypeNames[finalName]) {
        finalName = options.customTypeNames[finalName];
      }
      
      sharedNames.add(finalName);
      
      // グループ内の他のすべてのフィールド定義を代表ノードにマージ
      for (let i = 1; i < group.length; i++) {
        mergeIsomorphicObjects(rep, group[i]);
      }

      // 同一グループ内の参照フィールドを完全に同期
      for (let i = 1; i < group.length; i++) {
        group[i].fields = rep.fields;
      }
      
      // グループ内の全スキーマに共通名を設定
      for (const s of group) {
        s._sharedTypeName = finalName;
      }
    }
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
    
    const prefix = options.sharedPrefix !== undefined ? options.sharedPrefix : 'Shared';
    const isomorphicGroups: Schema[][] = [];
    for (const node of nodes) {
      let foundGroup = false;
      for (const group of isomorphicGroups) {
        if (areFieldsIsomorphic(node.schema, group[0], new Set(), options as any)) {
          group.push(node.schema);
          foundGroup = true;
          break;
        }
      }
      if (!foundGroup) {
        isomorphicGroups.push([node.schema]);
      }
    }

    const sharedNames = new Set<string>();
    let sharedCounter = 1;

    for (const group of isomorphicGroups) {
      if (group.length >= 2) {
        group.sort((a, b) => Object.keys(b.fields || {}).length - Object.keys(a.fields || {}).length);
        const rep = group[0];
        const repNode = nodes.find(n => n.schema === rep) || nodes.find(n => group.includes(n.schema));
        const representativeKey = repNode?.parentKey || 'Object';
        
        let semanticName = "";
        const fieldNames = Object.keys(rep.fields || {});
        
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
          const allParentKeys = group.map(s => nodes.find(n => n.schema === s)?.parentKey).filter(k => k && k !== 'Root' && k !== 'Object') as string[];
          let bestKey = representativeKey;
          if (allParentKeys.length > 0) {
            bestKey = allParentKeys.sort((a, b) => a.length - b.length)[0];
            if (bestKey.endsWith('s') && bestKey !== 'status' && bestKey !== 'address') {
              bestKey = bestKey.slice(0, -1);
            }
          }
          const camelKey = bestKey.replace(/(^\w|_\w)/g, m => m.replace(/_/, '').toUpperCase());
          semanticName = prefix ? `${prefix}${camelKey}` : camelKey;
        }
        
        let finalName = semanticName;
        while (sharedNames.has(finalName)) {
          finalName = `${semanticName}${sharedCounter++}`;
        }
        sharedNames.add(finalName);

        const isRenamed = options.customTypeNames && !!options.customTypeNames[finalName];
        const displayName = isRenamed ? options.customTypeNames[finalName] : finalName;
        const isDisabled = !!options.disabledUnifications?.includes(finalName);

        decisions.push({
          id: `unify_${finalName}`,
          type: 'unification',
          title: `Unify similar objects as ${displayName}`,
          description: `Detected ${group.length} objects with similar fields. Unified them into ${displayName} to avoid duplicate class definitions.`,
          meta: {
            semanticName: displayName,
            originalName: finalName,
            count: group.length,
            fields: Object.keys(rep.fields || {}),
            disabled: isDisabled
          }
        });
      }
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
    const strs = vals.filter(v => typeof v === 'string');
    if (strs.length === 0) return res;
    // UUID
    if (strs.every(s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s))) res.format = 'uuid';
    // email
    else if (strs.every(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))) res.format = 'email';
    // url
    else if (strs.every(s => /^https?:\/\/[\S]+$/.test(s))) res.format = 'url';
    // date / datetime
    else if (strs.every(s => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)))) res.format = 'date';
    else if (strs.every(s => (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(s) || (/^\d/.test(s) && s.includes('T'))) && !isNaN(Date.parse(s)))) res.format = 'datetime';
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
      const stringVals = vals.filter(v => typeof v === 'string').map(v => v.trim()).filter(v => v !== '');
      const unique = Array.from(new Set(stringVals));
      const minSamples = options.enumMinSamples ?? 3;
      const maxUnique = options.enumMaxUnique ?? 6;
      if (stringVals.length >= minSamples && unique.length <= maxUnique && unique.length > 0) {
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
    const runPath = ['..','..','server','worker','runInferenceInWorker'].join('/');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { runInferenceInWorker } = require(runPath) as { runInferenceInWorker: (j: unknown, o: unknown) => Promise<unknown> };
    return await runInferenceInWorker(json, options);
  } catch (e) {
    // Fallback to synchronous inference
    return inferSchema(json, undefined, 0, undefined, options);
  }
};

export const runEngine = (json: any, lang: string, slug: string = "", options: any = {}): any => {
  try {
    const schema = inferSchema(json);
    extractSharedTypes(schema, options); // 共通型のハッシュ抽出＆マーク
    let out = "";
    let matchedKey = "";

    // 1. Unified Router for Slug-based and Language-based requests
    const s = (slug || lang || "").toLowerCase();
    matchedKey = s;

    // Explicit Language Mappings
    if (s === 'typescript' || s === 'ts') {
      out = `/**\n * TypeFlow Generated TypeScript Interface\n */\n` + tsGen.generate(schema, 'Root', options);
    } else if (s === 'zod') {
      out = `import { z } from "zod";\n\n` + zodGen.generate(schema, 'root', options);
    } else if (s === 'go' || s === 'golang') {
      out = goGen.generate(schema, 'Root', options);
    } else if (s === 'rust') {
      out = rustGen.generate(schema, 'Root', options);
    } else if (s === 'java') {
      out = javaGen.generate(schema, 'Root', options);
    } else if (s === 'python') {
      out = `from pydantic import BaseModel\n\n` + pythonGen.generate(schema, 'Root', options);
    } else if (s === 'php') {
      out = `<?php\n\n` + phpGen.generate(schema, 'Root', options);
    } else if (s === 'sql' || s === 'prisma') {
      out = prismaGen.generate(schema, 'Root', options);
    } else if (s === 'proto' || s === 'protobuf') {
      out = `// Protocol Buffers v3 specification\n\nsyntax = "proto3";\n\n` + protoGen.generate(schema, 'Root', options);
    } else if (s === 'graphql' || s === 'gql') {
      out = gqlGen.generate(schema, 'Root', options);
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
    else if (s.includes('arduino')) out = arduinoGen.generate(schema, 'Data');
    else if (s.includes('mock')) out = mockGen.generate(schema);
    else if (s.includes('ui')) out = uiGen.generate(schema, 'Component');
    else if (s.includes('doc')) out = docGen.generate(schema);
    else if (s.includes('avro')) out = avroGen.generate(schema, 'Root');
    else if (s.includes('toml')) out = tomlGen.generate(schema, 'config');
    else if (s.includes('yaml')) out = yamlOutputGen.generate(schema);

    // Fallback to JSON if still not processed
    if (!out) {
      matchedKey = 'json';
      out = JSON.stringify(val, null, 2);
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

    const finalCode = depHeader ? depHeader + out : out;
    return cleanAndFormatCode(finalCode);
  } catch (e) { return "// Error: " + String(e); }
};
