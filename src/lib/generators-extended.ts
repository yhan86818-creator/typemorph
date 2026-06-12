/**
 * TypeMorph Extended Generators — Batch 1: SQL & Data Formats
 */
import { Schema } from './types';
import yaml from 'js-yaml';

const toPascalCase = (s: string) =>
  s.replace(/(^\w|[_\s-]\w)/g, m => m.replace(/[_\s-]/, '').toUpperCase());
const toSnakeCase = (s: string) =>
  s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
const toScreamingSnake = (s: string) => toSnakeCase(s).toUpperCase();

// トップレベルが配列（行の集合）の場合は要素オブジェクトのフィールドを解決する。
// CSV / SQL INSERT / Markdown テーブルなどの主たる入力形状は「オブジェクトの配列」であり、
// 以前は配列ルートに対して空を返していたため出力が空になっていた。
const getFields = (schema: Schema): Record<string, Schema> => {
  if (schema.type === 'array' && schema.itemType) {
    return schema.itemType.fields ?? {};
  }
  return schema.fields ?? {};
};

// トップレベルが「オブジェクトの配列」の場合は要素オブジェクトを正準ルートとして扱う。
// レコード/モデル/バリデータ系ジェネレータは単一の構造を期待するため。
const rootObject = (s: Schema): Schema =>
  (s.type === 'array' && s.itemType) ? s.itemType : s;

// ─── SQL type mapping ────────────────────────────────────────────────────────
const sqlType = (
  s: Schema,
  dialect: 'mysql' | 'postgres' | 'sqlite' = 'postgres'
): string => {
  if (s.type === 'number') {
    const isInt = s.format === 'int';
    if (dialect === 'sqlite') return isInt ? 'INTEGER' : 'REAL';
    if (dialect === 'mysql') return isInt ? 'BIGINT' : 'DOUBLE';
    return isInt ? 'BIGINT' : 'DOUBLE PRECISION';
  }
  if (s.type === 'boolean') {
    return dialect === 'mysql' ? 'TINYINT(1)' : 'BOOLEAN';
  }
  if (s.type === 'object' || s.type === 'array' || s.type === 'union') {
    return dialect === 'postgres' ? 'JSONB' : 'JSON';
  }
  if (s.format === 'uuid') return dialect === 'mysql' ? 'CHAR(36)' : 'UUID';
  if (s.format === 'email') return 'VARCHAR(255)';
  if (s.format === 'url') return 'TEXT';
  if (s.format === 'datetime') return 'TIMESTAMP';
  return 'VARCHAR(255)';
};

// ─── CSV ─────────────────────────────────────────────────────────────────────
export const csvGen = {
  generate: (schema: Schema): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const headers = Object.keys(f).join(',');
    const row = Object.entries(f).map(([, v]) => {
      if (v.type === 'number') return '0';
      if (v.type === 'boolean') return 'true';
      if (v.format === 'uuid') return 'uuid-xxxx-xxxx';
      if (v.format === 'email') return 'user@example.com';
      if (v.format === 'url') return 'https://example.com';
      if (v.format === 'datetime') return new Date().toISOString();
      if (v.type === 'object' && v.fields) {
        return `"${JSON.stringify(Object.fromEntries(Object.entries(v.fields).map(([k2, v2]) => [k2, v2.type === 'number' ? 0 : v2.type === 'boolean' ? false : 'sample']))).replace(/"/g, '""')}"`;
      }
      if (v.type === 'array') return '"[]"';
      return '"sample_value"';
    }).join(',');
    return `${headers}\n${row}\n`;
  }
};

// ─── SQL INSERT ───────────────────────────────────────────────────────────────
export const sqlInsertGen = {
  generate: (schema: Schema, name: string = 'table_name'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const cols = Object.keys(f).map(k => `"${k}"`).join(', ');
    const vals = Object.entries(f).map(([, v]) => {
      if (v.type === 'number') return '0';
      if (v.type === 'boolean') return 'TRUE';
      if (v.format === 'uuid') return "'uuid-xxxx-xxxx'";
      if (v.format === 'email') return "'user@example.com'";
      if (v.format === 'datetime') return `'${new Date().toISOString()}'`;
      if (v.type === 'object' && v.fields) {
        const nested = Object.fromEntries(Object.entries(v.fields).map(([k2, v2]) => [k2, v2.type === 'number' ? 0 : v2.type === 'boolean' ? false : 'sample']));
        return `'${JSON.stringify(nested).replace(/'/g, "''")}'`;
      }
      if (v.type === 'array') return "'[]'";
      return "'sample_value'";
    }).join(', ');
    return `INSERT INTO "${toSnakeCase(name)}" (${cols})\nVALUES (${vals});\n`;
  }
};

// ─── MySQL DDL ────────────────────────────────────────────────────────────────
export const mysqlGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    
    const hasId = 'id' in f;
    const hasCreatedAt = 'created_at' in f || 'createdAt' in f;
    const hasUpdatedAt = 'updated_at' in f || 'updatedAt' in f;

    let res = `CREATE TABLE \`${toSnakeCase(name)}\` (\n`;
    
    if (!hasId) {
      res += `  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,\n`;
    }

    for (const [k, v] of Object.entries(f)) {
      const nullable = v.optional ? ' NULL' : ' NOT NULL';
      const isId = k.toLowerCase() === 'id';
      const autoInc = isId ? ' AUTO_INCREMENT' : '';
      const pk = isId ? ' PRIMARY KEY' : '';
      res += `  \`${toSnakeCase(k)}\` ${sqlType(v, 'mysql')}${nullable}${autoInc}${pk},\n`;
    }

    if (!hasCreatedAt) {
      res += `  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    }
    if (!hasUpdatedAt) {
      res += `  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n`;
    } else {
      // updated_at already exists in the schema fields above; remove the trailing comma
      // since we're not appending any more lines after it.
      res = res.replace(/,\s*$/, '\n');
    }
    
    res += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;\n`;
    return res;
  }
};

// ─── PostgreSQL DDL ───────────────────────────────────────────────────────────
export const postgresGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    
    const hasId = 'id' in f;
    const hasCreatedAt = 'created_at' in f || 'createdAt' in f;
    const hasUpdatedAt = 'updated_at' in f || 'updatedAt' in f;
    
    const table = toSnakeCase(name);
    let res = `CREATE TABLE "${table}" (\n`;
    
    if (!hasId) {
      res += `  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),\n`;
    }

    for (const [k, v] of Object.entries(f)) {
      const nullable = v.optional ? '' : ' NOT NULL';
      const isId = k.toLowerCase() === 'id';
      const pk = isId ? ' PRIMARY KEY' : '';
      res += `  "${toSnakeCase(k)}" ${sqlType(v, 'postgres')}${nullable}${pk},\n`;
    }

    if (!hasCreatedAt) {
      res += `  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),\n`;
    }
    if (!hasUpdatedAt) {
      res += `  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()\n`;
    } else {
      res = res.replace(/,\s*$/, '\n');
    }

    res += `);\n`;
    return res;
  }
};

// ─── SQLite DDL ───────────────────────────────────────────────────────────────
export const sqliteGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    
    const hasId = 'id' in f;
    const hasCreatedAt = 'created_at' in f || 'createdAt' in f;
    const hasUpdatedAt = 'updated_at' in f || 'updatedAt' in f;

    let res = `CREATE TABLE IF NOT EXISTS "${toSnakeCase(name)}" (\n`;
    
    if (!hasId) {
      res += `  "id" INTEGER PRIMARY KEY AUTOINCREMENT,\n`;
    }

    for (const [k, v] of Object.entries(f)) {
      const nullable = v.optional ? '' : ' NOT NULL';
      const isId = k.toLowerCase() === 'id';
      const pk = isId ? ' PRIMARY KEY' : '';
      res += `  "${toSnakeCase(k)}" ${sqlType(v, 'sqlite')}${nullable}${pk},\n`;
    }

    if (!hasCreatedAt) {
      res += `  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),\n`;
    }
    if (!hasUpdatedAt) {
      res += `  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))\n`;
    } else {
      res = res.replace(/,\s*$/, '\n');
    }

    res += `);\n`;
    return res;
  }
};

// ─── Snowflake DDL ────────────────────────────────────────────────────────────
export const snowflakeGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    let res = `CREATE OR REPLACE TABLE ${toScreamingSnake(name)} (\n`;
    res += `  ID VARCHAR(36) NOT NULL DEFAULT UUID_STRING(),\n`;
    for (const [k, v] of Object.entries(f)) {
      const col = toScreamingSnake(k);
      let type = 'VARCHAR';
      if (v.type === 'number') type = 'DOUBLE';
      else if (v.type === 'boolean') type = 'BOOLEAN';
      else if (v.type === 'object' || v.type === 'array') type = 'VARIANT';
      else if (v.format === 'datetime') type = 'TIMESTAMP_NTZ';
      res += `  ${col} ${type}${v.optional ? '' : ' NOT NULL'},\n`;
    }
    res += `  CREATED_AT TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()\n`;
    res += `);\n`;
    return res;
  }
};

// ─── TOML ─────────────────────────────────────────────────────────────────────
export const tomlGen = {
  generate: (schema: Schema, name: string = 'config'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    let res = `[${toSnakeCase(name)}]\n`;
    for (const [k, v] of Object.entries(f)) {
      if (v.type === 'object' && v.fields) {
        res += `\n[${toSnakeCase(name)}.${toSnakeCase(k)}]\n`;
        for (const [k2, v2] of Object.entries(v.fields)) {
          res += `${toSnakeCase(k2)} = ${tomlValue(v2)}\n`;
        }
      } else if (v.type === 'array') {
        const itemType = v.itemType?.type;
        const sample = itemType === 'number' ? '0' : itemType === 'boolean' ? 'false' : '"sample_value"';
        res += `${toSnakeCase(k)} = [${sample}]\n`;
      } else {
        res += `${toSnakeCase(k)} = ${tomlValue(v)}\n`;
      }
    }
    return res;
  }
};

