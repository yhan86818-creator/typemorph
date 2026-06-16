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
              res += `  ${fk}: "${value}";\n`;
            } else {
              const fvAst = convertToASTType(fv, variantInterfaceName, fk);
              const tsType = printASTType(fvAst);
              const optMark = fv.optional ? '?' : '';
              const nullSuffix = fv.nullable ? ' | null' : '';
              res += `  ${fk}${optMark}: ${tsType}${nullSuffix};\n`;
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
          tsType = `(${tsType}) | null`;
        }

        res += `  ${displayName}${optMark}: ${tsType};\n`;
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

// Zod型表現を出力するプリンタヘルパー
const printZodASTType = (type: ASTType, cyclicClassRefs: Set<string>, options: any = {}): string => {
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
      return type.enumValues ? `z.enum([${type.enumValues.map(ev => `"${ev}"`).join(', ')}])` : 'z.string()';
    case 'date':
      return 'z.coerce.date()';
    case 'datetime':
      return 'z.string().datetime()';
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
    case 'string':
      if (type.format === 'email') return 'z.email()';
      if (type.format === 'url') return 'z.url()';
      if (type.format === 'uuid') return 'z.uuid()';
      return 'z.string()';
    case 'number':
      return options.zodMode === 'loose' ? 'z.coerce.number()' : 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    default:
      return 'z.any()';
  }
};

export const zodGen = {
  generate: (schema: Schema, name: string = 'root', options: any = {}): string => {
    const mode: 'loose' | 'strict' | 'enterprise' = options.zodMode ?? 'strict';
    const isLoose = mode === 'loose';
    const isEnterprise = mode === 'enterprise';
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
              res += `  ${fk}: z.literal("${value}"),\n`;
            } else {
              const fvAst = convertToASTType(fv, variantPascal, fk);
              let zType = printZodASTType(fvAst, cyclicClassRefs, modeOptions);
              if (fv.nullable) zType += '.nullable()';
              if (isLoose || fv.optional) zType += '.optional()';
              res += `  ${fk}: ${zType},\n`;
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

      if (baseCamel) {
        res += `export const ${camelName}Schema = ${baseCamel}Schema.extend({\n`;
      } else {
        res += `export const ${camelName}Schema = z.object({\n`;
      }

      for (const field of cls.fields) {
        const isOpt = (options.optionalFields || field.isOptional || isLoose) ? '.optional()' : '';
        const isNull = field.isNullable ? '.nullable()' : '';
        let zType = printZodASTType(field.fieldType, cyclicClassRefs, modeOptions);

        // Name-based validation: skipped in loose mode
        const customKey = `${cls.name}.${field.name}`;
        const displayName = (options.customFieldNames as Record<string, string>)?.[customKey] ?? field.name;
        const k = displayName.toLowerCase();
        if (!isLoose) {
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
            } else if (k.includes('age')) {
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
            } else if (k.includes('count') || k.includes('quantity') || k === 'qty') {
              zType += '.int().min(0)';
            } else if (['price', 'amount', 'cost', 'fee', 'rank', 'total', 'subtotal'].some(w => k.includes(w))) {
              zType += '.min(0)';
            } else if (k === 'port' || k.endsWith('_port') || k === 'portnumber' || k === 'port_number') {
              zType += '.int().min(1).max(65535)';
            }
          }
          if (field.fieldType.kind === 'string' && !field.fieldType.format) {
            if (k.includes('email')) zType = 'z.email()';
            else if (k.includes('url') || k.includes('link') || k.includes('website')) zType = 'z.url()';
            else if (k.includes('uuid') || k.endsWith('_id') || /Id$/.test(displayName) || /ID$/.test(displayName)) zType = 'z.uuid()';
            else if (k.includes('phone') || k === 'tel' || k === 'telephone' || k.endsWith('_tel') || k.startsWith('tel_')) zType = 'z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)';
            else if (k.includes('password') || k.includes('passwd')) zType = 'z.string().min(8)';
            else if (k === 'zip' || k === 'zipcode' || k === 'zip_code' || k === 'postal_code' || k === 'postcode') zType = 'z.string().regex(/^[A-Z0-9][A-Z0-9\\s\\-]{1,8}[A-Z0-9]$/i)';
            else if (k === 'semver') zType = 'z.string().regex(/^\\d+\\.\\d+(\\.\\d+)?(-[\\w.]+)?(\\+[\\w.]+)?$/)';
            else if (k.includes('slug')) zType = 'z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)';
            else {
              const hasTrim = k.includes('name') || k.includes('label') || k.includes('title');
              const isRequired = !field.isOptional && !options.optionalFields;
              const longText = ['description', 'note', 'bio', 'comment', 'content', 'body', 'text', 'message', 'summary', 'detail', 'info', 'about', 'remark'].some(w => k.includes(w));
              if (hasTrim) zType = isRequired ? 'z.string().min(1).trim()' : 'z.string().trim()';
              else if (isRequired && !longText) zType = 'z.string().min(1)';
            }
          }
        }

        let fieldExpr = `${zType}${isNull}${isOpt}`;
        if (isEnterprise) {
          const label = displayName.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim().toLowerCase();
          fieldExpr += `.describe('${label}')`;
        }

        res += `  ${displayName}: ${fieldExpr},\n`;
      }

      const objSuffix = isLoose ? '.passthrough()' : isEnterprise ? '.strict()' : '';
      res += `})${objSuffix};\n`;
      res += `export type ${cls.name} = z.infer<typeof ${camelName}Schema>;\n\n`;
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
        const nullable = (field.isOptional || field.isNullable) ? '?' : '';
        const defaultVal = (field.isOptional || field.isNullable) ? ' = null' : '';
        res += `        private ${nullable}${phpType} $${field.name}${defaultVal},\n`;
      }
      res += `    ) {}\n`;

      // Getters and setters
      for (const field of cls.fields) {
        const phpType = printPhpASTType(field.fieldType);
        const nullable = (field.isOptional || field.isNullable) ? '?' : '';
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

    for (const cls of astClasses) {
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
        const omitEmpty = field.isOptional ? ',omitempty' : '';
        res += `  ${pascalFieldName} ${goType} \`json:"${field.name}${omitEmpty}"\`\n`;
      }
      res += `}\n\n`;
    }
    return res;
  }
};

