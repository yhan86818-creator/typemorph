import { Schema, ASTType, ASTClass } from './types';
import { schemaToAST, rootArrayItemClassName, convertToASTType } from './ast';

const toPascalCase = (str: string) => str.replace(/(^\w|_\w)/g, m => m.replace(/_/, '').toUpperCase());

// annotations から継承元クラス名を取り出すヘルパー
const getBaseClass = (cls: ASTClass): string | null => {
  const ann = cls.annotations?.find(a => a.startsWith('extends '));
  return ann ? ann.slice('extends '.length) : null;
};

const toCamelCase = (str: string) => {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

// ---------------------------------------------------------------------------
// Discriminated Union helpers
// ---------------------------------------------------------------------------
// Returns a map of { finalASTClassName → { discriminatorField, variants } }
// for every array in the schema whose items form a detected discriminated union.
const computeItemName = (arraySchema: Schema, parentName: string): string => {
  const shared = arraySchema.itemType?._sharedTypeName;
  if (shared) return toPascalCase(shared);
  if (parentName.endsWith('ies')) return toPascalCase(parentName.slice(0, -3) + 'y');
  if (parentName.endsWith('s'))   return toPascalCase(parentName.slice(0, -1));
  if (parentName.endsWith('List')) return toPascalCase(parentName.slice(0, -4));
  return toPascalCase(parentName + 'Item');
};

const findDiscriminatedSchemas = (
  schema: Schema,
  rootName: string
): Map<string, { discriminatorField: string; variants: Record<string, Schema> }> => {
  const result = new Map<string, { discriminatorField: string; variants: Record<string, Schema> }>();
  const pascalRoot = toPascalCase(rootName);

  const register = (arraySchema: Schema, parentName: string) => {
    const it = arraySchema.itemType;
    if (it?.discriminatorField && it?.discriminatedVariants) {
      result.set(computeItemName(arraySchema, parentName), {
        discriminatorField: it.discriminatorField,
        variants: it.discriminatedVariants,
      });
    }
  };

  // Root-level array
  if (schema.type === 'array') {
    register(schema, pascalRoot);
  }

  // Direct object fields that are arrays
  if (schema.type === 'object' && schema.fields) {
    for (const [k, v] of Object.entries(schema.fields)) {
      if (v.type === 'array') {
        const parentCls = v._sharedTypeName ? toPascalCase(v._sharedTypeName) : toPascalCase(pascalRoot + '_' + k);
        register(v, parentCls);
      }
    }
  }

  return result;
};

// ASTType を TypeScript の文法文字列にプリンタ出力するヘルパー
const printASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union':
      return type.unionTypes ? type.unionTypes.join(' | ') : 'any';
    case 'enum':
      return type.enumValues ? type.enumValues.map(ev => `"${ev}"`).join(' | ') : 'string';
    case 'date':
    case 'datetime':
      return 'Date';
    case 'classRef':
      return type.classRefName ?? 'any';
    case 'array':
      if (type.itemType) {
        const sub = printASTType(type.itemType);
        // ユニオンやエナムの場合は括弧で囲む
        if (type.itemType.kind === 'union' || type.itemType.kind === 'enum') {
          return `(${sub})[]`;
        }
        return `${sub}[]`;
      }
      return 'any[]';
    case 'record':
      return `Record<string, ${type.recordValueType ? printASTType(type.recordValueType) : 'any'}>`;
    case 'tuple':
      return `[${(type.tupleTypes ?? []).map(t => printASTType(t)).join(', ')}]`;
    default:
      return type.kind; // string, number, boolean, any
  }
};

// Existing Generators (Improved)
export const tsGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    // Pre-compute discriminated union schemas to replace merged interfaces
    const discriminatedMap = findDiscriminatedSchemas(schema, name);

    // 1. スキーマを AST へ一括コンパイル
    const astClasses = schemaToAST(schema, name, options);
    let res = "";

    // 0. トップレベルが配列の場合は配列ラッパー型エイリアスを出力（要素型情報の欠落を防止）
    {
      if (schema.type === 'array' && schema.itemType) {
        const itemName = rootArrayItemClassName(schema, name);
        const hasItemClass = itemName ? astClasses.some(c => c.name === itemName) : false;
        if (hasItemClass) {
          res += `export type ${toPascalCase(name)} = ${itemName}[];\n\n`;
        } else {
          const itemAst = convertToASTType(schema.itemType, name, 'Item');
          res += `export type ${toPascalCase(name)} = ${printASTType(itemAst)}[];\n\n`;
        }
      }
    }

    // 2. 平坦化されたクラスを順番に出力（再帰は不要！）
    for (const cls of astClasses) {
      const du = discriminatedMap.get(cls.name);
      if (du) {
        // Discriminated union: emit one interface per variant + a union type alias
        for (const [value, variantSchema] of Object.entries(du.variants)) {
          const suffix = toPascalCase(value);
          const variantInterfaceName = `${cls.name}${suffix}`;
          res += `export interface ${variantInterfaceName} {\n`;
          for (const [fk, fv] of Object.entries(variantSchema.fields ?? {})) {
            if (fk === du.discriminatorField) {
              res += `  ${safeKey(fk)}: "${value}";\n`;
            } else {
              const fvAst = convertToASTType(fv, variantInterfaceName, fk);
              const tsType = printASTType(fvAst);
              const optMark = fv.optional ? '?' : '';
              const nullSuffix = fv.nullable ? ' | null' : '';
              res += `  ${safeKey(fk)}${optMark}: ${tsType}${nullSuffix};\n`;
            }
          }
          res += `}\n\n`;
        }
        const variantNames = Object.keys(du.variants).map(v => `${cls.name}${toPascalCase(v)}`);
        res += `export type ${cls.name} = ${variantNames.join(' | ')};\n\n`;
        continue;
      }

      // Normal interface output
      const baseClass = getBaseClass(cls);
      const extendsStr = baseClass ? ` extends ${baseClass}` : "";

      const exportKeyword = (options.exportDefault && cls.name === 'Root')
        ? `export default interface ${cls.name}${extendsStr}`
        : `export interface ${cls.name}${extendsStr}`;

      res += `${exportKeyword} {\n`;
      const forceOptional = options.optionalFields;

      for (const field of cls.fields) {
        const optMark = (forceOptional || field.isOptional) ? '?' : '';
        const customKey = `${cls.name}.${field.name}`;
        const displayName = (options.customFieldNames as Record<string, string>)?.[customKey] ?? field.name;

        let tsType = printASTType(field.fieldType);
        if (field.isNullable) {
          tsType = tsType.includes(' | ') ? `(${tsType}) | null` : `${tsType} | null`;
        }

        res += `  ${safeKey(displayName)}${optMark}: ${tsType};\n`;
      }
      res += `}\n\n`;
    }

    return res;
  }
};

// Topological sort: ensures referenced schemas are output before the schemas that use them.
// This prevents ReferenceError caused by `const` forward references in TypeScript/JS.
// It also strictly detects cycles and returns a set of fields that must be lazy-evaluated.
const topoSortForZod = (classes: ASTClass[]): { sorted: ASTClass[], cyclicClassRefs: Set<string> } => {
  const nameToClass = new Map<string, ASTClass>(classes.map(c => [c.name, c]));
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const sorted: ASTClass[] = [];
  const cyclicClassRefs = new Set<string>();

  const getClassRefs = (type: ASTType): string[] => {
    if (type.kind === 'classRef' && type.classRefName) return [type.classRefName];
    if (type.kind === 'array' && type.itemType) return getClassRefs(type.itemType);
    if (type.kind === 'record' && type.recordValueType) return getClassRefs(type.recordValueType);
    if (type.kind === 'tuple' && type.tupleTypes) return type.tupleTypes.flatMap(getClassRefs);
    if (type.kind === 'union' && type.unionTypes) {
      // unionTypes in AST only hold primitive strings (ASTTypeKind), so they never contain classRefs.
      return [];
    }
    return [];
  };

  const visit = (cls: ASTClass) => {
    if (visited.has(cls.name)) return;
    if (visiting.has(cls.name)) return;
    visiting.add(cls.name);

    // Visit base class (extends) first
    const baseName = getBaseClass(cls);
    if (baseName) {
      const dep = nameToClass.get(baseName);
      if (dep) {
        if (!visiting.has(baseName)) visit(dep);
      }
    }

    // Visit classRef field dependencies
    for (const field of cls.fields) {
      for (const ref of getClassRefs(field.fieldType)) {
        if (visiting.has(ref)) {
          // Detected a cycle! This specific classRef must be wrapped in z.lazy()
          cyclicClassRefs.add(ref);
        } else {
          const dep = nameToClass.get(ref);
          if (dep) visit(dep);
        }
      }
    }

    visiting.delete(cls.name);
    visited.add(cls.name);
    sorted.push(cls);
  };

  for (const cls of classes) visit(cls);
  return { sorted, cyclicClassRefs };
};