const tomlValue = (v: Schema): string => {
  if (v.type === 'number') return '0';
  if (v.type === 'boolean') return 'false';
  if (v.format === 'datetime') return `"2024-01-01T00:00:00Z"`;
  return '"sample_value"';
};

// ─── YAML output ─────────────────────────────────────────────────────────────
export const yamlOutputGen = {
  generate: (schema: Schema): string => {
    const buildSample = (s: Schema): any => {
      if (s.type === 'object' && s.fields) {
        return Object.fromEntries(
          Object.entries(s.fields).map(([k, v]) => [k, buildSample(v)])
        );
      }
      if (s.type === 'array') return [buildSample(s.itemType ?? { type: 'string' })];
      if (s.type === 'number') return 0;
      if (s.type === 'boolean') return false;
      if (s.format === 'uuid') return 'uuid-xxxx-xxxx';
      if (s.format === 'email') return 'user@example.com';
      if (s.format === 'url') return 'https://example.com';
      if (s.format === 'datetime') return '2024-01-01T00:00:00Z';
      return 'sample_value';
    };
    return yaml.dump(buildSample(schema), { indent: 2 });
  }
};

// ─── ENV ─────────────────────────────────────────────────────────────────────
export const envGen = {
  generate: (schema: Schema): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const flattenEnv = (fields: Record<string, Schema>, prefix: string): string => {
      let out = '';
      for (const [k, v] of Object.entries(fields)) {
        const key = toScreamingSnake(prefix ? `${prefix}_${k}` : k);
        if (v.type === 'object' && v.fields) {
          out += flattenEnv(v.fields, prefix ? `${prefix}_${k}` : k);
        } else if (v.type === 'array') {
          out += `${key}=\n`;
        } else {
          let val = 'your_value_here';
          if (v.type === 'number') val = '0';
          else if (v.type === 'boolean') val = 'false';
          else if (v.format === 'uuid') val = 'uuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
          else if (v.format === 'email') val = 'user@example.com';
          else if (v.format === 'url') val = 'https://example.com';
          else if (v.format === 'datetime') val = '2024-01-01T00:00:00Z';
          out += `${key}=${val}\n`;
        }
      }
      return out;
    };
    let res = `# Generated by TypeMorph\n`;
    res += flattenEnv(f, '');
    return res;
  }
};

// ─── .properties ─────────────────────────────────────────────────────────────
export const propertiesGen = {
  generate: (schema: Schema): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const flattenProps = (fields: Record<string, Schema>, prefix: string): string => {
      let out = '';
      for (const [k, v] of Object.entries(fields)) {
        const key = (prefix ? `${prefix}.${toSnakeCase(k)}` : toSnakeCase(k)).replace(/_/g, '.');
        if (v.type === 'object' && v.fields) {
          out += flattenProps(v.fields, key);
        } else if (v.type === 'array') {
          out += `${key}=\n`;
        } else {
          let val = 'sample_value';
          if (v.type === 'number') val = '0';
          else if (v.type === 'boolean') val = 'false';
          else if (v.format === 'datetime') val = '2024-01-01T00:00:00Z';
          out += `${key}=${val}\n`;
        }
      }
      return out;
    };
    let res = `# Generated by TypeMorph\n`;
    res += flattenProps(f, '');
    return res;
  }
};

// ─── Markdown Table ───────────────────────────────────────────────────────────
export const markdownTableGen = {
  generate: (schema: Schema): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const keys = Object.keys(f);
    const header = `| ${keys.join(' | ')} |`;
    const sep = `| ${keys.map(() => '---').join(' | ')} |`;
    const row = `| ${Object.entries(f).map(([, v]) => {
      if (v.type === 'number') return '0';
      if (v.type === 'boolean') return 'true';
      if (v.format === 'email') return 'user@example.com';
      if (v.type === 'object' && v.fields) {
        return '`' + JSON.stringify(Object.fromEntries(Object.entries(v.fields).map(([k2, v2]) => [k2, v2.type === 'number' ? 0 : v2.type === 'boolean' ? false : 'sample']))) + '`';
      }
      if (v.type === 'array') return '`[]`';
      return 'sample';
    }).join(' | ')} |`;
    return `${header}\n${sep}\n${row}\n`;
  }
};

// ─── AsciiDoc Table ───────────────────────────────────────────────────────────
export const asciidocTableGen = {
  generate: (schema: Schema): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const keys = Object.keys(f);
    let res = `[cols="${keys.map(() => '1').join(',')}",options="header"]\n|===\n`;
    res += `| ${keys.join(' | ')}\n`;
    res += `| ${Object.entries(f).map(([, v]) => v.type === 'number' ? '0' : 'sample').join(' | ')}\n`;
    res += `|===\n`;
    return res;
  }
};

// ─── LaTeX Table ─────────────────────────────────────────────────────────────
export const latexTableGen = {
  generate: (schema: Schema): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const keys = Object.keys(f);
    let res = `\\begin{tabular}{${keys.map(() => 'l').join('|')}}\n`;
    res += `\\hline\n`;
    res += keys.join(' & ') + ` \\\\\n\\hline\n`;
    res += Object.entries(f).map(([, v]) => {
      if (v.type === 'number') return '0';
      if (v.type === 'boolean') return 'false';
      if (v.type === 'object') return '\\{...\\}';
      if (v.type === 'array') return '[...]';
      if (v.format === 'email') return 'user@example.com';
      if (v.format === 'datetime') return '2024-01-01T00:00:00Z';
      return 'sample\\_value';
    }).join(' & ') + ` \\\\\n`;
    res += `\\hline\n\\end{tabular}\n`;
    return res;
  }
};

// ─── Mermaid ER Diagram ───────────────────────────────────────────────────────
export const mermaidERGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    let res = `erDiagram\n`;
    res += `  ${toPascalCase(name)} {\n`;
    for (const [k, v] of Object.entries(f)) {
      let type = 'string';
      if (v.type === 'number') type = 'float';
      else if (v.type === 'boolean') type = 'boolean';
      else if (v.type === 'object') type = 'object';
      else if (v.type === 'array') type = 'array';
      res += `    ${type} ${k}\n`;
    }
    res += `  }\n`;
    // Add nested entity relationships
    for (const [k, v] of Object.entries(f)) {
      if (v.type === 'object' && v.fields) {
        const childName = toPascalCase(k);
        res += `  ${childName} {\n`;
        for (const [k2, v2] of Object.entries(v.fields)) {
          let t2 = 'string';
          if (v2.type === 'number') t2 = 'float';
          else if (v2.type === 'boolean') t2 = 'boolean';
          res += `    ${t2} ${k2}\n`;
        }
        res += `  }\n`;
        res += `  ${toPascalCase(name)} ||--o{ ${childName} : "has"\n`;
      }
      if (v.type === 'array' && v.itemType?.type === 'object' && v.itemType.fields) {
        const childName = toPascalCase(k) + 'Item';
        res += `  ${childName} {\n`;
        for (const [k2, v2] of Object.entries(v.itemType.fields)) {
          res += `    ${v2.type === 'number' ? 'float' : 'string'} ${k2}\n`;
        }
        res += `  }\n`;
        res += `  ${toPascalCase(name)} ||--o{ ${childName} : "contains"\n`;
      }
    }
    return res;
  }
};

// ─── Avro Schema ─────────────────────────────────────────────────────────────
const avroType = (s: Schema): any => {
  if (s.type === 'number') return 'double';
  if (s.type === 'boolean') return 'boolean';
  if (s.type === 'object' && s.fields) {
    return {
      type: 'record',
      name: 'NestedRecord',
      fields: Object.entries(s.fields).map(([n, v]) => ({
        name: n,
        type: v.optional ? ['null', avroType(v)] : avroType(v),
      })),
    };
  }
  if (s.type === 'array') {
    return { type: 'array', items: avroType(s.itemType ?? { type: 'string' }) };
  }
  if (s.type === 'union' && s.unionTypes) return s.unionTypes.map(t => t === 'number' ? 'double' : t);
  return 'string';
};

export const avroGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const avroSchema = {
      type: 'record',
      name: toPascalCase(name),
      namespace: 'com.example',
      fields: Object.entries(f).map(([k, v]) => ({
        name: k,
        type: v.optional ? ['null', avroType(v)] : avroType(v),
        default: v.optional ? null : undefined,
      })),
    };
    return JSON.stringify(avroSchema, null, 2);
  }
};

// ─── BigQuery Schema ──────────────────────────────────────────────────────────
const bqField = (name: string, s: Schema): any => {
  const mode = s.optional ? 'NULLABLE' : 'REQUIRED';
  if (s.type === 'number') return { name, type: 'FLOAT64', mode };
  if (s.type === 'boolean') return { name, type: 'BOOL', mode };
  if (s.format === 'datetime') return { name, type: 'TIMESTAMP', mode };
  if (s.type === 'object' && s.fields) {
    return {
      name,
      type: 'RECORD',
      mode,
      fields: Object.entries(s.fields).map(([k, v]) => bqField(k, v)),
    };
  }
  if (s.type === 'array') {
    const item = s.itemType ?? { type: 'string' };
    if (item.type === 'object' && item.fields) {
      return {
        name,
        type: 'RECORD',
        mode: 'REPEATED',
        fields: Object.entries(item.fields).map(([k, v]) => bqField(k, v)),
      };
    }
    return { name, type: bqField('_item', item).type, mode: 'REPEATED' };
  }
  return { name, type: 'STRING', mode };
};