const printJavaASTType = (type: ASTType, isNullable: boolean): string => {
  switch (type.kind) {
    case 'union': return 'Object';
    case 'enum': return 'String';
    case 'date': return 'LocalDate';
    case 'datetime': return 'LocalDateTime';
    case 'classRef': return type.classRefName ?? 'Object';
    case 'array':
      if (type.itemType) {
        return `List<${printJavaASTType(type.itemType, true)}>`;
      }
      return 'List<Object>';
    case 'string': return 'String';
    case 'number': return type.format === 'int' ? (isNullable ? 'Integer' : 'int') : (isNullable ? 'Double' : 'double');
    case 'boolean': return isNullable ? 'Boolean' : 'boolean';
    default: return 'Object';
  }
};

export const javaGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    let needsList = false;
    let needsLocalDate = false;
    let needsLocalDateTime = false;
    let needsNullable = false;

    for (const cls of astClasses) {
      for (const field of cls.fields) {
        if (field.fieldType.kind === 'array') needsList = true;
        if (field.fieldType.kind === 'date') needsLocalDate = true;
        if (field.fieldType.kind === 'datetime') needsLocalDateTime = true;
        if (field.isOptional) needsNullable = true;
      }
    }

    if (needsList) res += "import java.util.List;\n";
    if (needsLocalDate) res += "import java.time.LocalDate;\n";
    if (needsLocalDateTime) res += "import java.time.LocalDateTime;\n";
    if (needsNullable) res += "import javax.annotation.Nullable;\n";
    if (res !== "") res += "\n";

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` extends ${baseClass}` : '';

      res += `public class ${cls.name}${inheritance} {\n`;
      for (const field of cls.fields) {
        const isNullable = field.isOptional || field.isNullable;
        const javaType = printJavaASTType(field.fieldType, isNullable);
        
        if (field.isOptional) {
          res += `  @Nullable\n`;
        }
        
        let comment = '';
        if (field.fieldType.kind === 'enum' && field.fieldType.enumValues && field.fieldType.enumValues.length > 0) {
          comment = ` // enum: ${field.fieldType.enumValues.map((v: string) => `"${v}"`).join(' | ')}`;
        }
        
        res += `  private ${javaType} ${field.name};${comment}\n`;
      }

      if (cls.fields.length > 0) res += "\n";

      for (const field of cls.fields) {
        const isNullable = field.isOptional || field.isNullable;
        const javaType = printJavaASTType(field.fieldType, isNullable);
        const camel = field.name.replace(/_([a-zA-Z0-9])/g, (_, c) => c.toUpperCase());
        const capitalizedName = camel.charAt(0).toUpperCase() + camel.slice(1);

        res += `  public ${javaType} get${capitalizedName}() { return ${field.name}; }\n`;
        res += `  public void set${capitalizedName}(${javaType} ${field.name}) { this.${field.name} = ${field.name}; }\n`;
      }

      res += `}\n\n`;
    }
    return res.trim() + "\n";
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

      for (const field of cls.fields) {
        const prismaType = printPrismaASTType(field.fieldType);
        const isArray = field.fieldType.kind === 'array';
        const opt = (field.isOptional && !isArray) ? '?' : '';
        const customKey2 = `${cls.name}.${field.name}`;
        const displayName2 = (options.customFieldNames as Record<string, string>)?.[customKey2] ?? field.name;
        const idTag = displayName2 === 'id' ? ' @id' : '';
        
        if (field.fieldType.kind === 'classRef') {
          const targetName = field.fieldType.classRefName;
          const relationField = `${field.name}Id`;

          // Try to find target ID type
          const targetCls = astClasses.find(c => c.name === targetName);
          const targetIdField = targetCls?.fields.find(f => f.name === 'id');
          const targetIdType = targetIdField ? printPrismaASTType(targetIdField.fieldType) : 'String';

          res += `  ${displayName2} ${targetName}${opt} @relation(fields: [${displayName2}Id], references: [id])\n`;
          res += `  ${displayName2}Id ${targetIdType}${opt}\n`;
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
    case 'date':
    case 'datetime': return 'DateTime';
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
    case 'classRef': return type.classRefName ?? 'AnyCodable';
    case 'array':
      return type.itemType ? `[${printSwiftASTType(type.itemType)}]` : '[AnyCodable]';
    case 'string': return 'String';
    case 'number': return type.format === 'int' ? 'Int' : 'Double';
    case 'boolean': return 'Bool';
    default: return 'AnyCodable';
  }
};

export const swiftGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? `: ${baseClass}` : ': Codable';
      res += `struct ${cls.name} ${inheritance} {\n`;
      for (const field of cls.fields) {
        let swiftType = printSwiftASTType(field.fieldType);
        if (field.isOptional || field.isNullable) swiftType += '?';
        res += `    let ${field.name}: ${swiftType}\n`;
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
    case 'date':
    case 'datetime': return 'String';
    case 'classRef': return type.classRefName ?? 'Any';
    case 'array':
      return type.itemType ? `List<${printKotlinASTType(type.itemType)}>` : 'List<Any>';
    case 'string': return 'String';
    case 'number': return type.format === 'int' ? 'Int' : 'Double';
    case 'boolean': return 'Boolean';
    default: return 'Any';
  }
};

export const kotlinGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` : ${baseClass}` : '';
      res += `data class ${cls.name}(\n`;
      const fields = cls.fields.map(field => {
        let ktType = printKotlinASTType(field.fieldType);
        if (field.isOptional || field.isNullable) ktType += '?';
        return `    val ${field.name}: ${ktType}`;
      });
      res += fields.join(',\n');
      res += `\n)${inheritance}\n\n`;
    }
    return res;
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
