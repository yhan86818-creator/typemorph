/**
 * Zod Hub guarantee tests — locks the "Zod ⇄ everything" capability that the
 * product positioning rests on. Each cell asserts what we can actually PROVE:
 *   - → Zod / Zod → TS  : output compiles (ts.transpileModule, syntax check)
 *   - Zod → OpenAPI      : output is valid YAML
 *   - Zod → JSON Schema  : output is valid JSON, draft-07 shaped
 *   - Zod → Mock JSON    : output is valid JSON
 * plus semantic markers (formats/enums/nested types survive) and the guarantee
 * that resolvable types never degrade to `z.any()`.
 *
 * If a future change silently breaks one of these directions, this test fails —
 * so the marketing claim stays honest.
 */
import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import * as ts from 'typescript';
import { inferSchema } from '../engine';
import { parseTypeScriptToSchema, parseZodToSchema, parseYAML, parseSQLToZod } from '../parsers';
import { isOpenAPISpec, parseOpenAPIComponents } from '../openapi-parser';
import { isJSONSchema, parseJSONSchema } from '../jsonschema-parser';
import { zodGen, tsGen, jsonSchemaGen, mockGen } from '../generators';
import { openApiGen } from '../generators-extended';

const compiles = (code: string): boolean => {
  const r = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return (r.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length === 0;
};

describe('Zod Hub: X → Zod (every input produces rich, compiling Zod)', () => {
  it('JSON → Zod', () => {
    const json = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'a@b.c',
      website: 'https://x.y',
      address: { city: 'Tokyo' },
    };
    const out = zodGen.generate(inferSchema(json), 'Root');
    expect(compiles(out)).toBe(true);
    expect(out).toContain('z.email()');
    expect(out).toContain('z.url()');
    expect(out).not.toContain('z.any()'); // nested object must resolve, not degrade
  });

  it('TypeScript → Zod', () => {
    const tsIn = `interface User { id: string; email: string; role: "admin" | "user"; address: Address }
interface Address { city: string }`;
    const out = zodGen.generate(parseTypeScriptToSchema(tsIn)!, 'Root');
    expect(compiles(out)).toBe(true);
    expect(out).toMatch(/z\.enum\(\[[^\]]*admin[^\]]*user[^\]]*\]\)/);
    expect(out).not.toContain('z.any()');
  });

  it('OpenAPI → Zod', () => {
    const oapi = `openapi: 3.0.0
components:
  schemas:
    User:
      type: object
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
        address: { type: object, properties: { city: { type: string } } }`;
    const doc = yaml.load(oapi);
    expect(isOpenAPISpec(doc)).toBe(true);
    const out = zodGen.generate(parseOpenAPIComponents(doc as any)[0].schema, 'Root');
    expect(compiles(out)).toBe(true);
    expect(out).toContain('z.email()');
    expect(out).not.toContain('z.any()');
  });

  it('JSON Schema → Zod (bare schema, no $schema marker)', () => {
    const js = {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    };
    expect(isJSONSchema(js)).toBe(true);
    const out = zodGen.generate(parseJSONSchema(js)[0].schema, 'Root');
    expect(compiles(out)).toBe(true);
    expect(out).toContain('z.array(z.string())');
    expect(out).not.toContain('z.any()');
  });

  it('YAML → Zod', () => {
    const data = parseYAML('id: 1\nemail: a@b.c\nnested:\n  city: Tokyo');
    const out = zodGen.generate(inferSchema(data), 'Root');
    expect(compiles(out)).toBe(true);
    expect(out).toContain('z.email()');
    expect(out).not.toContain('z.any()');
  });

  it('SQL → Zod', () => {
    const out = parseSQLToZod('CREATE TABLE users ( id UUID PRIMARY KEY, email VARCHAR(255) NOT NULL, age INT );');
    expect(typeof out).toBe('string');
    expect(compiles(out as string)).toBe(true);
    expect(out).toContain('z.object(');
    expect(out).toContain('id:');
    expect(out).toContain('email:');
  });
});

describe('Zod Hub: Zod → Y (reverse mode feeds every target)', () => {
  const zodIn = `z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    age: z.number().int().min(0),
    role: z.enum(["admin", "user"]),
    address: z.object({ city: z.string() })
  })`;
  const schema = () => parseZodToSchema(zodIn)!;

  it('parses the source Zod into a usable schema', () => {
    const s = schema();
    expect(s.type).toBe('object');
    expect(s.fields?.email?.format).toBe('email');
    expect(s.fields?.address?.type).toBe('object');
  });

  it('Zod → TypeScript (compiles)', () => {
    const out = tsGen.generate(schema(), 'User');
    expect(compiles(out)).toBe(true);
    expect(out).toContain('email');
    expect(out).toContain('city');
  });

  it('Zod → OpenAPI (valid YAML, formats preserved)', () => {
    const out = openApiGen.generate(schema(), 'User');
    const doc = yaml.load(out) as any;
    expect(doc).toBeTruthy();
    expect(out).toContain('format: email');
    expect(out).toContain('format: uuid');
  });

  it('Zod → JSON Schema (valid JSON, object-shaped)', () => {
    const out = jsonSchemaGen.generate(schema());
    const doc = JSON.parse(out);
    expect(doc.type).toBe('object');
    expect(doc.properties?.email).toBeTruthy();
  });

  it('Zod → Mock JSON (valid JSON with the fields populated)', () => {
    const out = mockGen.generate(schema());
    const parsed = JSON.parse(out);
    expect(parsed).toHaveProperty('email');
    expect(parsed).toHaveProperty('address');
    expect(typeof parsed.address).toBe('object');
  });
});