export const bigQueryGen = {
  generate: (schema: Schema): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const bqSchema = Object.entries(f).map(([k, v]) => bqField(k, v));
    return JSON.stringify(bqSchema, null, 2);
  }
};

// ─── DynamoDB JSON ────────────────────────────────────────────────────────────
const dynamoValue = (s: Schema): any => {
  if (s.type === 'number') return { N: '0' };
  if (s.type === 'boolean') return { BOOL: false };
  if (s.type === 'array') {
    const item = s.itemType ?? { type: 'string' };
    return { L: [dynamoValue(item)] };
  }
  if (s.type === 'object' && s.fields) {
    return { M: Object.fromEntries(Object.entries(s.fields).map(([k, v]) => [k, dynamoValue(v)])) };
  }
  if (s.type === 'object') return { M: {} };
  if (s.format === 'datetime') return { S: '2024-01-01T00:00:00Z' };
  if (s.format === 'uuid') return { S: 'uuid-xxxx-xxxx' };
  if (s.format === 'email') return { S: 'user@example.com' };
  if (s.format === 'url') return { S: 'https://example.com' };
  return { S: 'sample_value' };
};

export const dynamoDBGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const item: any = {
      TableName: toSnakeCase(name) + 's',
      Item: {
        id: { S: 'uuid-xxxx-xxxx' },
        ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, dynamoValue(v)])),
      },
    };
    return JSON.stringify(item, null, 2);
  }
};

// ─── OpenAPI 3.0 ─────────────────────────────────────────────────────────────
const openApiPropType = (s: Schema): any => {
  if (s.type === 'union' && s.unionTypes) {
    const res: any = { anyOf: s.unionTypes.map(t => ({ type: t })) };
    if (s.nullable) res.nullable = true;
    return res;
  }
  if (s.type === 'number') {
    const res: any = { type: 'number', format: 'double' };
    if (s.enumValues && s.enumValues.length) res.enum = s.enumValues;
    if (s.nullable) res.nullable = true;
    return res;
  }
  if (s.type === 'boolean') {
    return s.nullable ? { type: 'boolean', nullable: true } : { type: 'boolean' };
  }
  if (s.type === 'array') {
    const res: any = { type: 'array', items: openApiPropType(s.itemType ?? { type: 'string' }) };
    if (s.nullable) res.nullable = true;
    return res;
  }
  if (s.type === 'object' && s.fields) {
    const res: any = {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(s.fields).map(([k, v]) => [k, openApiPropType(v)])
      ),
    };
    if (s.nullable) res.nullable = true;
    return res;
  }
  const base: any = { type: 'string' };
  if (s.format === 'uuid') base.format = 'uuid';
  else if (s.format === 'email') base.format = 'email';
  else if (s.format === 'url') base.format = 'uri';
  else if (s.format === 'datetime') { base.type = 'string'; base.format = 'date-time'; }
  
  if (s.enumValues && s.enumValues.length) base.enum = s.enumValues;
  if (s.nullable) base.nullable = true;
  return base;
};

export const openApiGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    const schemaName = toPascalCase(name);
    const required = Object.entries(f).filter(([, v]) => !v.optional).map(([k]) => k);
    const spec = {
      openapi: '3.0.3',
      info: { title: `${schemaName} API`, version: '1.0.0' },
      paths: {
        [`/${toSnakeCase(name)}s`]: {
          get: {
            summary: `List ${schemaName}s`,
            responses: {
              '200': {
                description: 'Success',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { $ref: `#/components/schemas/${schemaName}` } },
                  },
                },
              },
            },
          },
          post: {
            summary: `Create ${schemaName}`,
            requestBody: {
              required: true,
              content: {
                'application/json': { schema: { $ref: `#/components/schemas/${schemaName}` } },
              },
            },
            responses: { '201': { description: 'Created' } },
          },
        },
      },
      components: {
        schemas: {
          [schemaName]: {
            type: 'object',
            ...(required.length ? { required } : {}),
            properties: Object.fromEntries(
              Object.entries(f).map(([k, v]) => [k, openApiPropType(v)])
            ),
          },
        },
      },
    };
    return yaml.dump(spec, { indent: 2 });
  }
};

// ─── Postman Collection ───────────────────────────────────────────────────────
export const postmanGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const entity = toPascalCase(name);
    const base = `https://api.example.com/${toSnakeCase(name)}s`;
    const collection = {
      info: { name: `${entity} API`, schema: 'https://schema.getpostman.com/json/collection/v2.1.0/' },
      item: [
        { name: `GET all ${entity}s`, request: { method: 'GET', url: { raw: base } } },
        {
          name: `POST create ${entity}`,
          request: {
            method: 'POST',
            url: { raw: base },
            header: [{ key: 'Content-Type', value: 'application/json' }],
            body: { mode: 'raw', raw: '{}' },
          },
        },
        { name: `GET ${entity} by ID`, request: { method: 'GET', url: { raw: `${base}/:id` } } },
        { name: `PUT update ${entity}`, request: { method: 'PUT', url: { raw: `${base}/:id` } } },
        { name: `DELETE ${entity}`, request: { method: 'DELETE', url: { raw: `${base}/:id` } } },
      ],
    };
    return JSON.stringify(collection, null, 2);
  }
};

// ─── HTTP File ────────────────────────────────────────────────────────────────
export const httpFileGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const base = `https://api.example.com/${toSnakeCase(name)}s`;
    const f = getFields(schema);
    const body = JSON.stringify(
      Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.type === 'number' ? 0 : v.type === 'boolean' ? false : 'sample'])),
      null, 2
    );
    return [
      `### Get all ${name}s`,
      `GET ${base}`,
      `Accept: application/json`,
      ``,
      `###`,
      ``,
      `### Create ${name}`,
      `POST ${base}`,
      `Content-Type: application/json`,
      ``,
      body,
      ``,
      `###`,
      ``,
      `### Get ${name} by ID`,
      `GET ${base}/{{id}}`,
      ``,
      `###`,
    ].join('\n');
  }
};

// ─── VS Code Snippet ──────────────────────────────────────────────────────────
export const vscodeSnippetGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    const keys = Object.keys(f);
    let idx = 1;
    const body = [
      `{`,
      ...keys.map(k => {
        const v = f[k];
        const placeholder = v.type === 'number' ? '0' : v.type === 'boolean' ? 'false' : `\${${idx++}:${k}}`;
        return `  "${k}": ${v.type === 'string' || v.format ? `"${placeholder}"` : placeholder},`;
      }),
      `}`,
    ];
    const snippet = {
      [`${toPascalCase(name)} Scaffold`]: {
        prefix: `${name.toLowerCase()}-scaffold`,
        body,
        description: `Generated by TypeMorph: ${toPascalCase(name)} scaffold`,
      },
    };
    return JSON.stringify(snippet, null, 2);
  }
};

// ─── cURL output ─────────────────────────────────────────────────────────────
export const curlOutputGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    const buildSampleValue = (v: Schema): any => {
      if (v.type === 'number') return 0;
      if (v.type === 'boolean') return false;
      if (v.type === 'object' && v.fields) {
        return Object.fromEntries(Object.entries(v.fields).map(([k2, v2]) => [k2, buildSampleValue(v2)]));
      }
      if (v.type === 'array') {
        return v.itemType ? [buildSampleValue(v.itemType)] : [];
      }
      if (v.format === 'uuid') return 'uuid-xxxx-xxxx';
      if (v.format === 'email') return 'user@example.com';
      if (v.format === 'url') return 'https://example.com';
      if (v.format === 'datetime') return '2024-01-01T00:00:00Z';
      return 'sample';
    };
    const body = JSON.stringify(
      Object.fromEntries(Object.entries(f).map(([k, v]) => [k, buildSampleValue(v)])),
      null, 2
    );
    return `curl -X POST https://api.example.com/${toSnakeCase(name)}s \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer YOUR_TOKEN' \\\n  -d '${body}'\n`;
  }
};

// =============================================================================
// TypeMorph Extended Generators — Batch 2: ORMs & Frontend / Validation Schemas
// =============================================================================

// ─── Mongoose Schema & Model ──────────────────────────────────────────────────
export const mongooseGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    schema = rootObject(schema);
    const modelName = toPascalCase(name);
    const schemaName = `${modelName}Schema`;

    const buildSchemaFields = (s: Schema, indent: string = '  '): string => {
      const f = getFields(s);
      let res = '{\n';
      for (const [k, v] of Object.entries(f)) {
        res += `${indent}  ${k}: `;
        if (v.type === 'object') {
          res += buildSchemaFields(v, indent + '  ') + ',\n';
        } else if (v.type === 'array') {
          const item = v.itemType;
          if (item?.type === 'object') {
            res += `[${buildSchemaFields(item, indent + '  ')}],\n`;
          } else {
            let typeStr = 'String';
            if (item?.type === 'number') typeStr = 'Number';
            else if (item?.type === 'boolean') typeStr = 'Boolean';
            else if (item?.type === 'union' || item?.type === 'any') typeStr = 'Schema.Types.Mixed';
            else if (item?.enumValues && item.enumValues.length) typeStr = 'String'; // enum → String with enum option
            res += `[${typeStr}],\n`;
          }
        } else {
          let typeStr = 'String';
          if (v.type === 'number') typeStr = 'Number';
          else if (v.type === 'boolean') typeStr = 'Boolean';
          else if (v.type === 'union') typeStr = 'Schema.Types.Mixed';

          let opts = `type: ${typeStr}`;
          if (!v.optional) opts += `, required: true`;
          if (v.enumValues && v.enumValues.length) {
            opts += `, enum: [${v.enumValues.map(e => `"${e}"`).join(', ')}]`;
          }
          res += `{ ${opts} },\n`;
        }
      }
      res += `${indent}}`;
      return res;
    };

    if (schema.type === 'object') {
      let out = `import mongoose, { Schema, Document } from 'mongoose';\n\n`;
      out += `const ${schemaName} = new Schema(${buildSchemaFields(schema)}, { timestamps: true });\n\n`;
      out += `export interface I${modelName} extends Document {}\n`;
      out += `export const ${modelName} = mongoose.models.${modelName} || mongoose.model<I${modelName}>('${modelName}', ${schemaName});\n`;
      return out;
    }
    return '';
  }
};

