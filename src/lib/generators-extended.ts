/**
 * TypeFlow Extended Generators — Batch 1: SQL & Data Formats
 */
import { Schema } from './types';
import yaml from 'js-yaml';

const toPascalCase = (s: string) =>
  s.replace(/(^\w|[_\s-]\w)/g, m => m.replace(/[_\s-]/, '').toUpperCase());
const toSnakeCase = (s: string) =>
  s.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
const toScreamingSnake = (s: string) => toSnakeCase(s).toUpperCase();

const getFields = (schema: Schema): Record<string, Schema> => schema.fields ?? {};

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
      if (v.type === 'object' || v.type === 'array') return '"[object]"';
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
      if (v.type === 'object' || v.type === 'array') return "'{}'";
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
      const pk = isId ? ' PRIMARY KEY' : '';
      res += `  \`${toSnakeCase(k)}\` ${sqlType(v, 'mysql')}${nullable}${pk},\n`;
    }

    if (!hasCreatedAt) {
      res += `  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    }
    if (!hasUpdatedAt) {
      res += `  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n`;
    } else {
      // Remove trailing comma from last field if we didn't add updated_at
      res = res.trimEnd().replace(/,$/, '') + '\n';
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
      res = res.trimEnd().replace(/,$/, '') + '\n';
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
      res = res.trimEnd().replace(/,$/, '') + '\n';
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
        res += `${toSnakeCase(k)} = []\n`;
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
  if (v.format === 'datetime') return `"${new Date().toISOString()}"`;
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
      if (s.format === 'datetime') return new Date().toISOString();
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
    let res = `# Generated by TypeFlow\n`;
    for (const [k, v] of Object.entries(f)) {
      const key = toScreamingSnake(k);
      let val = 'your_value_here';
      if (v.type === 'number') val = '0';
      else if (v.type === 'boolean') val = 'false';
      else if (v.format === 'uuid') val = 'uuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
      else if (v.format === 'email') val = 'user@example.com';
      else if (v.format === 'url') val = 'https://example.com';
      res += `${key}=${val}\n`;
    }
    return res;
  }
};

// ─── .properties ─────────────────────────────────────────────────────────────
export const propertiesGen = {
  generate: (schema: Schema): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    let res = `# Generated by TypeFlow\n`;
    for (const [k, v] of Object.entries(f)) {
      let val = 'sample_value';
      if (v.type === 'number') val = '0';
      else if (v.type === 'boolean') val = 'false';
      res += `${toSnakeCase(k).replace(/_/g, '.')}=${val}\n`;
    }
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
      if (v.type === 'object') return '{...}';
      if (v.type === 'array') return '[...]';
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
    res += Object.entries(f).map(([, v]) => v.type === 'number' ? '0' : 'sample').join(' & ') + ` \\\\\n`;
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
        type: s.optional ? ['null', avroType(v)] : avroType(v),
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
const bqType = (s: Schema): string => {
  if (s.type === 'number') return 'FLOAT64';
  if (s.type === 'boolean') return 'BOOL';
  if (s.type === 'object' || s.type === 'array') return 'JSON';
  if (s.format === 'datetime') return 'TIMESTAMP';
  return 'STRING';
};

export const bigQueryGen = {
  generate: (schema: Schema): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const bqSchema = Object.entries(f).map(([k, v]) => ({
      name: k,
      type: bqType(v),
      mode: v.optional ? 'NULLABLE' : 'REQUIRED',
    }));
    return JSON.stringify(bqSchema, null, 2);
  }
};