// Zod型表現を出力するプリンタヘルパー。
// printZodASTType はラッパーで、生成された基本型に対し R4 で保存した raw 制約
// (.min/.max/.regex/.default/.describe 等) を末尾に再付与する。
const printZodASTType = (type: ASTType, cyclicClassRefs: Set<string>, options: any = {}): string => {
  const base = printZodASTTypeBase(type, cyclicClassRefs, options);
  return type.refinements?.length ? base + type.refinements.join('') : base;
};
const printZodASTTypeBase = (type: ASTType, cyclicClassRefs: Set<string>, options: any = {}): string => {
  // Verbatim Zod expression (e.g. unresolvable z.nativeEnum) — re-emit exactly.
  if (type.rawZodType) return type.rawZodType;
  // Parsed z.literal(...) — re-emit the exact value rather than widening to the base type.
  if (type.literalValue !== undefined) {
    const v = type.literalValue;
    return `z.literal(${typeof v === 'string' ? JSON.stringify(v) : v})`;
  }
  switch (type.kind) {
    case 'union': {
      if (!type.unionTypes || type.unionTypes.length === 0) return 'z.any()';
      const parts = type.unionTypes.map(t => {
        // unionTypes is an array of ASTTypeKind (strings), we wrap it in an ASTType object for the recursive call
        return printZodASTType({ kind: t } as ASTType, cyclicClassRefs, options);
      });
      if (parts.length === 1) return parts[0];
      return `z.union([${parts.join(', ')}])`;
    }
    case 'enum':
      if (!type.enumValues || type.enumValues.length === 0) return 'z.string()';
      // P2: a single observed value is weak evidence for an enum — z.literal("active")
      // would reject every other valid value (pending, cancelled…). Emit z.string()
      // instead; supplying multiple samples promotes it to a real z.enum([...]).
      // (Discriminated-union discriminators emit z.literal via a separate code path.)
      if (type.enumValues.length === 1) return 'z.string()';
      return `z.enum([${type.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
    case 'date':
      return options.zodVersion === 'v3' ? 'z.coerce.date()' : 'z.iso.date()';
    case 'datetime':
      return options.zodVersion === 'v3' ? 'z.string().datetime()' : 'z.iso.datetime()';
    case 'classRef': {
      if (!type.classRefName) return 'z.any()';
      const core = `${toCamelCase(type.classRefName)}Schema`;
      // Use z.lazy() if this reference causes a cycle, avoiding ReferenceError
      return cyclicClassRefs.has(type.classRefName) ? `z.lazy(() => ${core})` : core;
    }
    case 'array':
      if (type.itemType) {
        const sub = printZodASTType(type.itemType, cyclicClassRefs, options);
        return `z.array(${sub})`;
      }
      return 'z.array(z.any())';
    case 'record': {
      const val = type.recordValueType
        ? printZodASTType(type.recordValueType, cyclicClassRefs, options)
        : 'z.any()';
      return options.zodVersion === 'v3' ? `z.record(${val})` : `z.record(z.string(), ${val})`;
    }
    case 'tuple': {
      if (!type.tupleTypes || type.tupleTypes.length === 0) return 'z.array(z.any())';
      const items = type.tupleTypes.map(t => printZodASTType(t, cyclicClassRefs, options));
      return `z.tuple([${items.join(', ')}])`;
    }
    case 'string':
      if (type.coerced) return 'z.coerce.string()';
      if (type.format === 'email') return options.zodVersion === 'v3' ? 'z.string().email()' : 'z.email()';
      if (type.format === 'url') return options.zodVersion === 'v3' ? 'z.string().url()' : 'z.url()';
      if (type.format === 'uuid') return options.zodVersion === 'v3' ? 'z.string().uuid()' : 'z.uuid()';
      if (type.format === 'color') return 'z.string().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)';
      return 'z.string()';
    case 'number':
      if (type.coerced) return 'z.coerce.number()';
      return options.zodMode === 'loose' ? 'z.coerce.number()' : 'z.number()';
    case 'boolean':
      if (type.coerced) return 'z.coerce.boolean()';
      return 'z.boolean()';
    default:
      return 'z.any()';
  }
};

// Converts ASTType to a plain TypeScript type string.
// Used only for self-referential (cyclic) schemas where an explicit type annotation
// is required before the Zod schema definition so that TypeScript can resolve the
// circular reference without inferring through the schema initializer (TS7022).
const printTSTypeForZod = (type: ASTType): string => {
  switch (type.kind) {
    case 'string':
    case 'date':
    case 'datetime':
      return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'classRef': return type.classRefName ?? 'unknown';
    case 'array': return type.itemType ? `${printTSTypeForZod(type.itemType)}[]` : 'unknown[]';
    case 'record':
      return `Record<string, ${type.recordValueType ? printTSTypeForZod(type.recordValueType) : 'unknown'}>`;
    case 'tuple':
      return `[${(type.tupleTypes ?? []).map(t => printTSTypeForZod(t)).join(', ')}]`;
    case 'union':
      return type.unionTypes?.map(t => printTSTypeForZod({ kind: t } as ASTType)).join(' | ') ?? 'unknown';
    case 'enum':
      return type.enumValues?.map(v => `"${v}"`).join(' | ') ?? 'string';
    default: return 'unknown';
  }
};

// Object keys that aren't valid JS identifiers (kebab-case headers like
// "content-type", keys starting with a digit, keys with spaces/dots, etc.) must
// be quoted, or the generated TypeScript/Zod fails to parse. JSON.stringify
// produces a correctly-escaped double-quoted key for any string.
const safeKey = (name: string): string =>
  /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name) ? name : JSON.stringify(name);

// Splits a field name into lowercase word tokens, honoring snake_case, kebab-case,
// spaces, and camelCase boundaries. Used so name-based heuristics match whole
// words ("count" in "follower_count" / "itemCount") without false positives on
// substrings ("discount", "account", "page", "message", "usage").
const fieldWords = (name: string): string[] =>
  name.split(/[_\-\s]+|(?<=[a-z0-9])(?=[A-Z])/).map(w => w.toLowerCase()).filter(Boolean);

export const zodGen = {
  generate: (schema: Schema, name: string = 'root', options: any = {}): string => {
    const mode: 'loose' | 'strict' | 'enterprise' = options.zodMode ?? 'strict';
    const isLoose = mode === 'loose';
    const isEnterprise = mode === 'enterprise';
    const isV3 = options.zodVersion === 'v3';
    const zEmail = isV3 ? 'z.string().email()' : 'z.email()';
    const zUrl = isV3 ? 'z.string().url()' : 'z.url()';
    const zUuid = isV3 ? 'z.string().uuid()' : 'z.uuid()';
    const modeOptions = { ...options, zodMode: mode };

    // Pre-compute discriminated union schemas
    const discriminatedMap = findDiscriminatedSchemas(schema, toPascalCase(name));

    // 1. スキーマを AST へ一括コンパイル
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    // 2. 各クラス（構造体）に対応する Zod スキーマを平坦に出力
    const { sorted: sortedClasses, cyclicClassRefs } = topoSortForZod(astClasses);
    for (const cls of sortedClasses) {
      const du = discriminatedMap.get(cls.name);
      if (du) {
        // Discriminated union: emit z.literal() per variant + z.discriminatedUnion()
        const variantSchemaVarNames: string[] = [];
        for (const [value, variantSchema] of Object.entries(du.variants)) {
          const suffix = toPascalCase(value);
          const variantCamel = toCamelCase(cls.name) + suffix;
          const variantPascal = cls.name + suffix;
          variantSchemaVarNames.push(`${variantCamel}Schema`);

          res += `export const ${variantCamel}Schema = z.object({\n`;
          for (const [fk, fv] of Object.entries(variantSchema.fields ?? {})) {
            if (fk === du.discriminatorField) {
              res += `  ${safeKey(fk)}: z.literal("${value}"),\n`;
            } else {
              const fvAst = convertToASTType(fv, variantPascal, fk);
              let zType = printZodASTType(fvAst, cyclicClassRefs, modeOptions);
              if (fv.nullable) zType += '.nullable()';
              if (isLoose || fv.optional) zType += '.optional()';
              res += `  ${safeKey(fk)}: ${zType},\n`;
            }
          }
          res += `});\n`;
          res += `export type ${variantPascal} = z.infer<typeof ${variantCamel}Schema>;\n\n`;
        }
        const clsCamel = toCamelCase(cls.name);
        res += `export const ${clsCamel}Schema = z.discriminatedUnion("${du.discriminatorField}", [\n`;
        for (const vn of variantSchemaVarNames) {
          res += `  ${vn},\n`;
        }
        res += `]);\n`;
        res += `export type ${cls.name} = z.infer<typeof ${clsCamel}Schema>;\n\n`;
        continue;
      }

      // Normal Zod schema output
      const camelName = toCamelCase(cls.name);
      const baseClass = getBaseClass(cls);
      const baseCamel = baseClass ? toCamelCase(baseClass) : null;

      // Self-referential schemas require an explicit TypeScript type declared BEFORE
      // the Zod schema, and a z.ZodType<T> annotation on the const, so tsc can resolve
      // the circular reference without triggering TS7022 (implicit 'any' inference).
      const isCyclic = cyclicClassRefs.has(cls.name);
      if (isCyclic) {
        res += `export type ${cls.name} = {\n`;
        for (const cycField of cls.fields) {
          const tsType = printTSTypeForZod(cycField.fieldType);
          const opt = (cycField.isOptional || isLoose) ? '?' : '';
          const nullable = cycField.isNullable ? ' | null' : '';
          res += `  ${safeKey(cycField.name)}${opt}: ${tsType}${nullable};\n`;
        }
        res += `};\n\n`;
      }

      const schemaTypeAnn = isCyclic ? `: z.ZodType<${cls.name}>` : '';
      if (baseCamel) {
        res += `export const ${camelName}Schema${schemaTypeAnn} = ${baseCamel}Schema.extend({\n`;
      } else {
        res += `export const ${camelName}Schema${schemaTypeAnn} = z.object({\n`;
      }

      for (const field of cls.fields) {
        const isOpt = (options.optionalFields || field.isOptional || isLoose) ? '.optional()' : '';
        const isNull = field.isNullable ? '.nullable()' : '';
        let zType = printZodASTType(field.fieldType, cyclicClassRefs, modeOptions);

        // Name-based validation: skipped in loose mode
        const customKey = `${cls.name}.${field.name}`;
        const displayName = (options.customFieldNames as Record<string, string>)?.[customKey] ?? field.name;
        const k = displayName.toLowerCase();
        const words = fieldWords(displayName);
        const hasWord = (...ws: string[]) => ws.some(w => words.includes(w));
        // Skip name-based constraint inference when the field already carries explicit
        // refinements preserved from a parsed Zod schema (R4) — the user's own
        // constraints win and must not be doubled up.
        if (!isLoose && !field.fieldType.refinements?.length) {
          if (field.fieldType.kind === 'number') {
            if (k.includes('percent')) {
              zType += '.min(0).max(100)';
            } else if (k.includes('latitude') || k === 'lat' || k.endsWith('_lat')) {
              zType += '.min(-90).max(90)';
            } else if (k.includes('longitude') || k === 'lng' || k === 'lon' || k.endsWith('_lng') || k.endsWith('_lon')) {
              zType += '.min(-180).max(180)';
            } else if (k.includes('rating')) {
              zType += '.min(0).max(5)';
            } else if (k.includes('score')) {
              zType += '.min(0).max(100)';
            } else if (hasWord('age')) {
              zType += '.int().min(0).max(150)';
            } else if (k.includes('year')) {
              zType += '.int().min(1900).max(2100)';
            } else if (k.includes('month') && !k.includes('monthly')) {
              zType += '.int().min(1).max(12)';
            } else if (k === 'day' || k.endsWith('_day') || k.startsWith('day_')) {
              zType += '.int().min(1).max(31)';
            } else if (k.includes('hour')) {
              zType += '.int().min(0).max(23)';
            } else if (k.includes('minute') || k.includes('second')) {
              zType += '.int().min(0).max(59)';
            } else if (hasWord('count', 'quantity', 'qty')) {
              zType += '.int().min(0)';
            } else if (hasWord('price', 'amount', 'cost', 'fee', 'rank', 'total', 'subtotal')) {
              zType += '.min(0)';
            } else if (k === 'port' || k.endsWith('_port') || k === 'portnumber' || k === 'port_number') {
              zType += '.int().min(1).max(65535)';
            } else if (field.fieldType.format === 'int') {
              zType += '.int()';
            }
          }
          if (field.fieldType.kind === 'string' && !field.fieldType.format) {
            if (k.includes('email')) zType = zEmail;
            else if (k.includes('url') || k.includes('link') || k.includes('website')) zType = zUrl;
            else if (k.includes('uuid') || ((k.endsWith('_id') || /Id$/.test(displayName) || /ID$/.test(displayName)) && field.fieldType.format === 'uuid')) zType = zUuid;
            // Zod v4 REMOVED z.string().ip() and has no z.ip() — it crashes at runtime.
            // v4 splits into z.ipv4()/z.ipv6(); accept either via a union. v3 keeps .ip().
            else if (k === 'ip' || k.includes('ip_address') || k.includes('ipaddress') || k === 'remote_ip' || k === 'client_ip' || k === 'server_ip') zType = isV3 ? 'z.string().ip()' : 'z.union([z.ipv4(), z.ipv6()])';
            else if (k.includes('phone') || k === 'tel' || k === 'telephone' || k.endsWith('_tel') || k.startsWith('tel_')) zType = 'z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)';
            else if (k.includes('password') || k.includes('passwd')) zType = 'z.string().min(8)';
            else if (k === 'zip' || k === 'zipcode' || k === 'zip_code' || k === 'postal_code' || k === 'postcode') zType = 'z.string().regex(/^[A-Z0-9][A-Z0-9\\s\\-]{1,8}[A-Z0-9]$/i)';
            else if (k === 'semver') zType = 'z.string().regex(/^\\d+\\.\\d+(\\.\\d+)?(-[\\w.]+)?(\\+[\\w.]+)?$/)';
            else if (k.includes('slug')) zType = 'z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)';
            // ISO 3166-1 alpha-2 country code (US/JP) — exactly 2 letters. Not bare
            // "country", which usually holds a full name ("United States").
            // (currency/currencyCode are handled by enum detection — see enumKeywordsSet —
            //  so a single sample yields z.literal("USD"); multi-sample yields z.enum.)
            else if (k === 'countrycode' || k === 'country_code') zType = 'z.string().length(2)';
            else {
              const hasTrim = k.includes('name') || k.includes('label') || k.includes('title');
              if (hasTrim) zType = 'z.string().trim()';
            }
          }
          // null-in-sample fields arrive as kind 'any' (z.any()). The value gives no
          // type, but the NAME often does — recover a meaningful base type so common
          // nullable columns (deletedAt, archivedAt, lastLoginAt …) aren't left as a
          // useless z.any().nullable(). Falls through to z.any() when no hint matches.
          if (field.fieldType.kind === 'any' && field.isNullable) {
            const lastWord = words[words.length - 1];
            if (lastWord === 'at' || hasWord('timestamp', 'datetime')) zType = isV3 ? 'z.string().datetime()' : 'z.iso.datetime()';
            else if (hasWord('date')) zType = isV3 ? 'z.coerce.date()' : 'z.iso.date()';
            else if (hasWord('time')) zType = isV3 ? 'z.string().datetime()' : 'z.iso.datetime()';
            else if (k.includes('email')) zType = zEmail;
            else if (k.includes('url') || k.includes('link') || k.includes('website')) zType = zUrl;
          }
        }

        // An explicit .int() is captured as format (not a refinement), so the guarded
        // name-inference block above skips it whenever other refinements are present.
        // Re-insert it after the number constructor (before refinements) so a parsed
        // z.number().int().min(0) / z.coerce.number().int() doesn't silently lose .int().
        if (field.fieldType.kind === 'number' && field.fieldType.format === 'int'
            && field.fieldType.refinements?.length && !zType.includes('.int(')) {
          zType = zType.replace(/^(z\.(?:coerce\.)?number\(\))/, '$1.int()');
        }

        let fieldExpr = `${zType}${isNull}${isOpt}`;
        if (isEnterprise) {
          const label = displayName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().toLowerCase();
          fieldExpr += `.describe('${label}')`;
        }

        res += `  ${safeKey(displayName)}: ${fieldExpr},\n`;
      }

      const objSuffix = isLoose ? '.passthrough()' : isEnterprise ? '.strict()' : '';
      res += `})${objSuffix};\n`;
      if (isCyclic) {
        // Type is already declared above; z.infer would re-introduce the circular inference
        res += '\n';
      } else {
        res += `export type ${cls.name} = z.infer<typeof ${camelName}Schema>;\n\n`;
      }
    }

    // トップレベルが配列の場合は配列スキーマのエイリアスを出力
    const itemName = rootArrayItemClassName(schema, toPascalCase(name));
    if (itemName && astClasses.some(c => c.name === itemName)) {
      const rootPascal = toPascalCase(name);
      const rootCamel = toCamelCase(rootPascal);
      res += `export const ${rootCamel}Schema = z.array(${toCamelCase(itemName)}Schema);\n`;
      res += `export type ${rootPascal} = z.infer<typeof ${rootCamel}Schema>;\n\n`;
    }

    return res;
  }
};

// --- Mobile & Backend Expansion ---

// --- Mobile & Backend Expansion (AST Printers with strict inheritance support) ---

const printDartASTType = (type: any): string => {
  switch (type.kind) {
    case 'union': return 'dynamic';
    case 'enum': return 'String';
    case 'date':
    case 'datetime': return 'DateTime';
    case 'classRef': return type.classRefName ?? 'dynamic';
    case 'array':
      if (type.itemType) {
        return `List<${printDartASTType(type.itemType)}>`;
      }
      return 'List<dynamic>';
    case 'string': return 'String';
    case 'number': return type.format === 'int' ? 'int' : 'double';
    case 'boolean': return 'bool';
    default: return 'dynamic';
  }
};

export const dartGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` extends ${baseClass}` : '';

      res += `class ${cls.name}${inheritance} {\n`;
      for (const field of cls.fields) {
        const isNullable = field.isOptional || field.isNullable;
        let dartType = printDartASTType(field.fieldType);
        if (isNullable && dartType !== 'dynamic') dartType += '?';
        res += `  final ${dartType} ${field.name};\n`;
      }
      res += `\n  ${cls.name}({\n`;
      for (const field of cls.fields) {
        const isNullable = field.isOptional || field.isNullable;
        res += `    ${isNullable ? '' : 'required '}this.${field.name},\n`;
      }
      res += `  });\n`;
      res += `}\n\n`;
    }
    return res;
  }
};

const printPhpASTType = (type: any): string => {
  switch (type.kind) {
    case 'union': return 'mixed';
    case 'enum': return 'string';
    case 'date':
    case 'datetime': return 'DateTime';
    case 'classRef': return type.classRefName ?? 'mixed';
    case 'array': return 'array';
    case 'string': return 'string';
    case 'number': return type.format === 'int' ? 'int' : 'float';
    case 'boolean': return 'bool';
    default: return 'mixed';
  }
};

export const phpGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` extends ${baseClass}` : '';

      res += `class ${cls.name}${inheritance}\n{\n`;

      // Constructor with promoted properties
      res += `    public function __construct(\n`;
      for (const field of cls.fields) {
        const phpType = printPhpASTType(field.fieldType);
        // `mixed` already includes null — `?mixed` is a PHP 8 fatal error
        const nullable = (field.isOptional || field.isNullable) && phpType !== 'mixed' ? '?' : '';
        const defaultVal = (field.isOptional || field.isNullable) ? ' = null' : '';
        res += `        private ${nullable}${phpType} $${field.name}${defaultVal},\n`;
      }
      res += `    ) {}\n`;

      // Getters and setters
      for (const field of cls.fields) {
        const phpType = printPhpASTType(field.fieldType);
        const nullable = (field.isOptional || field.isNullable) && phpType !== 'mixed' ? '?' : '';
        const cap = field.name.charAt(0).toUpperCase() + field.name.slice(1);
        res += `\n    public function get${cap}(): ${nullable}${phpType} { return $this->${field.name}; }\n`;
        res += `    public function set${cap}(${nullable}${phpType} $${field.name}): void { $this->${field.name} = $${field.name}; }\n`;
      }

      res += `}\n\n`;
    }
    return res;
  }
};

const printPythonASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union': return 'Any';
    case 'enum': return 'str';
    case 'date':
    case 'datetime': return 'datetime';
    case 'classRef': return type.classRefName ?? 'Any';
    case 'array':
      if (type.itemType) {
        return `List[${printPythonASTType(type.itemType)}]`;
      }
      return 'List[Any]';
    case 'string': return 'str';
    case 'number': return type.format === 'int' ? 'int' : 'float';
    case 'boolean': return 'bool';
    default: return 'Any';
  }
};

export const pythonGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    // Python evaluates class-body annotations eagerly, so a parent that
    // references a nested model defined later raises NameError at import time.
    // Emit dependencies (child models) first — same topological order Zod uses.
    const { sorted: sortedClasses } = topoSortForZod(astClasses);
    for (const cls of sortedClasses) {
      const baseClass = getBaseClass(cls) ?? 'BaseModel';

      res += `class ${cls.name}(${baseClass}):\n`;
      if (cls.fields.length === 0) {
        res += `    pass\n\n`;
        continue;
      }
      for (const field of cls.fields) {
        let pyType = printPythonASTType(field.fieldType);
        if (field.isOptional || field.isNullable) {
          pyType = `Optional[${pyType}] = None`;
        }
        res += `    ${field.name}: ${pyType}\n`;
      }
      res += `\n`;
    }
    return res;
  }
};

const printProtoASTType = (type: any): string => {
  switch (type.kind) {
    case 'union': return 'string';
    case 'enum': return 'string';
    case 'date':
    case 'datetime': return 'string';
    case 'classRef': return type.classRefName ?? 'string';
    case 'array':
      if (type.itemType) {
        return `repeated ${printProtoASTType(type.itemType)}`;
      }
      return 'repeated string';
    case 'string': return 'string';
    case 'number': return type.format === 'int' ? 'int32' : 'double';
    case 'boolean': return 'bool';
    default: return 'string';
  }
};

export const protoGen = {
  generate: (schema: Schema, name: string = 'Message', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      res += `message ${cls.name} {\n`;
      let i = 1;

      // Proto3 には継承がありません。extends アノテーションがある場合は、
      // 継承モデルのフィールドをプリンタ側で自動的にマージ平坦展開して出力します！
      const baseClass = getBaseClass(cls);

      if (baseClass) {
        const baseCls = astClasses.find(c => c.name === baseClass);
        if (baseCls) {
          for (const f of baseCls.fields) {
            const protoType = printProtoASTType(f.fieldType);
            res += `  ${protoType} ${f.name} = ${i++};\n`;
          }
        }
      }

      for (const field of cls.fields) {
        const protoType = printProtoASTType(field.fieldType);
        res += `  ${protoType} ${field.name} = ${i++};\n`;
      }
      res += `}\n\n`;
    }
    return res;
  }
};

const printGqlASTType = (type: any): string => {
  switch (type.kind) {
    case 'union': return 'String';
    case 'enum': return 'String';
    case 'date':
    case 'datetime': return 'String';
    case 'classRef': return type.classRefName ?? 'String';
    case 'array':
      if (type.itemType) {
        return `[${printGqlASTType(type.itemType)}!]`;
      }
      return '[String]';
    case 'string': return 'String';
    case 'number': return type.format === 'int' ? 'Int' : 'Float';
    case 'boolean': return 'Boolean';
    default: return 'String';
  }
};

export const gqlGen = {
  generate: (schema: Schema, name: string = 'Type', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      res += `type ${cls.name} {\n`;

      // GraphQL にはクラス継承がありません。extends アノテーションがある場合は、
      // 継承モデルのフィールドを自動的にマージ平坦展開して出力します！
      const baseClass = getBaseClass(cls);

      if (baseClass) {
        const baseCls = astClasses.find(c => c.name === baseClass);
        if (baseCls) {
          for (const f of baseCls.fields) {
            const gqlType = printGqlASTType(f.fieldType);
            const bang = (f.isOptional || f.isNullable) ? '' : '!';
            res += `  ${f.name}: ${gqlType}${bang}\n`;
          }
        }
      }

      for (const field of cls.fields) {
        const gqlType = printGqlASTType(field.fieldType);
        const bang = (field.isOptional || field.isNullable) ? '' : '!';
        res += `  ${field.name}: ${gqlType}${bang}\n`;
      }
      res += `}\n\n`;
    }
    return res;
  }
};

const toSnakeCase = (str: string): string => {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase();
};

const RUST_RESERVED = new Set(['type', 'struct', 'enum', 'match', 'use', 'mod', 'fn', 'let', 'pub', 'impl', 'trait', 'for', 'loop', 'while', 'if', 'else', 'return', 'break', 'continue', 'as', 'async', 'await', 'const', 'crate', 'dyn', 'extern', 'false', 'true', 'in', 'move', 'mut', 'ref', 'self', 'Self', 'static', 'super', 'unsafe', 'where']);
const escapeRust = (s: string) => RUST_RESERVED.has(s) ? `r#${s}` : s;

const printRustASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union':
      return 'serde_json::Value';
    case 'enum':
      return 'String';
    case 'date':
    case 'datetime':
      return 'chrono::DateTime<chrono::Utc>';
    case 'classRef':
      return type.classRefName ?? 'serde_json::Value';
    case 'array':
      if (type.itemType) {
        return `Vec<${printRustASTType(type.itemType)}>`;
      }
      return 'Vec<serde_json::Value>';
    case 'string':
      return 'String';
    case 'number':
      return type.format === 'int' ? 'i64' : 'f64';
    case 'boolean':
      return 'bool';
    default:
      return 'serde_json::Value';
  }
};

export const rustGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "use serde::{Serialize, Deserialize};\n\n";

    const rustItemName = rootArrayItemClassName(schema, toPascalCase(name));
    if (rustItemName && astClasses.some(c => c.name === rustItemName)) {
      res += `pub type ${toPascalCase(name)} = Vec<${rustItemName}>;\n\n`;
    }

    for (const cls of astClasses) {
      const baseStruct = getBaseClass(cls);

      res += `#[derive(Serialize, Deserialize, Debug, Clone)]\npub struct ${cls.name} {\n`;
      if (baseStruct) {
        const fieldName = toSnakeCase(baseStruct);
        res += `  #[serde(flatten)]\n  pub ${fieldName}: ${baseStruct},\n`;
      }

      for (const field of cls.fields) {
        let rustType = printRustASTType(field.fieldType);
        if (field.isOptional || field.isNullable) {
          rustType = `Option<${rustType}>`;
        }
        const snakeFieldName = escapeRust(toSnakeCase(field.name));

        if (snakeFieldName !== field.name) {
          res += `  #[serde(rename = "${field.name}")]\n`;
        }
        res += `  pub ${snakeFieldName}: ${rustType},\n`;
      }
      res += `}\n\n`;
    }
    return res;
  }
};

const printGoASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union':
      return 'interface{}';
    case 'enum':
      return 'string';
    case 'date':
    case 'datetime':
      return 'time.Time';
    case 'classRef':
      return type.classRefName ?? 'interface{}';
    case 'array':
      if (type.itemType) {
        return `[]${printGoASTType(type.itemType)}`;
      }
      return '[]interface{}';
    case 'string':
      return 'string';
    case 'number':
      return type.format === 'int' ? 'int64' : 'float64';
    case 'boolean':
      return 'bool';
    default:
      return 'interface{}';
  }
};

export const goGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    const usesTime = astClasses.some(cls =>
  cls.fields.some(f => f.fieldType.kind === 'date' || f.fieldType.kind === 'datetime')
);
let res = usesTime
  ? "package main\n\nimport \"time\"\n\n"
  : "package main\n\n";

    const goItemName = rootArrayItemClassName(schema, toPascalCase(name));
    if (goItemName && astClasses.some(c => c.name === goItemName)) {
      res += `type ${toPascalCase(name)} []${goItemName}\n\n`;
    }

    for (const cls of astClasses) {
      const baseStruct = getBaseClass(cls);

      res += `type ${cls.name} struct {\n`;
      if (baseStruct) {
        res += `  ${baseStruct}\n`;
      }

      for (const field of cls.fields) {
        let goType = printGoASTType(field.fieldType);
        if (field.isNullable || field.isOptional) goType = `*${goType}`;
        const pascalFieldName = toPascalCase(field.name);
        const omitEmpty = (field.isOptional || field.isNullable) ? ',omitempty' : '';
        res += `  ${pascalFieldName} ${goType} \`json:"${field.name}${omitEmpty}"\`\n`;
      }
      res += `}\n\n`;
    }
    return res;
  }
};