// ─── Sequelize Model ──────────────────────────────────────────────────────────
export const sequelizeGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const modelName = toPascalCase(name);
    let res = `import { DataTypes, Model } from 'sequelize';\nimport sequelize from '../config/database';\n\n`;
    res += `export class ${modelName} extends Model {}\n\n`;
    res += `${modelName}.init({\n`;
    res += `  id: {\n    type: DataTypes.UUID,\n    defaultValue: DataTypes.UUIDV4,\n    primaryKey: true\n  },\n`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'DataTypes.STRING';
      if (v.type === 'number') typeStr = 'DataTypes.DOUBLE';
      else if (v.type === 'boolean') typeStr = 'DataTypes.BOOLEAN';
      else if (v.type === 'object' || v.type === 'array' || v.type === 'union') typeStr = 'DataTypes.JSON';
      else if (v.format === 'datetime') typeStr = 'DataTypes.DATE';

      if (v.enumValues && v.enumValues.length) {
        typeStr = `DataTypes.ENUM(${v.enumValues.map(e => `'${e}'`).join(', ')})`;
      }

      res += `  ${k}: {\n    type: ${typeStr},\n    allowNull: ${!!v.optional || !!v.nullable}\n  },\n`;
    }
    res += `}, {\n  sequelize,\n  modelName: '${modelName}',\n  tableName: '${toSnakeCase(name)}s',\n  timestamps: true\n});\n`;
    return res;
  }
};

// ─── TypeORM Entity ───────────────────────────────────────────────────────────
export const typeormGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const modelName = toPascalCase(name);
    let res = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';\n\n`;
    res += `@Entity('${toSnakeCase(name)}s')\n`;
    res += `export class ${modelName} {\n`;
    if (!f.id) {
      res += `  @PrimaryGeneratedColumn('uuid')\n  id!: string;\n\n`;
    }
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      let colDecorator = `@Column()`;
      if (v.type === 'number') {
        typeStr = 'number';
        colDecorator = `@Column('double')`;
      } else if (v.type === 'boolean') {
        typeStr = 'boolean';
        colDecorator = `@Column('boolean')`;
      } else if (v.type === 'object' || v.type === 'array' || v.type === 'union') {
        typeStr = 'any';
        colDecorator = `@Column('jsonb')`;
      } else if (v.format === 'datetime') {
        typeStr = 'Date';
        colDecorator = `@Column('timestamp')`;
      }
      
      if (v.enumValues && v.enumValues.length) {
        const enumTypeStr = v.enumValues.map(e => `'${e}'`).join(' | ');
        typeStr = enumTypeStr;
        // Build enum decorator options, include nullable if needed
        const enumOpts = [`type: 'enum'`, `enum: [${enumTypeStr}]`];
        if (v.nullable) enumOpts.push('nullable: true');
        colDecorator = `@Column({\n    ${enumOpts.join(',\n    ')}\n  })`;
      }
      
      // For non-enum decorators, inject nullable option if needed
      if (v.nullable && !(v.enumValues && v.enumValues.length)) {
        colDecorator = colDecorator.replace(/\)$/, `, nullable: true)`);
      }
      res += `  ${colDecorator}\n  ${k}${v.optional ? '?' : '!'}: ${typeStr}${v.nullable ? ' | null' : ''};\n\n`;
    }
    if (!f.createdAt && !f.created_at) {
      res += `  @CreateDateColumn()\n  createdAt!: Date;\n\n`;
    }
    if (!f.updatedAt && !f.updated_at) {
      res += `  @UpdateDateColumn()\n  updatedAt!: Date;\n`;
    }
    res += `}\n`;
    return res;
  }
};

// ─── Drizzle Schema ───────────────────────────────────────────────────────────
export const drizzleGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const tableName = `${toSnakeCase(name)}s`;
    let res = `import { pgTable, uuid, varchar, doublePrecision, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';\n\n`;
    res += `export const ${toSnakeCase(name)} = pgTable('${tableName}', {\n`;
    if (!f.id) {
      res += `  id: uuid('id').defaultRandom().primaryKey(),\n`;
    }
    for (const [k, v] of Object.entries(f)) {
      const dbCol = toSnakeCase(k);
      let colBuilder = `varchar('${dbCol}', { length: 255 })`;
      if (v.type === 'number') colBuilder = `doublePrecision('${dbCol}')`;
      else if (v.type === 'boolean') colBuilder = `boolean('${dbCol}')`;
      else if (v.type === 'object' || v.type === 'array' || v.type === 'union') colBuilder = `jsonb('${dbCol}')`;
      else if (v.format === 'datetime') colBuilder = `timestamp('${dbCol}')`;

      // Simplified Drizzle enum: normally declared outside, but inline string enums mapped here for simplicity
      if (v.enumValues && v.enumValues.length) {
        colBuilder = `varchar('${dbCol}', { enum: [${v.enumValues.map(e => `'${e}'`).join(', ')}] })`;
      }

      const notNull = (v.optional || v.nullable) ? '' : '.notNull()';
      res += `  ${k}: ${colBuilder}${notNull},\n`;
    }
    if (!f.createdAt && !f.created_at) {
      res += `  createdAt: timestamp('created_at').defaultNow().notNull(),\n`;
    }
    if (!f.updatedAt && !f.updated_at) {
      res += `  updatedAt: timestamp('updated_at').defaultNow().notNull()\n`;
    }
    res = res.replace(/,\n$/, '\n'); // Remove trailing comma if last element
    res += `});\n`;
    return res;
  }
};

// ─── Kysely Schema ────────────────────────────────────────────────────────────
export const kyselyGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const interfaceName = toPascalCase(name);
    let res = `import { Generated, ColumnType } from 'kysely';\n\n`;
    res += `export interface ${interfaceName}Table {\n`;
    if (!f.id) {
      res += `  id: Generated<string>;\n`;
    }
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      if (v.type === 'number') typeStr = 'number';
      else if (v.type === 'boolean') typeStr = 'boolean';
      else if (v.type === 'object' || v.type === 'array') typeStr = 'unknown';
      else if (v.format === 'datetime') typeStr = 'Date | string';

      const typeWithNull = v.optional ? `${typeStr} | null` : typeStr;
      res += `  ${k}: ${typeWithNull};\n`;
    }
    if (!f.createdAt && !f.created_at) {
      res += `  createdAt: Generated<string>;\n`;
    }
    if (!f.updatedAt && !f.updated_at) {
      res += `  updatedAt: ColumnType<string, string | undefined, string>;\n`;
    }
    res += `}\n\n`;
    res += `export interface Database {\n`;
    res += `  ${toSnakeCase(name)}s: ${interfaceName}Table;\n`;
    res += `}\n`;
    return res;
  }
};