// ─── DynamoDB JSON ────────────────────────────────────────────────────────────
const dynamoValue = (s: Schema): any => {
  if (s.type === 'number') return { N: '0' };
  if (s.type === 'boolean') return { BOOL: false };
  if (s.type === 'array') return { L: [] };
  if (s.type === 'object') return { M: {} };
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
  if (s.type === 'number') return { type: 'number', format: 'double' };
  if (s.type === 'boolean') return { type: 'boolean' };
  if (s.type === 'array') {
    return { type: 'array', items: openApiPropType(s.itemType ?? { type: 'string' }) };
  }
  if (s.type === 'object' && s.fields) {
    return {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(s.fields).map(([k, v]) => [k, openApiPropType(v)])
      ),
    };
  }
  const base: any = { type: 'string' };
  if (s.format === 'uuid') base.format = 'uuid';
  else if (s.format === 'email') base.format = 'email';
  else if (s.format === 'url') base.format = 'uri';
  else if (s.format === 'datetime') { base.type = 'string'; base.format = 'date-time'; }
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
        description: `Generated by TypeFlow: ${toPascalCase(name)} scaffold`,
      },
    };
    return JSON.stringify(snippet, null, 2);
  }
};

// ─── cURL output ─────────────────────────────────────────────────────────────
export const curlOutputGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
    const f = getFields(schema);
    const body = JSON.stringify(
      Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.type === 'number' ? 0 : v.type === 'boolean' ? false : 'sample'])),
      null, 2
    );
    return `curl -X POST https://api.example.com/${toSnakeCase(name)}s \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer YOUR_TOKEN' \\\n  -d '${body}'\n`;
  }
};

// =============================================================================
// TypeFlow Extended Generators — Batch 2: ORMs & Frontend / Validation Schemas
// =============================================================================