// ─── Java helpers ─────────────────────────────────────────────────────────────
const toJavaClassName = (n: string) =>
  n.split(/[_\s-]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');

const toJavaFieldName = (k: string) =>
  k.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());

const isJavaMoney = (k: string) =>
  ['price','amount','cost','fee','total','subtotal','balance','payment'].some(w => k.toLowerCase().includes(w));

const printJavaASTType = (type: ASTType, isNullable: boolean, fieldName = ''): string => {
  switch (type.kind) {
    case 'union': return 'Object';
    case 'enum': return 'String';
    case 'date': return 'LocalDate';
    case 'datetime': return 'OffsetDateTime';
    case 'classRef': return toJavaClassName(type.classRefName ?? 'Object');
    case 'array':
      return type.itemType ? `List<${printJavaASTType(type.itemType, true, '')}>` : 'List<Object>';
    case 'string':
      if (type.format === 'uuid') return 'UUID';
      return 'String';
    case 'number':
      if (isJavaMoney(fieldName)) return 'BigDecimal';
      return type.format === 'int' ? (isNullable ? 'Integer' : 'int') : (isNullable ? 'Double' : 'double');
    case 'boolean': return isNullable ? 'Boolean' : 'boolean';
    default: return 'Object';
  }
};

const JAVA_PRIMITIVES = new Set(['int', 'long', 'double', 'float', 'boolean', 'char', 'byte', 'short']);