// ─── Yup Schema ───────────────────────────────────────────────────────────────
export const yupGen = {
  generate: (schema: Schema, name: string = 'root', _seen: Set<string> = new Set()): string => {
    schema = rootObject(schema);
    if (schema.type === 'object' && schema.fields) {
      if (_seen.has(name)) return '';
      _seen.add(name);
      
      let res = '';
      if (_seen.size === 1) {
        res += `import * as yup from 'yup';\n\n`;
      }
      res += `export const ${name}YupSchema = yup.object({\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const nullable = v.nullable ? '.nullable()' : '';
        const required = v.optional ? '' : '.required()';
        const childSchemaName = name + toPascalCase(k);
        let yupType = '';
        if (v.type === 'object') {
          yupType = `${childSchemaName}YupSchema`;
        } else if (v.type === 'array') {
          const item = v.itemType;
          let innerYup: string;
          if (item?.type === 'string' && item.enumValues) {
            innerYup = `yup.string().oneOf([${item.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
          } else {
            innerYup = item?.type === 'object' ? `${childSchemaName}ItemYupSchema` : `yup.${item?.type ?? 'string'}()`;
          }
          yupType = `yup.array().of(${innerYup})`;
        } else if (v.type === 'union' && v.unionTypes) {
          // Union types have mixed types — yup.mixed() is the correct representation.
          // Do NOT use oneOf() with type name strings like oneOf(["string","number"]) — that checks values, not types.
          yupType = `yup.mixed()`;
        } else if (v.type === 'string' && v.enumValues) {
          yupType = `yup.string().oneOf([${v.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
        } else if (v.type === 'string') {
          yupType = 'yup.string()';
          if (v.format === 'email') yupType += '.email()';
          else if (v.format === 'url') yupType += '.url()';
          else if (v.format === 'uuid') yupType += '.uuid()';
        } else {
          // 'any' type → yup.mixed() (yup.any() does not exist)
          yupType = v.type === 'any' ? 'yup.mixed()' : `yup.${v.type}()`;
        }
        res += `  ${k}: ${yupType}${nullable}${required},\n`;
      }
      res += `});\n\n`;

      for (const [k, v] of Object.entries(schema.fields)) {
        const childName = name + toPascalCase(k);
        if (v.type === 'object') res += yupGen.generate(v, childName, _seen);
        if (v.type === 'array' && v.itemType?.type === 'object') res += yupGen.generate(v.itemType, childName + 'Item', _seen);
      }
      return res;
    }
    return '';
  }
};

// ─── Joi Schema ───────────────────────────────────────────────────────────────
export const joiGen = {
  generate: (schema: Schema, name: string = 'root', _seen: Set<string> = new Set()): string => {
    schema = rootObject(schema);
    if (schema.type === 'object' && schema.fields) {
      if (_seen.has(name)) return '';
      _seen.add(name);
      
      let res = '';
      if (_seen.size === 1) {
        res += `import Joi from 'joi';\n\n`;
      }
      res += `export const ${name}JoiSchema = Joi.object({\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const nullable = v.nullable ? '.allow(null)' : '';
        const required = v.optional ? '' : '.required()';
        const childSchemaName = name + toPascalCase(k);
        let joiType = '';
        if (v.type === 'object') {
          joiType = `${childSchemaName}JoiSchema`;
        } else if (v.type === 'array') {
          const item = v.itemType;
          let innerJoi: string;
          if (item?.type === 'string' && item.enumValues) {
            innerJoi = `Joi.string().valid(${item.enumValues.map(ev => `"${ev}"`).join(', ')})`;
          } else {
            innerJoi = item?.type === 'object' ? `${childSchemaName}ItemJoiSchema` : `Joi.${item?.type ?? 'string'}()`;
          }
          joiType = `Joi.array().items(${innerJoi})`;
        } else if (v.type === 'union' && v.unionTypes) {
          joiType = `Joi.alternatives().try(${v.unionTypes.map(ut => `Joi.valid(${typeof ut === 'string' ? `"${ut}"` : ut})`).join(', ')})`;
        } else if (v.type === 'string' && v.enumValues) {
          joiType = `Joi.string().valid(${v.enumValues.map(ev => `"${ev}"`).join(', ')})`;
        } else if (v.type === 'string') {
          joiType = 'Joi.string()';
          if (v.format === 'email') joiType += '.email()';
          else if (v.format === 'url') joiType += '.uri()';
          else if (v.format === 'uuid') joiType += '.guid()';
        } else {
          joiType = `Joi.${v.type}()`;
        }
        res += `  ${k}: ${joiType}${nullable}${required},\n`;
      }
      res += `});\n\n`;

      for (const [k, v] of Object.entries(schema.fields)) {
        const childName = name + toPascalCase(k);
        if (v.type === 'object') res += joiGen.generate(v, childName, _seen);
        if (v.type === 'array' && v.itemType?.type === 'object') res += joiGen.generate(v.itemType, childName + 'Item', _seen);
      }
      return res;
    }
    return '';
  }
};

// ─── Valibot Schema ───────────────────────────────────────────────────────────
export const valibotGen = {
  generate: (schema: Schema, name: string = 'root', _seen: Set<string> = new Set()): string => {
    schema = rootObject(schema);
    if (schema.type === 'object' && schema.fields) {
      if (_seen.has(name)) return '';
      _seen.add(name);
      
      let res = '';
      if (_seen.size === 1) {
        res += `import * as v from 'valibot';\n\n`;
      }
      res += `export const ${name}ValiSchema = v.object({\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const childSchemaName = name + toPascalCase(k);
        let valiType = '';
        if (v.type === 'object') {
          valiType = `${childSchemaName}ValiSchema`;
        } else if (v.type === 'array') {
          const item = v.itemType;
          let innerVali: string;
          if (item?.type === 'string' && item.enumValues) {
            innerVali = `v.picklist([${item.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
          } else {
            innerVali = item?.type === 'object' ? `${childSchemaName}ItemValiSchema` : `v.${item?.type ?? 'string'}()`;
          }
          valiType = `v.array(${innerVali})`;
        } else if (v.type === 'union' && v.unionTypes) {
          valiType = `v.union([${v.unionTypes.map(ut => typeof ut === 'string' ? `v.literal("${ut}")` : `v.literal(${ut})`).join(', ')}])`;
        } else if (v.type === 'string' && v.enumValues) {
          valiType = `v.picklist([${v.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
        } else if (v.type === 'string') {
          valiType = 'v.string()';
          if (v.format === 'email') valiType = 'v.pipe(v.string(), v.email())';
          else if (v.format === 'url') valiType = 'v.pipe(v.string(), v.url())';
          else if (v.format === 'uuid') valiType = 'v.pipe(v.string(), v.uuid())';
        } else {
          valiType = `v.${v.type}()`;
        }
        if (v.nullable) {
          valiType = `v.nullable(${valiType})`;
        }
        if (v.optional) {
          valiType = `v.optional(${valiType})`;
        }
        res += `  ${k}: ${valiType},\n`;
      }
      res += `});\n\n`;

      for (const [k, v] of Object.entries(schema.fields)) {
        const childName = name + toPascalCase(k);
        if (v.type === 'object') res += valibotGen.generate(v, childName, _seen);
        if (v.type === 'array' && v.itemType?.type === 'object') res += valibotGen.generate(v.itemType, childName + 'Item', _seen);
      }
      return res;
    }
    return '';
  }
};

// ─── Superstruct Schema ────────────────────────────────────────────────────────
export const superstructGen = {
  generate: (schema: Schema, name: string = 'root', _seen: Set<string> = new Set()): string => {
    schema = rootObject(schema);
    if (schema.type === 'object' && schema.fields) {
      if (_seen.has(name)) return '';
      _seen.add(name);
      
      let res = '';
      if (_seen.size === 1) {
        res += `import * as s from 'superstruct';\n\n`;
      }
      res += `export const ${name}Struct = s.type({\n`;
      for (const [k, v] of Object.entries(schema.fields)) {
        const childSchemaName = name + toPascalCase(k);
        let structType = '';
        if (v.type === 'object') {
          structType = `${childSchemaName}Struct`;
        } else if (v.type === 'array') {
          const item = v.itemType;
          let innerStruct: string;
          if (item?.type === 'string' && item.enumValues) {
            innerStruct = `s.enums([${item.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
          } else {
            innerStruct = item?.type === 'object' ? `${childSchemaName}ItemStruct` : `s.${item?.type ?? 'string'}()`;
          }
          structType = `s.array(${innerStruct})`;
        } else if (v.type === 'union' && v.unionTypes) {
          structType = `s.union([${v.unionTypes.map(ut => typeof ut === 'string' ? `s.literal("${ut}")` : `s.literal(${ut})`).join(', ')}])`;
        } else if (v.type === 'string' && v.enumValues) {
          structType = `s.enums([${v.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
        } else {
          structType = `s.${v.type}()`;
        }
        if (v.nullable) {
          structType = `s.nullable(${structType})`;
        }
        if (v.optional) {
          structType = `s.optional(${structType})`;
        }
        res += `  ${k}: ${structType},\n`;
      }
      res += `});\n\n`;

      for (const [k, v] of Object.entries(schema.fields)) {
        const childName = name + toPascalCase(k);
        if (v.type === 'object') res += superstructGen.generate(v, childName, _seen);
        if (v.type === 'array' && v.itemType?.type === 'object') res += superstructGen.generate(v.itemType, childName + 'Item', _seen);
      }
      return res;
    }
    return '';
  }
};

// ─── React Props ──────────────────────────────────────────────────────────────
export const reactPropsGen = {
  generate: (schema: Schema, name: string = 'Component'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const componentName = toPascalCase(name);
    let res = `import React from 'react';\n\n`;
    res += `export interface ${componentName}Props {\n`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      if (v.type === 'number') typeStr = 'number';
      else if (v.type === 'boolean') typeStr = 'boolean';
      else if (v.type === 'object') typeStr = 'Record<string, any>';
      else if (v.type === 'array') typeStr = 'any[]';
      res += `  ${k}${v.optional ? '?' : ''}: ${typeStr};\n`;
    }
    res += `}\n\n`;
    res += `export const ${componentName}: React.FC<${componentName}Props> = (props) => {\n`;
    res += `  return (\n    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">\n`;
    res += `      <h2 className="text-xl font-bold mb-2">${componentName}</h2>\n`;
    res += `      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">\n`;
    for (const k of Object.keys(f)) {
      res += `        <li><strong>${k}:</strong> {String(props.${k} ?? '')}</li>\n`;
    }
    res += `      </ul>\n    </div>\n  );\n};\n`;
    return res;
  }
};

// ─── React Context ────────────────────────────────────────────────────────────
export const reactContextGen = {
  generate: (schema: Schema, name: string = 'State'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const contextName = toPascalCase(name);
    let res = `import React, { createContext, useContext, useState, ReactNode } from 'react';\n\n`;
    res += `export interface ${contextName}State {\n`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      if (v.type === 'number') typeStr = 'number';
      else if (v.type === 'boolean') typeStr = 'boolean';
      else if (v.type === 'object') typeStr = 'Record<string, any>';
      else if (v.type === 'array') typeStr = 'any[]';
      res += `  ${k}${v.optional ? '?' : ''}: ${typeStr};\n`;
    }
    res += `}\n\n`;
    res += `interface ${contextName}ContextType {\n  state: ${contextName}State;\n  updateState: (updates: Partial<${contextName}State>) => void;\n}\n\n`;
    res += `const ${contextName}Context = createContext<${contextName}ContextType | undefined>(undefined);\n\n`;
    res += `export const ${contextName}Provider = ({ children, initial }: { children: ReactNode; initial: ${contextName}State }) => {\n`;
    res += `  const [state, setState] = useState<${contextName}State>(initial);\n`;
    res += `  const updateState = (updates: Partial<${contextName}State>) => setState(prev => ({ ...prev, ...updates }));\n\n`;
    res += `  return (\n    <${contextName}Context.Provider value={{ state, updateState }}>\n      {children}\n    </${contextName}Context.Provider>\n  );\n};\n\n`;
    res += `export const use${contextName}Context = () => {\n  const context = useContext(${contextName}Context);\n  if (!context) throw new Error('use${contextName}Context must be used within ${contextName}Provider');\n  return context;\n};\n`;
    return res;
  }
};

// ─── Redux Slice ──────────────────────────────────────────────────────────────
export const reduxSliceGen = {
  generate: (schema: Schema, name: string = 'User'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const sliceName = toPascalCase(name);
    const snakeSlice = toSnakeCase(name);
    let res = `import { createSlice, PayloadAction } from '@reduxjs/toolkit';\n\n`;
    res += `export interface ${sliceName}State {\n`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      if (v.type === 'number') typeStr = 'number';
      else if (v.type === 'boolean') typeStr = 'boolean';
      else if (v.type === 'object') typeStr = 'Record<string, any>';
      else if (v.type === 'array') typeStr = 'any[]';
      res += `  ${k}${v.optional ? '?' : ''}: ${typeStr};\n`;
    }
    res += `}\n\n`;
    res += `const initialState: ${sliceName}State = {\n`;
    for (const [k, v] of Object.entries(f)) {
      let dVal = `''`;
      if (v.type === 'number') dVal = '0';
      else if (v.type === 'boolean') dVal = 'false';
      else if (v.type === 'object') dVal = '{}';
      else if (v.type === 'array') dVal = '[]';
      res += `  ${k}: ${dVal},\n`;
    }
    res += `};\n\n`;
    res += `export const ${snakeSlice}Slice = createSlice({\n`;
    res += `  name: '${snakeSlice}',\n  initialState,\n  reducers: {\n`;
    res += `    set${sliceName}: (state, action: PayloadAction<Partial<${sliceName}State>>) => {\n`;
    res += `      return { ...state, ...action.payload };\n`;
    res += `    },\n`;
    res += `    reset${sliceName}: () => initialState,\n`;
    res += `  },\n});\n\n`;
    res += `export const { set${sliceName}, reset${sliceName} } = ${snakeSlice}Slice.actions;\n`;
    res += `export default ${snakeSlice}Slice.reducer;\n`;
    return res;
  }
};

// ─── Pinia Store ──────────────────────────────────────────────────────────────
export const piniaStoreGen = {
  generate: (schema: Schema, name: string = 'User'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const storeName = toPascalCase(name);
    const snakeStore = toSnakeCase(name);
    let res = `import { defineStore } from 'pinia';\n\n`;
    res += `export const use${storeName}Store = defineStore('${snakeStore}', {\n`;
    res += `  state: () => ({\n`;
    for (const [k, v] of Object.entries(f)) {
      let dVal = `''`;
      if (v.type === 'number') dVal = '0';
      else if (v.type === 'boolean') dVal = 'false';
      else if (v.type === 'object') dVal = '{}';
      else if (v.type === 'array') dVal = '[]';
      res += `    ${k}: ${dVal} as ${v.type === 'number' ? 'number' : v.type === 'boolean' ? 'boolean' : v.type === 'array' ? 'any[]' : v.type === 'object' ? 'Record<string, any>' : 'string'},\n`;
    }
    res += `  }),\n`;
    res += `  actions: {\n`;
    res += `    update(data: Partial<ReturnType<typeof this.$state>>) {\n`;
    res += `      Object.assign(this.$state, data);\n`;
    res += `    },\n`;
    res += `    reset() {\n      this.$reset();\n    }\n`;
    res += `  }\n});\n`;
    return res;
  }
};

// ─── Vue Props ────────────────────────────────────────────────────────────────
export const vuePropsGen = {
  generate: (schema: Schema, name: string = 'Component'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    let res = `<script setup lang="ts">\n`;
    res += `defineProps<{\n`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      if (v.type === 'number') typeStr = 'number';
      else if (v.type === 'boolean') typeStr = 'boolean';
      else if (v.type === 'object') typeStr = 'Record<string, any>';
      else if (v.type === 'array') typeStr = 'any[]';
      res += `  ${k}${v.optional ? '?' : ''}: ${typeStr};\n`;
    }
    res += `}>();\n`;
    res += `</script>\n\n`;
    res += `<template>\n  <div class="vue-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">\n`;
    res += `    <h2 class="text-xl font-bold mb-2">${toPascalCase(name)}</h2>\n`;
    res += `    <ul class="text-sm space-y-1">\n`;
    for (const k of Object.keys(f)) {
      res += `      <li><strong>${k}:</strong> {{ ${k} }}</li>\n`;
    }
    res += `    </ul>\n  </div>\n</template>\n`;
    return res;
  }
};

// ─── Svelte Props ─────────────────────────────────────────────────────────────
export const sveltePropsGen = {
  generate: (schema: Schema, name: string = 'Component'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    let res = `<script lang="ts">\n`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      if (v.type === 'number') typeStr = 'number';
      else if (v.type === 'boolean') typeStr = 'boolean';
      else if (v.type === 'object') typeStr = 'Record<string, any>';
      else if (v.type === 'array') typeStr = 'any[]';
      res += `  export let ${k}: ${typeStr}${v.optional ? ' | undefined = undefined' : ''};\n`;
    }
    res += `</script>\n\n`;
    res += `<div class="svelte-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">\n`;
    res += `  <h2 class="text-xl font-bold mb-2">${toPascalCase(name)}</h2>\n`;
    res += `  <ul class="text-sm space-y-1">\n`;
    for (const k of Object.keys(f)) {
      res += `    <li><strong>${k}:</strong> {${k}}</li>\n`;
    }
    res += `  </ul>\n</div>\n`;
    return res;
  }
};

// ─── Solid Props ──────────────────────────────────────────────────────────────
export const solidPropsGen = {
  generate: (schema: Schema, name: string = 'Component'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const compName = toPascalCase(name);
    let res = `import { Component } from 'solid-js';\n\n`;
    res += `export interface ${compName}Props {\n`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      if (v.type === 'number') typeStr = 'number';
      else if (v.type === 'boolean') typeStr = 'boolean';
      else if (v.type === 'object') typeStr = 'Record<string, any>';
      else if (v.type === 'array') typeStr = 'any[]';
      res += `  ${k}${v.optional ? '?' : ''}: ${typeStr};\n`;
    }
    res += `}\n\n`;
    res += `export const ${compName}: Component<${compName}Props> = (props) => {\n`;
    res += `  return (\n    <div class="solid-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">\n`;
    res += `      <h2 class="text-xl font-bold mb-2">${compName}</h2>\n`;
    res += `      <ul class="text-sm space-y-1">\n`;
    for (const k of Object.keys(f)) {
      res += `        <li><strong>${k}:</strong> {String(props.${k} ?? '')}</li>\n`;
    }
    res += `      </ul>\n    </div>\n  );\n};\n`;
    return res;
  }
};

// =============================================================================
// TypeMorph Extended Generators — Batch 3: Backend & Multi-Language Generators
// =============================================================================

// ─── Arduino (ArduinoJson scaffold) ──────────────────────────────────────────
export const arduinoGen = {
  generate: (schema: Schema, name: string = 'Data'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const structName = toPascalCase(name);
    let res = `// Generated by TypeMorph (requires ArduinoJson library)\n`;
    res += `#include <ArduinoJson.h>\n\n`;
    res += `struct ${structName} {\n`;
    for (const [k, v] of Object.entries(f)) {
      let cType = 'String';
      if (v.type === 'number') cType = 'double';
      else if (v.type === 'boolean') cType = 'bool';
      res += `  ${cType} ${k};\n`;
    }
    res += `};\n\n`;
    res += `void deserialize${structName}(Stream& stream, ${structName}& data) {\n`;
    res += `  StaticJsonDocument<1024> doc;\n`;
    res += `  deserializeJson(doc, stream);\n\n`;
    for (const k of Object.keys(f)) {
      res += `  data.${k} = doc["${k}"];\n`;
    }
    res += `}\n`;
    return res;
  }
};

// ─── COBOL COPYBOOK ───────────────────────────────────────────────────────────
export const cobolGen = {
  generate: (schema: Schema, name: string = 'RECORD'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const recordName = toScreamingSnake(name).substring(0, 20);
    let res = `      * Generated by TypeMorph — COBOL Copybook\n`;
    res += `       01  ${recordName}.\n`;
    for (const [k, v] of Object.entries(f)) {
      const fieldName = toScreamingSnake(k).substring(0, 20);
      if (v.type === 'object' && v.fields) {
        res += `           05  ${fieldName.padEnd(20)}.\n`;
        for (const [k2, v2] of Object.entries(v.fields)) {
          const subName = toScreamingSnake(k2).substring(0, 20);
          const picStr2 = v2.type === 'number' ? '9(9)V99' : v2.type === 'boolean' ? '9(1)' : 'X(255)';
          res += `               10  ${subName.padEnd(20)} PIC ${picStr2}.\n`;
        }
      } else if (v.type === 'array') {
        const itemPic = v.itemType?.type === 'number' ? '9(9)V99' : 'X(255)';
        res += `           05  ${fieldName.padEnd(20)} OCCURS 10 TIMES PIC ${itemPic}.\n`;
      } else {
        let picStr = 'X(255)';
        if (v.type === 'number') picStr = '9(9)V99';
        else if (v.type === 'boolean') picStr = '9(1)';
        res += `           05  ${fieldName.padEnd(20)} PIC ${picStr}.\n`;
      }
    }
    return res;
  }
};

// ─── Clojure Spec ─────────────────────────────────────────────────────────────
export const clojureGen = {
  generate: (schema: Schema, name: string = 'data'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const ns = toSnakeCase(name);
    let res = `(ns com.example.${ns}-spec\n  (:require [clojure.spec.alpha :as s]))\n\n`;
    const keys: string[] = [];
    for (const [k, v] of Object.entries(f)) {
      const specName = `::${toSnakeCase(k)}`;
      keys.push(specName);
      let pred = 'string?';
      if (v.type === 'number') pred = 'number?';
      else if (v.type === 'boolean') pred = 'boolean?';
      else if (v.type === 'array') pred = '(s/coll-of any?)';
      else if (v.type === 'object' && v.fields) {
        const nestedKeys = Object.keys(v.fields).map(k2 => `::${toSnakeCase(k2)}`);
        for (const [k2, v2] of Object.entries(v.fields)) {
          const p2 = v2.type === 'number' ? 'number?' : v2.type === 'boolean' ? 'boolean?' : 'string?';
          res += `(s/def ::${toSnakeCase(k2)} ${p2})\n`;
        }
        pred = `(s/keys :req [${nestedKeys.join(' ')}])`;
      }
      res += `(s/def ${specName} ${pred})\n`;
    }
    const req = keys.join(' ');
    res += `\n(s/def ::${toSnakeCase(name)} (s/keys :req [${req}]))\n`;
    return res;
  }
};

// ─── Elixir (Ecto Schema & Struct) ───────────────────────────────────────────
export const elixirGen = {
  generate: (schema: Schema, name: string = 'Data'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const moduleName = toPascalCase(name);
    let res = `defmodule MyApp.${moduleName} do\n  use Ecto.Schema\n  import Ecto.Changeset\n\n`;
    res += `  schema "${toSnakeCase(name)}s" do\n`;
    for (const [k, v] of Object.entries(f)) {
      let eType = ':string';
      if (v.type === 'number') eType = ':float';
      else if (v.type === 'boolean') eType = ':boolean';
      else if (v.type === 'object' || v.type === 'array') eType = ':map';
      else if (v.format === 'datetime') eType = ':utc_datetime';

      res += `    field :${toSnakeCase(k)}, ${eType}\n`;
    }
    res += `    timestamps()\n  end\n\n`;
    const requiredKeys = Object.entries(f).filter(([, v]) => !v.optional).map(([k]) => `:${toSnakeCase(k)}`);
    res += `  def changeset(struct, params \\\\ %{}) do\n`;
    res += `    struct\n`;
    res += `    |> cast(params, [${Object.keys(f).map(k => `:${toSnakeCase(k)}`).join(', ')}])\n`;
    if (requiredKeys.length) {
      res += `    |> validate_required([${requiredKeys.join(', ')}])\n`;
    }
    res += `  end\nend\n`;
    return res;
  }
};

// ─── Elm (Decoder & Custom Type) ──────────────────────────────────────────────
export const elmGen = {
  generate: (schema: Schema, name: string = 'Model'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const modelName = toPascalCase(name);
    let res = `module MyApp.${modelName} exposing (..)\n\nimport Json.Decode as Decode exposing (Decoder)\nimport Json.Decode.Pipeline exposing (required, optional)\n\n`;
    res += `type alias ${modelName} =\n    {\n`;
    const fieldsArr = Object.entries(f).map(([k, v]) => {
      let elmType = 'String';
      if (v.type === 'number') elmType = 'Float';
      else if (v.type === 'boolean') elmType = 'Bool';
      if (v.optional) elmType = `Maybe ${elmType}`;
      return `    ${k} : ${elmType}`;
    });
    res += fieldsArr.join('\n    , ') + '\n    }\n\n';

    res += `decoder : Decoder ${modelName}\ndecoder =\n    Decode.succeed ${modelName}\n`;
    for (const [k, v] of Object.entries(f)) {
      let innerDec = 'Decode.string';
      if (v.type === 'number') innerDec = 'Decode.float';
      else if (v.type === 'boolean') innerDec = 'Decode.bool';

      if (v.optional) {
        res += `        |> optional "${k}" (Decode.nullable ${innerDec}) Nothing\n`;
      } else {
        res += `        |> required "${k}" ${innerDec}\n`;
      }
    }
    return res;
  }
};

// ─── Godot GDScript ───────────────────────────────────────────────────────────
export const godotGen = {
  generate: (schema: Schema, name: string = 'Data'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    let res = `# Generated by TypeMorph — GDScript\nclass_name ${toPascalCase(name)}\n\n`;
    for (const [k, v] of Object.entries(f)) {
      let gdType = 'String';
      let dVal = '""';
      if (v.type === 'number') { gdType = 'float'; dVal = '0.0'; }
      else if (v.type === 'boolean') { gdType = 'bool'; dVal = 'false'; }
      else if (v.type === 'object') { gdType = 'Dictionary'; dVal = '{}'; }
      else if (v.type === 'array') { gdType = 'Array'; dVal = '[]'; }

      res += `var ${toSnakeCase(k)}: ${gdType} = ${dVal}\n`;
    }
    res += `\nstatic func from_dict(dict: Dictionary) -> ${toPascalCase(name)}:\n`;
    res += `  var instance = ${toPascalCase(name)}.new()\n`;
    for (const k of Object.keys(f)) {
      const snake = toSnakeCase(k);
      res += `  if dict.has("${k}"):\n    instance.${snake} = dict["${k}"]\n`;
    }
    res += `  return instance\n`;
    return res;
  }
};

// ─── Haskell (Aeson records) ──────────────────────────────────────────────────
export const haskellGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const typeName = toPascalCase(name);
    let res = `{-# LANGUAGE DeriveGeneric #-}\nmodule MyApp.${typeName} where\n\nimport GHC.Generics (Generic)\nimport Data.Aeson (FromJSON, ToJSON)\n\n`;
    res += `data ${typeName} = ${typeName}\n  { `;
    const fieldsArr = Object.entries(f).map(([k, v]) => {
      let haskellType = 'String';
      if (v.type === 'number') haskellType = 'Double';
      else if (v.type === 'boolean') haskellType = 'Bool';
      if (v.optional) haskellType = `Maybe ${haskellType}`;
      return `${toSnakeCase(k)} :: ${haskellType}`;
    });
    res += fieldsArr.join('\n  , ') + '\n  } deriving (Show, Generic)\n\n';
    res += `instance FromJSON ${typeName}\ninstance ToJSON ${typeName}\n`;
    return res;
  }
};