// ─── Mongoose Schema & Model ──────────────────────────────────────────────────
export const mongooseGen = {
  generate: (schema: Schema, name: string = 'Root'): string => {
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
            res += `[${typeStr}],\n`;
          }
        } else {
          let typeStr = 'String';
          if (v.type === 'number') typeStr = 'Number';
          else if (v.type === 'boolean') typeStr = 'Boolean';

          const req = v.optional ? '' : ', required: true';
          res += `{ type: ${typeStr}${req} },\n`;
        }
      }
      res += `${indent}}`;
      return res;
    };

    if (schema.type === 'object') {
      let out = `import mongoose, { Schema, Document } from 'mongoose';\n\n`;
      out += `const ${schemaName} = new Schema(${buildSchemaFields(schema)},\ { timestamps: true });\n\n`;
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
      else if (v.type === 'object' || v.type === 'array') typeStr = 'DataTypes.JSON';
      else if (v.format === 'datetime') typeStr = 'DataTypes.DATE';

      res += `  ${k}: {\n    type: ${typeStr},\n    allowNull: ${!!v.optional}\n  },\n`;
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
    res += `  @PrimaryGeneratedColumn('uuid')\n  id!: string;\n\n`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      let colDecorator = `@Column()`;
      if (v.type === 'number') {
        typeStr = 'number';
        colDecorator = `@Column('double')`;
      } else if (v.type === 'boolean') {
        typeStr = 'boolean';
        colDecorator = `@Column('boolean')`;
      } else if (v.type === 'object' || v.type === 'array') {
        typeStr = 'any';
        colDecorator = `@Column('jsonb')`;
      } else if (v.format === 'datetime') {
        typeStr = 'Date';
        colDecorator = `@Column('timestamp')`;
      }
      res += `  ${colDecorator}\n  ${k}${v.optional ? '?' : '!'}: ${typeStr};\n\n`;
    }
    res += `  @CreateDateColumn()\n  createdAt!: Date;\n\n`;
    res += `  @UpdateDateColumn()\n  updatedAt!: Date;\n`;
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
    res += `  id: uuid('id').defaultRandom().primaryKey(),\n`;
    for (const [k, v] of Object.entries(f)) {
      const dbCol = toSnakeCase(k);
      let colBuilder = `varchar('${dbCol}', { length: 255 })`;
      if (v.type === 'number') colBuilder = `doublePrecision('${dbCol}')`;
      else if (v.type === 'boolean') colBuilder = `boolean('${dbCol}')`;
      else if (v.type === 'object' || v.type === 'array') colBuilder = `jsonb('${dbCol}')`;
      else if (v.format === 'datetime') colBuilder = `timestamp('${dbCol}')`;

      const notNull = v.optional ? '' : '.notNull()';
      res += `  ${k}: ${colBuilder}${notNull},\n`;
    }
    res += `  createdAt: timestamp('created_at').defaultNow().notNull(),\n`;
    res += `  updatedAt: timestamp('updated_at').defaultNow().notNull()\n`;
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
    res += `  id: Generated<string>;\n`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = 'string';
      if (v.type === 'number') typeStr = 'number';
      else if (v.type === 'boolean') typeStr = 'boolean';
      else if (v.type === 'object' || v.type === 'array') typeStr = 'unknown';
      else if (v.format === 'datetime') typeStr = 'Date | string';

      const typeWithNull = v.optional ? `${typeStr} | null` : typeStr;
      res += `  ${k}: ${typeWithNull};\n`;
    }
    res += `  createdAt: Generated<string>;\n`;
    res += `  updatedAt: ColumnType<string, string | undefined, string>;\n`;
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
        } else if (v.type === 'string' && v.enumValues) {
          yupType = `yup.string().oneOf([${v.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
        } else if (v.type === 'string') {
          yupType = 'yup.string()';
          if (v.format === 'email') yupType += '.email()';
          else if (v.format === 'url') yupType += '.url()';
          else if (v.format === 'uuid') yupType += '.uuid()';
        } else {
          yupType = `yup.${v.type}()`;
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
        } else if (v.type === 'string' && v.enumValues) {
          valiType = `v.picklist([${v.enumValues.map(ev => `"${ev}"`).join(', ')}])`;
        } else if (v.type === 'string') {
          valiType = 'v.string()';
          if (v.format === 'email') valiType = 'v.string([v.email()])';
          else if (v.format === 'url') valiType = 'v.string([v.url()])';
          else if (v.format === 'uuid') valiType = 'v.string([v.uuid()])';
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
// TypeFlow Extended Generators — Batch 3: Backend & Multi-Language Generators
// =============================================================================

// ─── Arduino (ArduinoJson scaffold) ──────────────────────────────────────────
export const arduinoGen = {
  generate: (schema: Schema, name: string = 'Data'): string => {
    const f = getFields(schema);
    if (!Object.keys(f).length) return '';
    const structName = toPascalCase(name);
    let res = `// Generated by TypeFlow (requires ArduinoJson library)\n`;
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
    let res = `      * Generated by TypeFlow — COBOL Copybook\n`;
    res += `       01  ${recordName}.\n`;
    for (const [k, v] of Object.entries(f)) {
      const fieldName = toScreamingSnake(k).substring(0, 20);
      let picStr = 'X(255)';
      if (v.type === 'number') picStr = '9(9)V99';
      else if (v.type === 'boolean') picStr = '9(1)';

      res += `           05  ${fieldName.padEnd(20)} PIC ${picStr}.\n`;
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
    let res = `# Generated by TypeFlow — GDScript\nclass_name ${toPascalCase(name)}\n\n`;
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
    let res = `# Generated by TypeFlow\n`;
    res += `${dfName} <- data.frame(\n`;
    const cols = Object.entries(f).map(([k, v]) => {
      let val = '"sample"';
      if (v.type === 'number') val = '0.0';
      else if (v.type === 'boolean') val = 'TRUE';
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
    let res = `// Generated by TypeFlow\n`;
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
    let res = `// SPDX-License-Identifier: MIT\npragma solidity ^0.8.0;\n\n`;
    res += `contract ${toPascalCase(name)}Store {\n`;
    res += `    struct ${toPascalCase(name)} {\n`;
    res += `        uint256 id;\n`;
    for (const [k, v] of Object.entries(f)) {
      let solType = 'string';
      if (v.type === 'number') solType = 'uint256';
      else if (v.type === 'boolean') solType = 'bool';
      res += `        ${solType} ${k};\n`;
    }
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
      let rType = 'string';
      if (v.type === 'number') rType = 'decimal';
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