export const javaGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);

    const imports = new Set<string>([
      'import lombok.AllArgsConstructor;',
      'import lombok.Builder;',
      'import lombok.Data;',
      'import lombok.NoArgsConstructor;',
      'import com.fasterxml.jackson.annotation.JsonIgnoreProperties;',
    ]);
    let needsJsonProperty = false;
    let needsNotNull = false;
    let needsEmail = false;
    let needsMin = false;
    let needsNullable = false;

    for (const cls of astClasses) {
      for (const field of cls.fields) {
        const isNullable = field.isOptional || field.isNullable;
        const javaType = printJavaASTType(field.fieldType, isNullable, field.name);
        const javaName = toJavaFieldName(field.name);
        const kl = field.name.toLowerCase();

        if (field.name !== javaName) needsJsonProperty = true;
        if (field.fieldType.kind === 'array') imports.add('import java.util.List;');
        if (javaType === 'UUID') imports.add('import java.util.UUID;');
        if (javaType === 'LocalDate') imports.add('import java.time.LocalDate;');
        if (javaType === 'OffsetDateTime') imports.add('import java.time.OffsetDateTime;');
        if (javaType === 'BigDecimal') imports.add('import java.math.BigDecimal;');
        if (isNullable) needsNullable = true;
        if (!isNullable && !JAVA_PRIMITIVES.has(javaType)) needsNotNull = true;
        if (field.fieldType.format === 'email' || kl.includes('email')) needsEmail = true;
        const isNumeric = field.fieldType.kind === 'number';
        if (isNumeric && (isJavaMoney(field.name) || kl === 'count' || kl.endsWith('count') || kl.endsWith('_count') || kl.includes('quantity') || kl === 'qty')) needsMin = true;
      }
    }

    if (needsJsonProperty) imports.add('import com.fasterxml.jackson.annotation.JsonProperty;');
    if (needsNullable) imports.add('import javax.annotation.Nullable;');
    if (needsNotNull) imports.add('import jakarta.validation.constraints.NotNull;');
    if (needsEmail) imports.add('import jakarta.validation.constraints.Email;');
    if (needsMin) imports.add('import jakarta.validation.constraints.Min;');

    let res = [...imports].sort().join('\n') + '\n\n';

    for (const cls of astClasses) {
      res += '@Data\n@Builder\n@NoArgsConstructor\n@AllArgsConstructor\n';
      res += '@JsonIgnoreProperties(ignoreUnknown = true)\n';
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` extends ${toJavaClassName(baseClass)}` : '';
      res += `public class ${toJavaClassName(cls.name)}${inheritance} {\n`;

      for (const field of cls.fields) {
        const isNullable = field.isOptional || field.isNullable;
        const javaType = printJavaASTType(field.fieldType, isNullable, field.name);
        const javaName = toJavaFieldName(field.name);
        const kl = field.name.toLowerCase();

        if (isNullable) {
          res += `    @Nullable\n`;
        } else if (!JAVA_PRIMITIVES.has(javaType)) {
          res += `    @NotNull\n`;
        }

        if (field.fieldType.format === 'email' || kl.includes('email')) res += `    @Email\n`;
        const isNumField = field.fieldType.kind === 'number';
        if (isNumField && isJavaMoney(field.name)) res += `    @Min(0)\n`;
        else if (isNumField && (kl === 'count' || kl.endsWith('count') || kl.endsWith('_count') || kl.includes('quantity') || kl === 'qty')) res += `    @Min(0)\n`;
        if (field.name !== javaName) res += `    @JsonProperty("${field.name}")\n`;

        if (field.fieldType.kind === 'enum' && field.fieldType.enumValues?.length) {
          const vals = field.fieldType.enumValues.map(v => `"${v}"`).join(', ');
          res += `    private String ${javaName}; // enum: ${vals}\n`;
        } else {
          res += `    private ${javaType} ${javaName};\n`;
        }
      }

      res += `}\n\n`;
    }
    return res.trim() + '\n';
  }
};

const printPrismaASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union': return 'String';
    case 'enum': return 'String';
    case 'string': return 'String';
    case 'number': return type.format === 'int' ? 'Int' : 'Float';
    case 'boolean': return 'Boolean';
    case 'date':
    case 'datetime': return 'DateTime';
    case 'classRef': return type.classRefName ?? 'String';
    case 'array': 
      return type.itemType ? `${printPrismaASTType(type.itemType)}[]` : 'String[]';
    default: return 'String';
  }
};

export const prismaGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      res += `model ${cls.name} {\n`;
      
      const hasExplicitId = cls.fields.some(f => f.name === 'id');
      if (!hasExplicitId) {
        res += `  id String @id @default(uuid())\n`;
      }

      const baseClass = getBaseClass(cls);

      if (baseClass) {
        const baseCls = astClasses.find(c => c.name === baseClass);
        if (baseCls) {
          for (const f of baseCls.fields) {
            const prismaType = printPrismaASTType(f.fieldType);
            const idTag = f.name === 'id' ? ' @id' : '';
            res += `  ${f.name} ${prismaType}${idTag}\n`;
          }
        }
      }

      const DECIMAL_NAMES = /^(price|amount|cost|total|fee|balance|discount|tax|rate|salary|revenue|budget|charge|payment|subtotal|tip|markup|margin)s?$/i;
      for (const field of cls.fields) {
        let prismaType = printPrismaASTType(field.fieldType);
        if (prismaType === 'Float' && DECIMAL_NAMES.test(field.name)) prismaType = 'Decimal';
        const isArray = field.fieldType.kind === 'array';
        const opt = (field.isOptional && !isArray) ? '?' : '';
        const customKey2 = `${cls.name}.${field.name}`;
        const displayName2 = (options.customFieldNames as Record<string, string>)?.[customKey2] ?? field.name;
        const idTag = displayName2 === 'id' ? ' @id' : '';
        
        if (field.fieldType.kind === 'classRef') {
          // Embedded object → Json. Proper @relation requires bidirectional back-references
          // in the target model, which cannot be auto-derived from a single JSON sample.
          res += `  ${displayName2} Json${opt}\n`;
        } else if (isArray && field.fieldType.itemType?.kind === 'classRef') {
          // Array of embedded objects → Json. One-to-many @relation requires a back-reference
          // field in the target model pointing to this model — not auto-derivable from JSON.
          res += `  ${displayName2} Json\n`;
        } else {
          res += `  ${displayName2} ${prismaType}${opt}${idTag}\n`;

          // Cross-reference: only add @relation when the FK field has uuid format, which is
          // a strong signal it is a real foreign key rather than an unrelated string label.
          if (!isArray && displayName2.length > 2 && displayName2.endsWith('Id')
            && field.fieldType.format === 'uuid') {
            const relName = displayName2.slice(0, -2); // "userId" → "user"
            const refClass = relName.charAt(0).toUpperCase() + relName.slice(1); // "User"
            const relAlreadyDeclared = cls.fields.some(f => f.name === relName);
            if (!relAlreadyDeclared) {
              // Try exact match first, then single-suffix match (e.g. "RootUser" ends with "User")
              const exactModel = astClasses.find(c => c.name === refClass);
              const suffixMatches = astClasses.filter(c => c.name !== cls.name && c.name.endsWith(refClass));
              const refModel = exactModel ?? (suffixMatches.length === 1 ? suffixMatches[0] : null);
              if (refModel) {
                res += `  ${relName} ${refModel.name}? @relation(fields: [${displayName2}], references: [id])\n`;
              }
            }
          }
        }
      }
      res += `}\n\n`;
    }
    return res;
  }
};

export const uiGen = {
  generate: (schema: Schema, name: string = 'Component'): string => {
    const fields = schema.fields || {};
    const keys = Object.keys(fields);
    let res = `import React from 'react';\n\n`;
    res += `export const ${name}Card = ({ data }: { data: any }) => (\n`;
    res += `  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">\n`;
    res += `    <h3 className="text-lg font-black mb-4 dark:text-white">${name}</h3>\n`;
    res += `    <div className="grid grid-cols-2 gap-4">\n`;
    keys.forEach(k => {
      res += `      <div>\n        <p className="text-[10px] text-slate-400 uppercase">${k}</p>\n        <p className="text-sm font-bold dark:text-slate-200">{typeof data?.${k} === 'object' ? JSON.stringify(data?.${k}) : String(data?.${k} ?? '-')}</p>\n      </div>\n`;
    });
    res += `    </div>\n  </div>\n);\n`;
    return res;
  }
};

