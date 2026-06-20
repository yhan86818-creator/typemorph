/**
 * Syntax Validity Tests
 * ----------------------
 * JSON出力系は JSON.parse() で、YAML出力系は js-yaml でパースし、
 * 構文的に正しい出力かを検証する。
 *
 * これらのテストはキーワード検出ではなく「パーサーが受け入れるか」で判定するため、
 * ロジックが正しくても構文が壊れていれば検出できる。
 */

import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { runEngine } from '../engine';

const SAMPLE = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  age: 28,
  score: 4.5,
  is_active: true,
  created_at: '2024-01-01T10:00:00Z',
  tags: ['ts', 'node'],
  address: { city: 'Tokyo', zip: '100-0001' },
  status: 'active',
};

const run = (key: string) => runEngine(SAMPLE, key, '', { rootName: 'User' });

// ─── JSON出力の構文妥当性 ─────────────────────────────────────────────────────

describe('JSON output validity', () => {
  it('avro: valid JSON', () => {
    const o = run('avro');
    const parsed = JSON.parse(o);
    expect(parsed).toHaveProperty('type', 'record');
    expect(parsed).toHaveProperty('fields');
    expect(Array.isArray(parsed.fields)).toBe(true);
  });

  it('avro: all input fields appear in fields array', () => {
    const o = run('avro');
    const parsed = JSON.parse(o);
    const fieldNames = parsed.fields.map((f: any) => f.name);
    for (const key of ['name', 'email', 'age', 'is_active', 'status']) {
      expect(fieldNames).toContain(key);
    }
  });

  it('openai-function: valid JSON with modern tool wrapper format', () => {
    // OpenAI chat API format: { type: "function", function: { name, parameters } }
    const o = run('openai-function');
    const parsed = JSON.parse(o);
    expect(parsed).toHaveProperty('type', 'function');
    expect(parsed).toHaveProperty('function');
    expect(parsed.function).toHaveProperty('name');
    expect(parsed.function).toHaveProperty('parameters');
    expect(parsed.function.parameters).toHaveProperty('properties');
  });

  it('openai-function: all input fields in parameters.properties', () => {
    const o = run('openai-function');
    const parsed = JSON.parse(o);
    const props = parsed.function.parameters.properties;
    for (const key of ['name', 'email', 'age', 'is_active', 'status']) {
      expect(props).toHaveProperty(key);
    }
  });

  it('openai-function: age → integer type (not string)', () => {
    const o = run('openai-function');
    const parsed = JSON.parse(o);
    const props = parsed.function.parameters.properties;
    expect(props.age.type).toBe('integer');
  });

  it('openai-function: is_active → boolean type', () => {
    const o = run('openai-function');
    const parsed = JSON.parse(o);
    const props = parsed.function.parameters.properties;
    expect(props.is_active.type).toBe('boolean');
  });

  it('postman: valid JSON', () => {
    const o = run('postman');
    const parsed = JSON.parse(o);
    expect(parsed).toHaveProperty('info');
    expect(parsed).toHaveProperty('item');
  });

  it('dynamodb: valid JSON in PutItem format', () => {
    // dynamoDBGen outputs a PutItem sample request, not CreateTable
    const o = run('dynamodb');
    const parsed = JSON.parse(o);
    expect(parsed).toHaveProperty('TableName');
    expect(parsed).toHaveProperty('Item');
  });
});

// ─── YAML出力の構文妥当性 ─────────────────────────────────────────────────────

describe('YAML output validity', () => {
  it('openapi: valid YAML', () => {
    const raw = run('openapi');
    // strip DEPENDENCY_COMMENTS prefix before parsing
    const yamlStart = raw.indexOf('openapi:');
    const o = yamlStart >= 0 ? raw.slice(yamlStart) : raw;
    const parsed = yaml.load(o) as any;
    expect(parsed).toHaveProperty('openapi');
    expect(parsed).toHaveProperty('components');
  });

  it('openapi: all input fields in schema properties', () => {
    const raw = run('openapi');
    const yamlStart = raw.indexOf('openapi:');
    const o = yamlStart >= 0 ? raw.slice(yamlStart) : raw;
    const parsed = yaml.load(o) as any;
    const schemas = parsed?.components?.schemas ?? {};
    const userSchema = schemas.User ?? Object.values(schemas)[0] as any;
    const props = userSchema?.properties ?? {};
    for (const key of ['name', 'email', 'age', 'is_active']) {
      expect(Object.keys(props)).toContain(key);
    }
  });

  it('openapi: age → integer type', () => {
    const raw = run('openapi');
    const yamlStart = raw.indexOf('openapi:');
    const o = yamlStart >= 0 ? raw.slice(yamlStart) : raw;
    const parsed = yaml.load(o) as any;
    const schemas = parsed?.components?.schemas ?? {};
    const userSchema = schemas.User ?? Object.values(schemas)[0] as any;
    const ageProp = userSchema?.properties?.age;
    expect(ageProp?.type).toMatch(/integer|number/);
  });

  it('yaml output: valid YAML', () => {
    const raw = run('yaml');
    // strip comment prefix
    const yamlStart = raw.search(/^\w/m);
    const o = yamlStart >= 0 ? raw.slice(yamlStart) : raw;
    expect(() => yaml.load(o)).not.toThrow();
  });

  it('yaml output: all input fields reflected', () => {
    const raw = run('yaml');
    const yamlStart = raw.search(/^\w/m);
    const o = yamlStart >= 0 ? raw.slice(yamlStart) : raw;
    const parsed = yaml.load(o) as any;
    for (const key of ['name', 'email', 'age', 'is_active']) {
      expect(parsed).toHaveProperty(key);
    }
  });
});

// ─── MCP / Vercel AI: 構造の妥当性 ──────────────────────────────────────────

describe('AI tool output structure', () => {
  it('mcp-tool: contains tool definition structure', () => {
    const o = run('mcp-tool');
    // Should define a tool with name and inputSchema
    expect(o).toMatch(/name[\s\S]*:|description[\s\S]*:|inputSchema/);
    // Should reference all input fields somewhere
    expect(o).toContain('name');
    expect(o).toContain('email');
  });

  it('vercel-ai-tool: contains tool() call with parameters', () => {
    const o = run('vercel-ai-tool');
    expect(o).toMatch(/tool\s*\(/);
    expect(o).toMatch(/z\.object\s*\(/);
    // should contain field names
    expect(o).toContain('name');
    expect(o).toContain('email');
  });
});

// ─── Snowflake: 重複カラムのリグレッション ───────────────────────────────────

describe('snowflake: no duplicate columns (regression)', () => {
  it('ID column appears only once', () => {
    const o = run('snowflake');
    const idMatches = (o.match(/^\s+ID\s/gm) ?? []).length;
    expect(idMatches).toBe(1);
  });

  it('CREATED_AT column appears only once', () => {
    const o = run('snowflake');
    const caMatches = (o.match(/\bCREATED_AT\b/g) ?? []).length;
    expect(caMatches).toBe(1);
  });
});