// ─── R Dataframe ──────────────────────────────────────────────────────────────
export const rGen = {
  generate: (schema: Schema, name: string = 'df'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const dfName = toSnakeCase(name);
    let res = `# Generated by TypeMorph\n`;
    res += `${dfName} <- data.frame(\n`;
    const cols = Object.entries(f).map(([k, v]) => {
      let val = '"sample_value"';
      if (v.type === 'number') val = '0.0';
      else if (v.type === 'boolean') val = 'TRUE';
      else if (v.type === 'object') val = 'list()';
      else if (v.type === 'array') val = 'list()';
      else if (v.format === 'email') val = '"user@example.com"';
      else if (v.format === 'datetime') val = 'as.POSIXct("2024-01-01")';
      return `  ${toSnakeCase(k)} = c(${val})`;
    });
    res += cols.join(',\n') + ',\n  stringsAsFactors = FALSE\n)\n';
    return res;
  }
};

// ─── Scala (Case Class) ───────────────────────────────────────────────────────
export const scalaGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const className = toPascalCase(name);
    let res = `// Generated by TypeMorph\n`;
    res += `case class ${className}(\n`;
    const cols = Object.entries(f).map(([k, v]) => {
      let sType = 'String';
      if (v.type === 'number') sType = 'Double';
      else if (v.type === 'boolean') sType = 'Boolean';
      else if (v.type === 'object') sType = 'Map[String, Any]';
      else if (v.type === 'array') sType = 'List[Any]';

      if (v.optional) sType = `Option[${sType}]`;
      return `  ${k}: ${sType}`;
    });
    res += cols.join(',\n') + '\n)\n';
    return res;
  }
};