export const mockGen = {
  generate: (schema: Schema): string => {
    let _arrayIndex = 0;
    const generateMock = (s: Schema, key: string = "", parentKey: string = ""): any => {
      // Record (dynamic-keyed map): emit a couple of representative entries.
      if (s.type === 'object' && s.recordValueType) {
        const obj: any = {};
        for (let i = 1; i <= 2; i++) obj[`key${i}`] = generateMock(s.recordValueType!, key, parentKey);
        return obj;
      }
      // Tuple: emit one value per positional element type.
      if (s.type === 'array' && s.tupleTypes) {
        return s.tupleTypes.map(t => generateMock(t, key, parentKey));
      }
      if (s.type === 'object' && s.fields) {
        const obj: any = {};
        for (const [k, v] of Object.entries(s.fields)) {
          obj[k] = generateMock(v, k, key);
        }
        return obj;
      }
      if (s.type === 'array') {
        const itemSchema = s.itemType || { type: 'string' };
        const prevIndex = _arrayIndex;
        _arrayIndex = 0;
        const arr = Array.from({ length: 50 }, (_, i) => {
          _arrayIndex = i + 1;
          return generateMock(itemSchema, key, parentKey);
        });
        _arrayIndex = prevIndex;
        return arr;
      }
      if (s.type === 'number') {
        if (key.toLowerCase().includes('id') || key.toLowerCase().includes('price') || key.toLowerCase().includes('amount')) {
          return _arrayIndex > 0 ? _arrayIndex : 1;
        }
        if (key.toLowerCase().includes('age')) return 28;
        return 42;
      }
      if (s.type === 'boolean') return true;
      if (s.type === 'string') {
        if (s.format === 'uuid') return `550e8400-e29b-41d4-a716-${String(_arrayIndex || 1).padStart(12, '0')}`;
        if (s.format === 'email') return 'test@example.com';
        if (s.format === 'url') return 'https://example.com/api';
        if (s.format === 'datetime') return new Date().toISOString();

        const k = key.toLowerCase();
        const pk = parentKey.toLowerCase();
        // Context-aware: if parent is "items" or "products", generate item-like names
        const isItemContext = pk === 'items' || pk === 'products' || pk === 'entries' || pk === 'records';
        
        if (k.includes('name')) {
          if (isItemContext) return `Item ${String.fromCharCode(64 + (_arrayIndex || 1))}`;
          const names = ['Alice Johnson', 'Bob Smith', 'Carol White', 'David Brown', 'Emma Davis', 'Frank Wilson', 'Grace Lee', 'Henry Taylor'];
          return names[((_arrayIndex || 1) - 1) % names.length];
        }
        if (k.includes('email')) {
          const domains = ['example.com', 'test.org', 'demo.io', 'sample.net'];
          return `user${_arrayIndex || 1}@${domains[((_arrayIndex || 1) - 1) % domains.length]}`;
        }
        if (k.includes('url') || k.includes('link') || k.includes('avatar') || k.includes('image')) return 'https://example.com/sample.png';
        if (k.includes('id')) return `550e8400-e29b-41d4-a716-${String(_arrayIndex || 1).padStart(12, '0')}`;
        if (k.includes('date') || k.includes('time') || k.includes('created') || k.includes('updated')) return new Date().toISOString();
        if (k.includes('city')) {
          const cities = ['Tokyo', 'New York', 'London', 'Paris', 'Sydney', 'Berlin', 'Singapore', 'Toronto'];
          return cities[((_arrayIndex || 1) - 1) % cities.length];
        }
        if (k.includes('street') || k.includes('address')) return '123 Main Street';
        if (k.includes('zip') || k.includes('postal')) return '100-0001';
        if (k.includes('phone') || k.includes('tel')) return '+81-90-1234-5678';
        if (k.includes('role') || k.includes('type') || k.includes('status') || k.includes('category')) {
          const roles = ['admin', 'user', 'guest', 'moderator'];
          return roles[((_arrayIndex || 1) - 1) % roles.length];
        }
        if (k.includes('desc') || k.includes('memo') || k.includes('text') || k.includes('bio') || k.includes('note')) return 'This is a sample generated text to simulate a realistic description or content block.';
        if (k.includes('title')) return 'Sample Title';
        if (k.includes('price') || k.includes('cost')) return (19.99 + (_arrayIndex || 0) * 10).toFixed(2);
        if (k.includes('color')) return '#3366ff';
        if (k.includes('country')) return 'Japan';
        if (k.includes('lang') || k.includes('locale')) return 'en-US';
        
        return 'sample_' + key;
      }
      return null;
    };
    return JSON.stringify(generateMock(schema), null, 2);
  }
};

const printCsharpASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union': return 'object';
    case 'enum': return 'string';
    case 'date': return 'DateTime';
    case 'datetime': return 'DateTimeOffset';
    case 'classRef': return type.classRefName ?? 'object';
    case 'array':
      return type.itemType ? `List<${printCsharpASTType(type.itemType)}>` : 'List<object>';
    case 'string': return 'string';
    case 'number': return type.format === 'int' ? 'long' : 'double';
    case 'boolean': return 'bool';
    default: return 'object';
  }
};

export const csharpGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let body = "";
    let hasRequired = false;

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` : ${baseClass}` : '';
      body += `public class ${cls.name}${inheritance}\n{\n`;
      for (const field of cls.fields) {
        const csType = printCsharpASTType(field.fieldType);
        const isRequired = !field.isOptional && !field.isNullable;
        const nullable = isRequired ? '' : '?';
        if (isRequired) {
          hasRequired = true;
          body += `    [Required]\n`;
        }
        body += `    public ${csType}${nullable} ${toPascalCase(field.name)} { get; set; }\n`;
      }
      body += `}\n\n`;
    }
    const header = hasRequired ? 'using System.ComponentModel.DataAnnotations;\n\n' : '';
    return header + body;
  }
};

const printSwiftASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union': return 'AnyCodable';
    case 'enum': return 'String';
    case 'date':
    case 'datetime': return 'Date';
    case 'classRef': return toJavaClassName(type.classRefName ?? 'AnyCodable');
    case 'array':
      return type.itemType ? `[${printSwiftASTType(type.itemType)}]` : '[AnyCodable]';
    case 'string':
      if (type.format === 'uuid') return 'UUID';
      return 'String';
    case 'number': return type.format === 'int' ? 'Int' : 'Double';
    case 'boolean': return 'Bool';
    default: return 'AnyCodable';
  }
};

export const swiftGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = 'import Foundation\n\n';

    for (const cls of astClasses) {
      const swiftName = toJavaClassName(cls.name);
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? `: ${toJavaClassName(baseClass)}` : ': Codable';
      res += `struct ${swiftName} ${inheritance} {\n`;

      const codingKeys: Array<{ swift: string; json: string }> = [];

      for (const field of cls.fields) {
        const swiftFieldName = toJavaFieldName(field.name);
        let swiftType = printSwiftASTType(field.fieldType);
        if (field.isOptional || field.isNullable) swiftType += '?';
        res += `    let ${swiftFieldName}: ${swiftType}\n`;
        if (field.name !== swiftFieldName) {
          codingKeys.push({ swift: swiftFieldName, json: field.name });
        } else {
          codingKeys.push({ swift: swiftFieldName, json: '' });
        }
      }

      const needsCodingKeys = codingKeys.some(k => k.json !== '');
      if (needsCodingKeys) {
        res += '\n    enum CodingKeys: String, CodingKey {\n';
        for (const { swift, json } of codingKeys) {
          if (json) {
            res += `        case ${swift} = "${json}"\n`;
          } else {
            res += `        case ${swift}\n`;
          }
        }
        res += '    }\n';
      }

      res += `}\n\n`;
    }
    return res;
  }
};

const printKotlinASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union': return 'Any';
    case 'enum': return 'String';
    case 'date': return 'LocalDate';
    case 'datetime': return 'Instant';
    case 'classRef': return toJavaClassName(type.classRefName ?? 'Any');
    case 'array':
      return type.itemType ? `List<${printKotlinASTType(type.itemType)}>` : 'List<Any>';
    case 'string':
      if (type.format === 'uuid') return 'String';
      return 'String';
    case 'number': return type.format === 'int' ? 'Int' : 'Double';
    case 'boolean': return 'Boolean';
    default: return 'Any';
  }
};

const hasKotlinKind = (classes: ReturnType<typeof schemaToAST>, kind: string): boolean =>
  classes.some(cls => cls.fields.some(f =>
    f.fieldType.kind === kind ||
    (f.fieldType.kind === 'array' && f.fieldType.itemType?.kind === kind)
  ));

export const kotlinGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);

    let needsSerialName = false;
    for (const cls of astClasses) {
      for (const field of cls.fields) {
        if (field.name !== toJavaFieldName(field.name)) { needsSerialName = true; break; }
      }
    }

    const needsInstant   = hasKotlinKind(astClasses, 'datetime');
    const needsLocalDate = hasKotlinKind(astClasses, 'date');

    let res = 'import kotlinx.serialization.Serializable\n';
    if (needsSerialName) res += 'import kotlinx.serialization.SerialName\n';
    if (needsInstant)   res += 'import kotlinx.datetime.Instant\n';
    if (needsLocalDate) res += 'import kotlinx.datetime.LocalDate\n';
    res += '\n';

    for (const cls of astClasses) {
      const ktName = toJavaClassName(cls.name);
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` : ${toJavaClassName(baseClass)}` : '';
      res += `@Serializable\ndata class ${ktName}(\n`;
      const fields = cls.fields.map(field => {
        const ktFieldName = toJavaFieldName(field.name);
        let ktType = printKotlinASTType(field.fieldType);
        if (field.isOptional || field.isNullable) ktType += '?';
        const serialName = field.name !== ktFieldName
          ? `    @SerialName("${field.name}")\n`
          : '';
        const defaultVal = (field.isOptional || field.isNullable) ? ' = null' : '';
        return `${serialName}    val ${ktFieldName}: ${ktType}${defaultVal}`;
      });
      res += fields.join(',\n');
      res += `\n)${inheritance}\n\n`;
    }
    return res;
  }
};

// --- NestJS DTO Generator ---

