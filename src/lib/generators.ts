import { Schema, ASTType, ASTClass } from './types';
import { schemaToAST } from './ast';

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
    // 1. スキーマを AST へ一括コンパイル
    const astClasses = schemaToAST(schema, name);
    let res = "";

    // 2. 平坦化されたクラスを順番に出力（再帰は不要！）
    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const extendsStr = baseClass ? ` extends ${baseClass}` : "";

      const exportKeyword = (options.exportDefault && cls.name === 'Root') 
        ? `export default interface ${cls.name}${extendsStr}` 
        : `export interface ${cls.name}${extendsStr}`;
      
      res += `${exportKeyword} {\n`;
      const forceOptional = options.optionalFields;

      for (const field of cls.fields) {
        const optMark = (forceOptional || field.isOptional) ? '?' : '';
        let tsType = printASTType(field.fieldType);

        if (field.isNullable) {
          tsType = `(${tsType}) | null`;
        }

        res += `  ${field.name}${optMark}: ${tsType};\n`;
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
      if (type.format === 'email') return 'z.string().email()';
      if (type.format === 'url') return 'z.string().url()';
      if (type.format === 'uuid') return 'z.string().uuid()';
      return 'z.string()';
    case 'number':
      return 'z.number()';
    case 'boolean':
      return 'z.boolean()';
    default:
      return 'z.any()';
  }
};

export const zodGen = {
  generate: (schema: Schema, name: string = 'root', options: any = {}): string => {
    // 1. スキーマを AST へ一括コンパイル
    const astClasses = schemaToAST(schema, toPascalCase(name));
    let res = "";

    // 2. 各クラス（構造体）に対応する Zod スキーマを平坦に出力
    // トポロジカルソートで依存先を先に出力（前方参照エラーを防止し、循環時は z.lazy で対応）
    const { sorted: sortedClasses, cyclicClassRefs } = topoSortForZod(astClasses);
    for (const cls of sortedClasses) {
      const camelName = toCamelCase(cls.name);
      const baseClass = getBaseClass(cls);
      const baseCamel = baseClass ? toCamelCase(baseClass) : null;
      
      if (baseCamel) {
        res += `export const ${camelName}Schema = ${baseCamel}Schema.extend({\n`;
      } else {
        res += `export const ${camelName}Schema = z.object({\n`;
      }

      for (const field of cls.fields) {
        const isOpt = (options.optionalFields || field.isOptional) ? '.optional()' : '';
        const isNull = field.isNullable ? '.nullable()' : '';
        let zType = printZodASTType(field.fieldType, cyclicClassRefs, options);

        // Semantic Validator: フィールド名からバリデーションを自動付与
        const k = field.name.toLowerCase();
        if (field.fieldType.kind === 'number') {
          if (['age', 'price', 'amount', 'cost', 'fee', 'quantity', 'count', 'score', 'rating', 'rank'].some(w => k.includes(w))) {
            zType = zType + '.min(0)';
          }
          if (k.includes('rating') || k.includes('score')) {
            zType = zType + '.max(100)';
          }
        }
        if (field.fieldType.kind === 'string' && !field.fieldType.format) {
          if (k.includes('email')) zType = 'z.string().email()';
          else if (k.includes('url') || k.includes('link') || k.includes('website')) zType = 'z.string().url()';
          else if (k.includes('uuid') || k === 'id' || k.endsWith('_id') || k.endsWith('id')) zType = 'z.string().uuid()';
          else if (k.includes('phone') || k.includes('tel')) zType = 'z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)';
        }

        res += `  ${field.name}: ${zType}${isNull}${isOpt},\n`;
      }
      res += `});\n`;
      res += `export type ${cls.name} = z.infer<typeof ${camelName}Schema>;\n\n`;
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
        const dartType = printDartASTType(field.fieldType);
        res += `  final ${dartType} ${field.name};\n`;
      }
      res += `\n  ${cls.name}({\n`;
      for (const field of cls.fields) {
        res += `    required this.${field.name},\n`;
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

      res += `class ${cls.name}${inheritance} {\n`;
      for (const field of cls.fields) {
        const phpType = printPhpASTType(field.fieldType);
        res += `    public ${phpType} $${field.name};\n`;
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
        return `[${printGqlASTType(type.itemType)}]`;
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
            res += `  ${f.name}: ${gqlType}\n`;
          }
        }
      }

      for (const field of cls.fields) {
        const gqlType = printGqlASTType(field.fieldType);
        res += `  ${field.name}: ${gqlType}\n`;
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
  generate: (schema: Schema, name: string = 'Root', _options = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name));
    let res = "use serde::{Serialize, Deserialize};\n\n";

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
  generate: (schema: Schema, name: string = 'Root', _options = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name));
    const usesTime = astClasses.some(cls =>
  cls.fields.some(f => f.fieldType.kind === 'date' || f.fieldType.kind === 'datetime')
);
let res = usesTime
  ? "package main\n\nimport \"time\"\n\n"
  : "package main\n\n";

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

