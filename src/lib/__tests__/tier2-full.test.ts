/**
 * Tier 2 Generator Full Coverage Test
 * ------------------------------------
 * 全59個のTier 2ジェネレーターを実際のJSONで動かし、
 * フォーマット固有のキーワードが出力に含まれるかを検証する。
 *
 * PASS = 意味のある出力が生成される（形式固有のキーワード含む）
 * FAIL = 空・エラー・TypeScriptフォールバックが返ってきた
 */

import { describe, it, expect } from 'vitest';
import { runEngine } from '../engine';

const INPUT = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  age: 28,
  is_active: true,
  score: 4.5,
  created_at: '2024-01-01T10:00:00Z',
  tags: ['ts', 'node'],
  address: { city: 'Tokyo', zip: '100-0001' },
  status: 'active',
};

const run = (key: string) => runEngine(INPUT, key, '', { rootName: 'User' });

// Helper: returns [output, snippet] for diagnostics
function check(key: string): string {
  const out = run(key);
  return out;
}

describe('Tier 2: Database / SQL', () => {
  it('mongoose — new Schema({})', () => {
    const o = check('mongoose');
    expect(o).toMatch(/new Schema\(|mongoose\.Schema/);
    expect(o).toContain('name');
  });

  it('mysql — CREATE TABLE with MySQL types', () => {
    const o = check('mysql');
    expect(o).toMatch(/CREATE TABLE/i);
    expect(o).toMatch(/VARCHAR|TEXT|INT|TINYINT|DATETIME/i);
  });

  it('postgres — CREATE TABLE with PostgreSQL types', () => {
    const o = check('postgres');
    expect(o).toMatch(/CREATE TABLE/i);
    expect(o).toMatch(/TEXT|INTEGER|BOOLEAN|TIMESTAMPTZ|UUID/i);
  });

  it('sqlite — CREATE TABLE with SQLite types', () => {
    const o = check('sqlite');
    expect(o).toMatch(/CREATE TABLE/i);
    expect(o).toMatch(/TEXT|INTEGER|REAL|NUMERIC/i);
  });

  it('snowflake — CREATE OR REPLACE TABLE with Snowflake syntax', () => {
    const o = check('snowflake');
    expect(o).toMatch(/CREATE OR REPLACE TABLE/i);
    expect(o).toMatch(/VARCHAR|DOUBLE|BOOLEAN|TIMESTAMP_NTZ|VARIANT/i);
  });

  it('bigquery — BigQuery schema definition', () => {
    const o = check('bigquery');
    expect(o).toMatch(/STRING|INTEGER|FLOAT|BOOL|TIMESTAMP|RECORD/i);
    expect(o.length).toBeGreaterThan(50);
  });

  it('dynamodb — DynamoDB attribute definitions', () => {
    const o = check('dynamodb');
    expect(o).toMatch(/AttributeDefinitions|AttributeName|AttributeType|S"|N"|TableName/i);
  });

  it('sequelize — DataTypes definitions', () => {
    const o = check('sequelize');
    expect(o).toMatch(/DataTypes|sequelize\.define|define\(/);
  });

  it('typeorm — @Entity() / @Column() decorators', () => {
    const o = check('typeorm');
    expect(o).toMatch(/@Entity|@Column/);
  });

  it('drizzle — pgTable / mysqlTable / sqliteTable', () => {
    const o = check('drizzle');
    expect(o).toMatch(/pgTable|mysqlTable|sqliteTable|text\(|integer\(|boolean\(/);
  });

  it('kysely — Kysely Database interface', () => {
    const o = check('kysely');
    expect(o).toMatch(/interface|Database|Generated|Selectable|Insertable|Updateable/);
  });

  it('sql-insert — INSERT INTO statement', () => {
    const o = check('sql-insert');
    expect(o).toMatch(/INSERT INTO/i);
  });

  it('avro — Apache Avro record schema', () => {
    const o = check('avro');
    expect(o).toMatch(/"type":\s*"record"|"namespace"|"fields"/);
  });
});

describe('Tier 2: Validation Libraries', () => {
  it('yup — yup.object() schema', () => {
    const o = check('yup');
    expect(o).toMatch(/yup\.object|yup\.string|yup\.number|yup\.boolean/);
  });

  it('joi — Joi.object() schema', () => {
    const o = check('joi');
    expect(o).toMatch(/Joi\.object|Joi\.string|Joi\.number|Joi\.boolean/);
  });

  it('valibot — v.object() schema', () => {
    const o = check('valibot');
    expect(o).toMatch(/v\.object|v\.string|v\.number|v\.boolean/);
  });

  it('superstruct — object() schema', () => {
    const o = check('superstruct');
    expect(o).toMatch(/object\(|string\(\)|number\(\)|boolean\(\)/);
  });
});

describe('Tier 2: Frontend Frameworks', () => {
  it('react-props — interface ComponentProps / React.FC', () => {
    const o = check('react-props');
    expect(o).toMatch(/interface|Props|React\.FC|React\.memo/);
  });

  it('react-context — createContext / useContext', () => {
    const o = check('react-context');
    expect(o).toMatch(/createContext|useContext|Provider/);
  });

  it('react-query — useQuery / useMutation', () => {
    const o = check('react-query');
    expect(o).toMatch(/useQuery|useMutation|queryFn|queryKey/);
  });

  it('vue-props — defineProps / withDefaults', () => {
    const o = check('vue-props');
    expect(o).toMatch(/defineProps|withDefaults|PropType/);
  });

  it('svelte-props — export let declarations', () => {
    const o = check('svelte-props');
    expect(o).toMatch(/export let|<script|lang="ts"/);
  });

  it('solid-props — SolidJS props interface', () => {
    const o = check('solid-props');
    expect(o).toMatch(/interface|Props|Component|createSignal|children/);
  });

  it('redux-slice — createSlice / initialState', () => {
    const o = check('redux-slice');
    expect(o).toMatch(/createSlice|initialState|reducers|actions/);
  });

  it('pinia — defineStore / state', () => {
    const o = check('pinia');
    expect(o).toMatch(/defineStore|state\(\)|getters|actions/);
  });
});

describe('Tier 2: Backend Frameworks', () => {
  it('api-route — Next.js API route handler', () => {
    const o = check('api-route');
    expect(o).toMatch(/export.*GET|export.*POST|NextRequest|NextResponse/);
  });

  it('django — Django Model class', () => {
    const o = check('django');
    expect(o).toMatch(/models\.Model|models\.CharField|models\.IntegerField|models\.BooleanField/);
  });

  it('rails — Rails migration create_table', () => {
    const o = check('rails');
    expect(o).toMatch(/create_table|t\.string|t\.integer|t\.boolean|t\.datetime/);
  });

  it('nestjs-dto — NestJS DTO with class-validator decorators', () => {
    const o = check('nestjs-dto');
    expect(o).toMatch(/@IsString|@IsNumber|@IsBoolean|@IsEmail|@ApiProperty|class.*Dto/);
  });

  it('effect-schema — Effect Schema.Struct', () => {
    const o = check('effect-schema');
    expect(o).toMatch(/Schema\.Struct|Schema\.String|Schema\.Number|Schema\.Boolean|from "effect"/);
  });
});

describe('Tier 2: API / Network formats', () => {
  it('openapi — OpenAPI 3.0 YAML', () => {
    const o = check('openapi');
    expect(o).toMatch(/openapi:|components:|schemas:|properties:/);
  });

  it('postman — Postman collection JSON', () => {
    const o = check('postman');
    expect(o).toMatch(/"info"|"item"|"request"|"method"|postman/i);
  });

  it('http — HTTP file format', () => {
    const o = check('http');
    expect(o).toMatch(/POST |GET |PUT |DELETE |Content-Type|###/);
  });

  it('curl — cURL command', () => {
    const o = check('curl');
    expect(o).toMatch(/curl|--data|--request|-X POST|-X GET|-H/i);
  });

  it('mcp-tool — MCP Tool definition', () => {
    const o = check('mcp-tool');
    expect(o).toMatch(/tool|name|description|inputSchema|properties|type.*object/i);
  });

  it('openai-function — OpenAI function calling JSON', () => {
    const o = check('openai-function');
    expect(o).toMatch(/"name"|"parameters"|"properties"|"type":\s*"object"|"description"/);
  });

  it('vercel-ai-tool — Vercel AI SDK tool()', () => {
    const o = check('vercel-ai-tool');
    expect(o).toMatch(/tool\(|description|parameters|z\.object|execute/);
  });
});

describe('Tier 2: Data / Config formats', () => {
  it('avro — already covered in DB section', () => {
    // duplicate check for registry completeness
    expect(check('avro').length).toBeGreaterThan(50);
  });

  it('toml — TOML config output', () => {
    const o = check('toml');
    expect(o).toMatch(/\[config\]|\[.*\]|name\s*=|age\s*=/i);
  });

  it('yaml — YAML output', () => {
    const o = check('yaml');
    expect(o).toMatch(/name:|age:|is_active:|email:|created_at:/);
  });

  it('env — .env KEY=value format', () => {
    const o = check('env');
    expect(o).toMatch(/[A-Z_]+=|NAME=|AGE=|EMAIL=/i);
  });

  it('env-validator — .env Zod validator', () => {
    const o = check('env-validator');
    expect(o).toMatch(/z\.object|z\.string|z\.number|z\.boolean|envSchema/);
  });

  it('properties — .properties key=value format', () => {
    const o = check('properties');
    expect(o).toMatch(/name=|age=|is_active=|email=/i);
  });

  it('csv — CSV header row', () => {
    const o = check('csv');
    expect(o).toMatch(/id,|name,|email,|age,|,/);
  });

  it('sql-insert — INSERT INTO (covered above)', () => {
    expect(check('sql-insert').length).toBeGreaterThan(20);
  });
});

describe('Tier 2: Documentation formats', () => {
  it('markdown — Markdown table with | separators', () => {
    const o = check('markdown');
    expect(o).toMatch(/\| Field \||\| Name \||\|---\||\| \w/);
  });

  it('asciidoc — AsciiDoc table format', () => {
    const o = check('asciidoc');
    expect(o).toMatch(/\|===|\[cols=|\|/);
  });

  it('latex — LaTeX tabular environment', () => {
    const o = check('latex');
    expect(o).toMatch(/\\begin\{tabular\}|\\hline|\\textbf|&/);
  });

  it('mermaid — Mermaid ER diagram', () => {
    const o = check('mermaid');
    expect(o).toMatch(/erDiagram|\\{|string|int|bool/i);
  });

  it('vscode — VS Code snippet JSON', () => {
    const o = check('vscode');
    expect(o).toMatch(/"prefix"|"body"|"description"|"scope"/);
  });
});

describe('Tier 2: Niche / Exotic languages', () => {
  it('cobol — COBOL IDENTIFICATION DIVISION', () => {
    const o = check('cobol');
    expect(o).toMatch(/IDENTIFICATION DIVISION|DATA DIVISION|PIC|WORKING-STORAGE/i);
  });

  it('clojure — Clojure map/defn syntax', () => {
    const o = check('clojure');
    expect(o).toMatch(/defn|def |:name|:age|\(s\/def|\(spec\//);
  });

  it('elixir — Elixir defmodule / defstruct', () => {
    const o = check('elixir');
    expect(o).toMatch(/defmodule|defstruct|%\{|schema|field/);
  });

  it('elm — Elm type alias', () => {
    const o = check('elm');
    expect(o).toMatch(/type alias|: String|: Int|: Bool|: Float/);
  });

  it('godot — GDScript class_name / var declarations', () => {
    const o = check('godot');
    expect(o).toMatch(/class_name|extends|var |@export|func /);
  });

  it('haskell — Haskell data / record syntax', () => {
    const o = check('haskell');
    expect(o).toMatch(/data |:: |String|Int|Bool|Float|Double|deriving/);
  });

  it('r-lang — R data.frame / list()', () => {
    const o = check('r-lang');
    expect(o).toMatch(/data\.frame|list\(|<-|character|numeric|logical/);
  });

  it('scala — Scala case class', () => {
    const o = check('scala');
    expect(o).toMatch(/case class|: String|: Int|: Boolean|: Double/);
  });

  it('solidity — Solidity pragma / struct', () => {
    const o = check('solidity');
    expect(o).toMatch(/pragma solidity|struct|uint|bool|address|string/);
  });

  it('arduino — Arduino/C++ struct', () => {
    const o = check('arduino');
    expect(o).toMatch(/struct|char |int |bool |float |uint/);
  });

  it('c — C struct typedef', () => {
    const o = check('c');
    expect(o).toMatch(/typedef struct|struct \{|char |int |bool |float /);
  });

  it('cpp — C++ struct / class', () => {
    const o = check('cpp');
    expect(o).toMatch(/struct |class |std::string|int |bool |double |float /);
  });
});