// ─── Solidity Struct ──────────────────────────────────────────────────────────
export const solidityGen = {
  generate: (schema: Schema, name: string = 'Record'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const nestedStructDefs: string[] = [];
    let mainFields = '';
    for (const [k, v] of Object.entries(f)) {
      let solType = 'string';
      if (v.type === 'number') solType = 'uint256';
      else if (v.type === 'boolean') solType = 'bool';
      else if (v.type === 'array') {
        const itemType = v.itemType?.type === 'number' ? 'uint256' : v.itemType?.type === 'boolean' ? 'bool' : 'string';
        solType = `${itemType}[]`;
      } else if (v.type === 'object' && v.fields) {
        const structName = toPascalCase(k);
        let nested = `    struct ${structName} {\n`;
        for (const [k2, v2] of Object.entries(v.fields)) {
          const t2 = v2.type === 'number' ? 'uint256' : v2.type === 'boolean' ? 'bool' : 'string';
          nested += `        ${t2} ${k2};\n`;
        }
        nested += `    }`;
        nestedStructDefs.push(nested);
        solType = structName;
      }
      mainFields += `        ${solType} ${k};\n`;
    }
    let res = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\n`;
    res += `contract ${toPascalCase(name)}Store {\n`;
    for (const nd of nestedStructDefs) res += nd + '\n\n';
    res += `    struct ${toPascalCase(name)} {\n`;
    res += `        uint256 id;\n`;
    res += mainFields;
    res += `    }\n`;
    res += `}\n`;
    return res;
  }
};

// ─── Django Model & REST Serializer ───────────────────────────────────────────
export const djangoGen = {
  generate: (schema: Schema, name: string = 'Post'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const className = toPascalCase(name);
    let res = `from django.db import models\nfrom rest_framework import serializers\n\n`;
    res += `class ${className}(models.Model):\n`;
    for (const [k, v] of Object.entries(f)) {
      const snake = toSnakeCase(k);
      const nullOpt = v.optional ? ', null=True, blank=True' : '';
      let fieldStr = `models.CharField(max_length=255${nullOpt})`;
      if (v.type === 'number') fieldStr = `models.FloatField(${nullOpt})`;
      else if (v.type === 'boolean') fieldStr = `models.BooleanField(default=False)`;
      else if (v.type === 'object' || v.type === 'array') fieldStr = `models.JSONField(${nullOpt})`;
      else if (v.format === 'datetime') fieldStr = `models.DateTimeField(auto_now_add=True)`;

      res += `    ${snake} = ${fieldStr}\n`;
    }
    res += `\n\nclass ${className}Serializer(serializers.ModelSerializer):\n`;
    res += `    class Meta:\n`;
    res += `        model = ${className}\n`;
    res += `        fields = '__all__'\n`;
    return res;
  }
};

// ─── Rails Migration ──────────────────────────────────────────────────────────
export const railsGen = {
  generate: (schema: Schema, name: string = 'User'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const migrationName = `Create${toPascalCase(name)}s`;
    let res = `class ${migrationName} < ActiveRecord::Migration[7.0]\n  def change\n`;
    res += `    create_table :${toSnakeCase(name)}s do |t|\n`;
    for (const [k, v] of Object.entries(f)) {
      if (k.toLowerCase() === 'id') continue; // Rails handles ID by default
      let rType = 'string';
      if (v.type === 'number') rType = v.format === 'int' ? 'integer' : 'decimal';
      else if (v.type === 'boolean') rType = 'boolean';
      else if (v.type === 'object' || v.type === 'array') rType = 'jsonb';
      else if (v.format === 'datetime') rType = 'datetime';

      const opt = v.optional ? ', null: true' : ', null: false';
      res += `      t.${rType} :${toSnakeCase(k)}${opt}\n`;
    }
    res += `      t.timestamps\n    end\n  end\nend\n`;
    return res;
  }
};

// ─── Next.js API Route ────────────────────────────────────────────────────────
export const apiRouteGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const entityName = toPascalCase(name);
    const entityLower = toSnakeCase(name);
    const f = getFields(schema);
    const fields = Object.keys(f);

    const sampleBody = JSON.stringify(
      Object.fromEntries(fields.map(k => {
        const v = f[k];
        if (v.type === 'number') return [k, 0];
        if (v.type === 'boolean') return [k, false];
        return [k, 'sample'];
      })),
      null, 6
    ).replace(/^/gm, '    ');

    return `import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Generated by TypeMorph — Next.js App Router API Route
// Route: /api/${entityLower}s

const ${entityName}Schema = z.object({
${fields.map(k => {
  const v = f[k];
  const zodType = v.type === 'number' ? 'z.number()' : v.type === 'boolean' ? 'z.boolean()' : 'z.string()';
  return `  ${k}: ${zodType}${v.optional ? '.optional()' : ''}`;
}).join(',\n')}
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with your database query
    const items: z.infer<typeof ${entityName}Schema>[] = [];
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ${entityLower}s' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ${entityName}Schema.parse(body);
    // TODO: Replace with your database insert
    return NextResponse.json(validated, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create ${entityLower}' }, { status: 500 });
  }
}
`;
  }
};

// ─── React Query Hook ─────────────────────────────────────────────────────────
export const reactHookGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const entityName = toPascalCase(name);
    const entityLower = name.charAt(0).toLowerCase() + name.slice(1);
    const entitySnake = toSnakeCase(name);
    const f = getFields(schema);
    const fields = Object.keys(f);

    return `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Generated by TypeMorph — React Query Hook
// Requires: @tanstack/react-query

export interface ${entityName} {
${fields.map(k => {
  const v = f[k];
  const tsType = v.type === 'number' ? 'number' : v.type === 'boolean' ? 'boolean' : 'string';
  return `  ${k}${v.optional ? '?' : ''}: ${tsType};`;
}).join('\n')}
}

const API_BASE = '/api/${entitySnake}s';

export const use${entityName}List = () => {
  return useQuery<${entityName}[]>({
    queryKey: ['${entitySnake}s'],
    queryFn: async () => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch ${entitySnake}s');
      return res.json();
    },
  });
};

export const use${entityName}Create = () => {
  const queryClient = useQueryClient();
  return useMutation<${entityName}, Error, Omit<${entityName}, 'id'>>({
    mutationFn: async (data) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create ${entitySnake}');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${entitySnake}s'] });
    },
  });
};