const printNestJsDtoFieldType = (type: ASTType): string => {
  switch (type.kind) {
    case 'string':
      if (type.enumValues && type.enumValues.length > 0) {
        return type.enumValues.map(v => `'${v}'`).join(' | ');
      }
      return 'string';
    case 'number': return 'number';
    case 'boolean': return 'boolean';
    case 'date':
    case 'datetime': return 'string';
    case 'classRef': return `${toJavaClassName(type.classRefName ?? 'Object')}Dto`;
    case 'array':
      if (type.itemType) {
        const inner = printNestJsDtoFieldType(type.itemType);
        return inner.includes('|') ? `(${inner})[]` : `${inner}[]`;
      }
      return 'unknown[]';
    case 'enum':
      if (type.enumValues && type.enumValues.length > 0) {
        return type.enumValues.map(v => `'${v}'`).join(' | ');
      }
      return 'string';
    case 'union': return 'unknown';
    default: return 'unknown';
  }
};

export const nestjsDtoGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);

    const cvImports = new Set<string>();
    const ctImports = new Set<string>();
    const classBlocks: string[] = [];

    for (const cls of astClasses) {
      const dtoName = `${cls.name}Dto`;
      let block = `export class ${dtoName} {\n`;

      for (const field of cls.fields) {
        const k = field.name.toLowerCase();
        const isOpt = field.isOptional;
        const isNullable = field.isNullable;
        const ft = field.fieldType;
        const decorators: string[] = [];

        if (isOpt) {
          decorators.push('@IsOptional()');
          cvImports.add('IsOptional');
        }

        if (ft.kind === 'string') {
          const fmt = ft.format;
          if (fmt === 'email' || k.includes('email')) {
            decorators.push('@IsEmail()');
            cvImports.add('IsEmail');
          } else if (fmt === 'uuid') {
            decorators.push('@IsUUID()');
            cvImports.add('IsUUID');
          } else if (fmt === 'url' || k.includes('url') || k.includes('website')) {
            decorators.push('@IsUrl()');
            cvImports.add('IsUrl');
          } else if (fmt === 'datetime' || fmt === 'date') {
            decorators.push('@IsISO8601()');
            cvImports.add('IsISO8601');
          } else if (ft.enumValues && ft.enumValues.length > 0) {
            decorators.push(`@IsIn([${ft.enumValues.map(v => `'${v}'`).join(', ')}])`);
            cvImports.add('IsIn');
          } else {
            decorators.push('@IsString()');
            cvImports.add('IsString');
            if (!isOpt) {
              decorators.push('@IsNotEmpty()');
              cvImports.add('IsNotEmpty');
            }
          }
        } else if (ft.kind === 'number') {
          if (ft.format === 'int') {
            decorators.push('@IsInt()');
            cvImports.add('IsInt');
          } else {
            decorators.push('@IsNumber()');
            cvImports.add('IsNumber');
          }
          if (k.includes('percent')) {
            decorators.push('@Min(0)', '@Max(100)');
            cvImports.add('Min'); cvImports.add('Max');
          } else if (k.includes('latitude') || k === 'lat') {
            decorators.push('@Min(-90)', '@Max(90)');
            cvImports.add('Min'); cvImports.add('Max');
          } else if (k.includes('longitude') || k === 'lng' || k === 'lon') {
            decorators.push('@Min(-180)', '@Max(180)');
            cvImports.add('Min'); cvImports.add('Max');
          } else if (k.includes('age')) {
            decorators.push('@Min(0)', '@Max(150)');
            cvImports.add('Min'); cvImports.add('Max');
          }
        } else if (ft.kind === 'boolean') {
          decorators.push('@IsBoolean()');
          cvImports.add('IsBoolean');
        } else if (ft.kind === 'date' || ft.kind === 'datetime') {
          decorators.push('@IsISO8601()');
          cvImports.add('IsISO8601');
        } else if (ft.kind === 'enum') {
          if (ft.enumValues && ft.enumValues.length > 0) {
            decorators.push(`@IsIn([${ft.enumValues.map(v => `'${v}'`).join(', ')}])`);
            cvImports.add('IsIn');
          } else {
            decorators.push('@IsString()');
            cvImports.add('IsString');
          }
        } else if (ft.kind === 'array') {
          decorators.push('@IsArray()');
          cvImports.add('IsArray');
          if (ft.itemType?.kind === 'classRef') {
            const refName = toJavaClassName(ft.itemType.classRefName ?? 'Object');
            decorators.push('@ValidateNested({ each: true })');
            decorators.push(`@Type(() => ${refName}Dto)`);
            cvImports.add('ValidateNested');
            ctImports.add('Type');
          }
        } else if (ft.kind === 'classRef') {
          const refName = toJavaClassName(ft.classRefName ?? 'Object');
          decorators.push('@ValidateNested()');
          decorators.push(`@Type(() => ${refName}Dto)`);
          cvImports.add('ValidateNested');
          ctImports.add('Type');
        }

        let tsType = printNestJsDtoFieldType(ft);
        if (isNullable) tsType += ' | null';
        const optMark = isOpt ? '?' : '';

        for (const dec of decorators) {
          block += `  ${dec}\n`;
        }
        block += `  ${safeKey(field.name)}${optMark}: ${tsType};\n\n`;
      }

      block = block.trimEnd() + '\n}\n';
      classBlocks.push(block);
    }

    let imports = '';
    if (cvImports.size > 0) {
      imports += `import { ${[...cvImports].sort().join(', ')} } from 'class-validator';\n`;
    }
    if (ctImports.size > 0) {
      imports += `import { ${[...ctImports].sort().join(', ')} } from 'class-transformer';\n`;
    }
    if (imports) imports += '\n';

    return imports + classBlocks.join('\n');
  }
};

export const jsonSchemaGen = {
  generate: (schema: Schema): string => {
    const build = (s: Schema): any => {
      if (s.type === 'object' && s.fields) {
        const required = Object.keys(s.fields).filter(k => !s.fields![k].optional);
        const res: any = {
          // draft-07 では null 許容は type を配列にする（nullable は OpenAPI 拡張で無効）
          type: s.nullable ? ['object', 'null'] : 'object',
          properties: Object.keys(s.fields).reduce((acc, k) => ({ ...acc, [k]: build(s.fields![k]) }), {})
        };
        if (required.length > 0) res.required = required;
        return res;
      }
      if (s.type === 'array') {
        const res: any = { type: s.nullable ? ['array', 'null'] : 'array', items: build(s.itemType!) };
        return res;
      }
      if (s.type === 'union' && s.unionTypes) {
        const res: any = { anyOf: s.unionTypes.map(t => ({ type: t })) };
        if (s.nullable) res.anyOf.push({ type: 'null' });
        return res;
      }
      const leaf: any = {};
      // 'any' は JSON Schema の有効な type ではない → type を省略（= 任意の型を許可）
      if (s.type !== 'any') {
        leaf.type = s.nullable ? [s.type, 'null'] : s.type;
      }
      if (s.format) leaf.format = s.format;
      if (s.enumValues && s.enumValues.length > 0) leaf.enum = s.enumValues;
      return leaf;
    };
    return JSON.stringify({ 
      $schema: "http://json-schema.org/draft-07/schema#", 
      ...build(schema)
    }, null, 2);
  }
};

// --- Effect Schema Generator ---

const printEffectSchemaType = (type: ASTType, cyclicClassRefs: Set<string>): string => {
  switch (type.kind) {
    case 'string':
      if (type.format === 'uuid') return 'Schema.UUID';
      if (type.format === 'datetime' || type.format === 'date') return 'Schema.DateTimeUtc';
      if (type.enumValues && type.enumValues.length > 0) {
        return `Schema.Literal(${type.enumValues.map(v => `"${v}"`).join(', ')})`;
      }
      return 'Schema.String';
    case 'number':
      return type.format === 'int' ? 'Schema.Int' : 'Schema.Number';
    case 'boolean': return 'Schema.Boolean';
    case 'date':
    case 'datetime': return 'Schema.DateTimeUtc';
    case 'classRef': {
      if (!type.classRefName) return 'Schema.Unknown';
      const refVar = toCamelCase(type.classRefName);
      if (cyclicClassRefs.has(type.classRefName)) {
        return `Schema.suspend((): Schema.Schema<${type.classRefName}> => ${refVar})`;
      }
      return refVar;
    }
    case 'array':
      if (type.itemType) return `Schema.Array(${printEffectSchemaType(type.itemType, cyclicClassRefs)})`;
      return 'Schema.Array(Schema.Unknown)';
    case 'enum':
      if (type.enumValues && type.enumValues.length > 0) {
        return `Schema.Literal(${type.enumValues.map(v => `"${v}"`).join(', ')})`;
      }
      return 'Schema.String';
    case 'union':
      if (type.unionTypes && type.unionTypes.length > 0) {
        const parts = type.unionTypes.map(t => printEffectSchemaType({ kind: t } as ASTType, cyclicClassRefs));
        return parts.length === 1 ? parts[0] : `Schema.Union(${parts.join(', ')})`;
      }
      return 'Schema.Unknown';
    default:
      return 'Schema.Unknown';
  }
};

export const effectSchemaGen = {
  generate: (schema: Schema, name: string = 'root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    const { sorted: sortedClasses, cyclicClassRefs } = topoSortForZod(astClasses);
    let res = '';

    for (const cls of sortedClasses) {
      const varName = toCamelCase(cls.name);
      res += `export const ${varName} = Schema.Struct({\n`;

      for (const field of cls.fields) {
        let effectType = printEffectSchemaType(field.fieldType, cyclicClassRefs);
        if (field.isNullable && field.isOptional) {
          effectType = `Schema.optional(Schema.NullOr(${effectType}))`;
        } else if (field.isNullable) {
          effectType = `Schema.NullOr(${effectType})`;
        } else if (field.isOptional) {
          effectType = `Schema.optional(${effectType})`;
        }
        res += `  ${safeKey(field.name)}: ${effectType},\n`;
      }

      res += `});\n`;
      res += `export type ${cls.name} = Schema.Schema.Type<typeof ${varName}>;\n\n`;
    }

    const itemName = rootArrayItemClassName(schema, toPascalCase(name));
    if (itemName && astClasses.some(c => c.name === itemName)) {
      const rootPascal = toPascalCase(name);
      const rootCamel = toCamelCase(rootPascal);
      res += `export const ${rootCamel} = Schema.Array(${toCamelCase(itemName)});\n`;
      res += `export type ${rootPascal} = Schema.Schema.Type<typeof ${rootCamel}>;\n\n`;
    }

    return res;
  }
};