const printJavaASTType = (type: ASTType): string => {
  switch (type.kind) {
    case 'union': return 'Object';
    case 'enum': return 'String';
    case 'date':
    case 'datetime': return 'Date';
    case 'classRef': return type.classRefName ?? 'Object';
    case 'array':
      if (type.itemType) {
        return `List<${printJavaASTType(type.itemType)}>`;
      }
      return 'List<Object>';
    case 'string': return 'String';
    case 'number': return type.format === 'int' ? 'Long' : 'Double';
    case 'boolean': return 'Boolean';
    default: return 'Object';
  }
};

export const javaGen = {
  generate: (schema: Schema, name: string = 'Root', options: any = {}): string => {
    const astClasses = schemaToAST(schema, toPascalCase(name), options);
    let res = "";

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` extends ${baseClass}` : '';

      res += `public class ${cls.name}${inheritance} {\n`;
      for (const field of cls.fields) {
        const javaType = printJavaASTType(field.fieldType);
        res += `  private ${javaType} ${field.name};\n`;
      }
      res += `}\n\n`;
    }
    return res;
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
        const idTag = field.name === 'id' ? ' @id' : '';
        
        if (field.fieldType.kind === 'classRef') {
          const targetName = field.fieldType.classRefName;
          const relationField = `${field.name}Id`;
          
          // Try to find target ID type
          const targetCls = astClasses.find(c => c.name === targetName);
          const targetIdField = targetCls?.fields.find(f => f.name === 'id');
          const targetIdType = targetIdField ? printPrismaASTType(targetIdField.fieldType) : 'String';

          res += `  ${field.name} ${targetName}${opt} @relation(fields: [${relationField}], references: [id])\n`;
          res += `  ${relationField} ${targetIdType}${opt}\n`;
        } else {
          res += `  ${field.name} ${prismaType}${opt}${idTag}\n`;
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
    keys.slice(0, 8).forEach(k => {
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
    let res = "";

    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` : ${baseClass}` : '';
      res += `public class ${cls.name}${inheritance}\n{\n`;
      for (const field of cls.fields) {
        const csType = printCsharpASTType(field.fieldType);
        const nullable = (field.isOptional || field.isNullable) ? '?' : '';
        res += `    public ${csType}${nullable} ${toPascalCase(field.name)} { get; set; }\n`;
      }
      res += `}\n\n`;
    }
    return res;
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
    case 'datetime': return 'String // ISO 8601';
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
          type: 'object',
          properties: Object.keys(s.fields).reduce((acc, k) => ({ ...acc, [k]: build(s.fields![k]) }), {})
        };
        if (required.length > 0) res.required = required;
        if (s.nullable) res.nullable = true;
        return res;
      }
      if (s.type === 'array') {
        const res: any = { type: 'array', items: build(s.itemType!) };
        if (s.nullable) res.nullable = true;
        return res;
      }
      if (s.type === 'union' && s.unionTypes) {
        const res: any = { anyOf: s.unionTypes.map(t => ({ type: t })) };
        if (s.nullable) res.nullable = true;
        return res;
      }
      const leaf: any = { type: s.type };
      if (s.format) leaf.format = s.format;
      if (s.enumValues && s.enumValues.length > 0) leaf.enum = s.enumValues;
      if (s.nullable) leaf.nullable = true;
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
        if (keyLower === 'id' || keyLower.endsWith('id')) desc = 'Unique identifier for the record.';
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