export const use${entityName}Delete = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ${entitySnake}');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${entitySnake}s'] });
    },
  });
};
`;
  }
};

// ─── SQL to Mermaid ER Diagram ────────────────────────────────────────────────
export const sqlToMermaidERGen = {
  generate: (sql: string): string => {
    if (!sql || !sql.trim().toUpperCase().includes('CREATE TABLE')) {
      return `erDiagram\n  %% Paste a SQL CREATE TABLE statement to generate an ER diagram`;
    }

    const tables: {
      name: string;
      columns: { name: string; type: string; isPk: boolean; isNullable: boolean }[];
    }[] = [];

    const relations: { from: string; to: string; label: string }[] = [];

    // 複数のCREATE TABLE文を処理
    const tableRegex = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?["`]?(\w+)["`]?\s*\(([^;]*)\)/gi;
    let tableMatch: RegExpExecArray | null;

    while ((tableMatch = tableRegex.exec(sql)) !== null) {
      const tableName = tableMatch[1];
      const body = tableMatch[2];

      const columns: typeof tables[0]['columns'] = [];

      // カラム行を上位カンマで分割
      const splitTopLevel = (s: string): string[] => {
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

      const sqlKeywords = new Set([
        'PRIMARY', 'KEY', 'FOREIGN', 'REFERENCES', 'CONSTRAINT',
        'UNIQUE', 'INDEX', 'CHECK', 'CREATE', 'TABLE'
      ]);

      for (const line of splitTopLevel(body)) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // FOREIGN KEY検出
        const fkMatch = trimmed.match(/FOREIGN KEY\s*\(["`]?(\w+)["`]?\)\s*REFERENCES\s*["`]?(\w+)["`]?/i);
        if (fkMatch) {
          relations.push({ from: tableName, to: fkMatch[2], label: fkMatch[1] });
          continue;
        }

        // 通常カラム
        const colMatch = trimmed.match(/^["`]?(\w+)["`]?\s+(\w+)/);
        if (!colMatch) continue;

        const colName = colMatch[1];
        const colType = colMatch[2].toUpperCase();
        if (sqlKeywords.has(colName.toUpperCase())) continue;
        if (/^\d+$/.test(colName)) continue;

        const isPk = /PRIMARY KEY/i.test(trimmed) || colName.toLowerCase() === 'id';
        const isNullable = /\bNULL\b/i.test(trimmed) && !/NOT\s+NULL/i.test(trimmed);

        // Mermaid互換の型名に変換
        const mermaidType = (() => {
          if (['INT', 'INTEGER', 'BIGINT', 'SMALLINT', 'TINYINT', 'SERIAL', 'BIGSERIAL'].includes(colType)) return 'int';
          if (['FLOAT', 'DOUBLE', 'DECIMAL', 'NUMERIC', 'REAL'].includes(colType)) return 'float';
          if (['BOOLEAN', 'BOOL', 'BIT'].includes(colType)) return 'boolean';
          if (['DATE', 'DATETIME', 'TIMESTAMP', 'TIME'].includes(colType)) return 'datetime';
          if (['JSON', 'JSONB'].includes(colType)) return 'json';
          if (colType === 'UUID') return 'uuid';
          if (['TEXT', 'LONGTEXT', 'MEDIUMTEXT', 'TINYTEXT', 'CLOB'].includes(colType)) return 'text';
          return 'string';
        })();

        columns.push({ name: colName, type: mermaidType, isPk, isNullable });
      }

      if (columns.length > 0) {
        tables.push({ name: tableName, columns });
      }
    }

    if (tables.length === 0) {
      return `erDiagram\n  %% No valid CREATE TABLE statements found`;
    }

    // Mermaid erDiagram形式で出力
    let out = `erDiagram\n`;

    for (const table of tables) {
      out += `  ${table.name} {\n`;
      for (const col of table.columns) {
        const pk = col.isPk ? ' PK' : '';
        const nullable = col.isNullable ? ' "nullable"' : '';
        out += `    ${col.type} ${col.name}${pk}${nullable}\n`;
      }
      out += `  }\n\n`;
    }

    // リレーション出力
    for (const rel of relations) {
      out += `  ${rel.from} }o--|| ${rel.to} : "${rel.label}"\n`;
    }

    // REFERENCES キーワードからもリレーションを検出（FOREIGN KEY句なしのケース）
    const refRegex = /["`]?(\w+)["`]?\s+\w+[^,\n]*REFERENCES\s+["`]?(\w+)["`]?/gi;
    let refMatch: RegExpExecArray | null;
    const existingRels = new Set(relations.map(r => `${r.from}-${r.to}`));
    while ((refMatch = refRegex.exec(sql)) !== null) {
      const from = tables.find(t =>
        t.columns.some(c => c.name === refMatch![1])
      )?.name;
      const to = refMatch[2];
      if (from && to && !existingRels.has(`${from}-${to}`)) {
        out += `  ${from} }o--|| ${to} : "${refMatch[1]}"\n`;
        existingRels.add(`${from}-${to}`);
      }
    }

    return out.trimEnd();
  }
};