export const docGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    if (schema.type === 'object' && schema.fields) {
      let res = `# API Field Specifications: ${name}\n\n`;
      res += `| Field | Type | Required | Description |\n`;
      res += `| :--- | :--- | :--- | :--- |\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        let typeStr = v.type === 'object' ? 'Object' : v.type === 'array' ? `${v.itemType?.type || 'any'}[]` : v.type;
        if (v.type === 'union' && v.unionTypes) {
          typeStr = v.unionTypes.join(' \\| ');
        }
        if (v.nullable) typeStr += ' (nullable)';
        
        const required = v.optional ? 'No' : 'Yes';
        
        let desc = 'No description provided.';
        const keyLower = k.toLowerCase();
        if (keyLower.endsWith('_id') && keyLower !== 'id') desc = 'Foreign key reference to an external record.';
        else if (keyLower === 'id' || keyLower.endsWith('id')) desc = 'Unique identifier for the record.';
        else if (keyLower === 'username') desc = 'User\'s unique display name.';
        else if (keyLower === 'name' || keyLower === 'fullname') desc = 'Full name of the user or entity.';
        else if (keyLower === 'email') desc = 'Primary email address.';
        else if (keyLower === 'status') desc = 'Operational or lifecycle state.';
        else if (keyLower === 'role') desc = 'User privilege role or system role.';
        else if (keyLower === 'avatarurl' || keyLower === 'avatar') desc = 'Public URL to the user\'s avatar image.';
        else if (keyLower === 'stats') desc = 'Statistical metrics and counters.';
        else if (keyLower === 'preferences') desc = 'User preference flags and custom configurations.';
        else if (keyLower.startsWith('is') || keyLower.startsWith('has')) desc = 'Boolean flag representing status.';
        else if (keyLower === 'createdat' || keyLower === 'created_at') desc = 'Timestamp representing record creation time.';
        else if (keyLower === 'updatedat' || keyLower === 'updated_at') desc = 'Timestamp representing the last update time.';
        else if (keyLower === 'lastlogin' || keyLower === 'last_login') desc = 'Timestamp of the user\'s most recent session activity.';
        else if (keyLower === 'title') desc = 'Human-readable title or heading.';
        else if (keyLower.includes('description') || keyLower === 'desc') desc = 'Free-text description or summary.';
        else if (keyLower.includes('phone') || keyLower.includes('mobile')) desc = 'Contact phone number.';
        else if (keyLower.includes('address')) desc = 'Physical or mailing address.';
        else if (keyLower.includes('price') || keyLower.includes('amount') || keyLower.includes('cost') || keyLower.includes('fee')) desc = 'Monetary value (non-negative).';
        else if (keyLower === 'age') desc = 'Age in years (0–150).';
        else if (keyLower.includes('age') && v.type === 'number') desc = 'Numeric age value.';
        else if (keyLower === 'type' || keyLower.endsWith('_type') || keyLower.endsWith('type')) desc = 'Discriminator or category type.';
        else if (keyLower === 'slug' || keyLower.endsWith('_slug')) desc = 'URL-safe identifier slug.';
        else if (keyLower.endsWith('_count') || keyLower === 'count') desc = 'Integer count or quantity (non-negative).';
        else if (keyLower.endsWith('_at')) desc = 'ISO 8601 timestamp.';
        else if (keyLower.endsWith('_url') || keyLower.endsWith('_link')) desc = 'Fully-qualified URL (HTTP/HTTPS).';
        else if (keyLower.endsWith('_code') || keyLower === 'code') desc = 'Short code or identifier string.';
        else if (v.format === 'uuid') desc = 'Universally Unique Identifier (UUID) format string.';
        else if (v.format === 'email') desc = 'Validated email format string.';
        else if (v.format === 'url') desc = 'Fully-qualified web URL (HTTP/HTTPS).';
        else if (v.format === 'datetime') desc = 'ISO 8601 compliant UTC date-time string.';
        
        res += `| \`${k}\` | \`${typeStr}\` | ${required} | ${desc} |\n`;
      }
      res += `\n`;
      
      for (const [k, v] of Object.entries(schema.fields)) {
        if (v.type === 'object') {
          res += `\n---\n\n`;
          res += docGen.generate(v, k.charAt(0).toUpperCase() + k.slice(1));
        }
        if (v.type === 'array' && v.itemType?.type === 'object') {
          res += `\n---\n\n`;
          res += docGen.generate(v.itemType, k.charAt(0).toUpperCase() + k.slice(1) + 'Item');
        }
      }
      return res;
    }
    return "";
  }
};

// ---------------------------------------------------------------------------
// Type Guard Generator — generates is<Type>() runtime type guard functions
// ---------------------------------------------------------------------------
export const typeGuardGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const discriminatedMap = findDiscriminatedSchemas(schema, name);
    const astClasses = schemaToAST(schema, name, options);
    const lines: string[] = [];

    const typeCheckExpr = (fieldType: ASTType, accessor: string): string => {
      switch (fieldType.kind) {
        case 'string':   return `typeof ${accessor} === 'string'`;
        case 'number':   return `typeof ${accessor} === 'number'`;
        case 'boolean':  return `typeof ${accessor} === 'boolean'`;
        case 'date':
        case 'datetime': return `(typeof ${accessor} === 'string' || ${accessor} instanceof Date)`;
        case 'any':      return 'true';
        case 'classRef': return `is${fieldType.classRefName}(${accessor})`;
        case 'array':    return `Array.isArray(${accessor})`;
        case 'enum': {
          const vals = (fieldType.enumValues ?? []).map(v => `'${v}'`).join(', ');
          return `typeof ${accessor} === 'string' && [${vals}].includes(${accessor})`;
        }
        case 'union': {
          const checks = (fieldType.unionTypes ?? []).filter(t => t !== 'any').map(t => `typeof ${accessor} === '${t}'`);
          return checks.length ? `(${checks.join(' || ')})` : 'true';
        }
        default: return 'true';
      }
    };

    const buildFieldLine = (field: { name: string; fieldType: ASTType; isOptional: boolean; isNullable: boolean }): string => {
      const acc = `o['${field.name}']`;
      const check = typeCheckExpr(field.fieldType, acc);
      const hasRealCheck = check !== 'true';
      if (field.isOptional && field.isNullable) {
        return hasRealCheck ? `(${acc} == null || ${check})` : `(${acc} == null)`;
      }
      if (field.isOptional) return hasRealCheck ? `(${acc} === undefined || ${check})` : 'true';
      if (field.isNullable)  return hasRealCheck ? `(${acc} === null || ${check})` : `${acc} === null`;
      return check; // 'true' for unknown required types → filtered in emitGuard
    };

    const emitGuard = (
      className: string,
      fields: Array<{ name: string; fieldType: ASTType; isOptional: boolean; isNullable: boolean }>
    ) => {
      lines.push(`export function is${className}(obj: unknown): obj is ${className} {`);
      lines.push(`  if (typeof obj !== 'object' || obj === null) return false;`);
      lines.push(`  const o = obj as Record<string, unknown>;`);
      const checkLines = fields.map(buildFieldLine).filter(l => l !== 'true');
      if (checkLines.length === 0) {
        lines.push(`  return true;`);
      } else {
        lines.push(`  return (`);
        checkLines.forEach((line, i) => {
          const sep = i < checkLines.length - 1 ? ' &&' : '';
          lines.push(`    ${line}${sep}`);
        });
        lines.push(`  );`);
      }
      lines.push(`}`);
      lines.push('');
    };

    for (const cls of astClasses) {
      const du = discriminatedMap.get(cls.name);
      if (du) {
        for (const [value, variantSchema] of Object.entries(du.variants)) {
          const suffix = toPascalCase(value);
          const variantName = `${cls.name}${suffix}`;
          const variantFields = Object.entries(variantSchema.fields ?? {}).map(([fk, fv]) => {
            if (fk === du.discriminatorField) {
              return { name: fk, fieldType: { kind: 'enum' as const, enumValues: [value] }, isOptional: false, isNullable: false };
            }
            return { name: fk, fieldType: convertToASTType(fv, variantName, fk), isOptional: !!fv.optional, isNullable: !!fv.nullable };
          });
          emitGuard(variantName, variantFields);
        }
        const variantChecks = Object.keys(du.variants).map(v => `is${cls.name}${toPascalCase(v)}(obj)`);
        lines.push(`export function is${cls.name}(obj: unknown): obj is ${cls.name} {`);
        lines.push(`  return ${variantChecks.join(' || ')};`);
        lines.push(`}`);
        lines.push('');
        continue;
      }
      emitGuard(cls.name, cls.fields);
    }

    if (schema.type === 'array' && schema.itemType) {
      const itemName = rootArrayItemClassName(schema, name);
      if (itemName) {
        const pascalName = toPascalCase(name);
        lines.push(`export function is${pascalName}(obj: unknown): obj is ${pascalName} {`);
        lines.push(`  return Array.isArray(obj) && obj.every((item) => is${itemName}(item));`);
        lines.push(`}`);
        lines.push('');
      }
    }

    return lines.join('\n');
  }
};
