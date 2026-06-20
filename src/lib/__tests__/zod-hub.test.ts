/**
 * Zod Hub guarantee tests — locks the "Zod ⇄ everything" capability the product
 * positioning rests on, exercised through the SAME path the Workbench UI uses
 * (`runEngine`), not by calling parsers/generators directly. This matters: an
 * earlier direct-call version gave false confidence because `runEngine`'s built-in
 * OpenAPI / JSON Schema detection (the real wiring) was never hit.
 *
 * Workbench routing (src/components/Workbench.tsx) that these mirror:
 *   - JSON / YAML            → runEngine(parsedObject, 'zod')
 *   - TypeScript             → runEngine(parseTypeScriptToSchema(src), 'zod')
 *   - OpenAPI / JSON Schema  → runEngine(parsedObject, 'zod')   // auto-detected inside runEngine
 *   - SQL                    → parseSQLToZod(src)               // CREATE TABLE special case
 *   - Zod input (reverse)    → runEngine(parseZodToSchema(src), <target>)
 *
 * Each cell asserts what we can actually prove: Zod/TS output compiles
 * (ts.transpileModule, syntax), OpenAPI is valid YAML, JSON Schema / Mock are
 * valid JSON, formats/enums survive, and resolvable types never degrade to z.any().
 */
import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import * as ts from 'typescript';
import { runEngine } from '../engine';
import { parseTypeScriptToSchema, parseZodToSchema, parseYAML, parseSQLToZod } from '../parsers';

const compiles = (code: string): boolean => {
  const r = ts.transpileModule(code, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
  });
  return (r.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error).length === 0;
};
const toZod = (input: any): string => runEngine(input, 'zod', '', {});

describe('Zod Hub: X → Zod through the runEngine UI path', () => {
  it('JSON → Zod', () => {
    const out = toZod({
      id: '550e8400-e29b-41d4-a716-446655440000',
      email: 'a@b.c',
      website: 'https://x.y',
      address: { city: 'Tokyo' },
    });
    expect(compiles(out)).toBe(true);
    expect(out).toContain('z.email()');
    expect(out).toContain('z.url()');
    expect(out).not.toContain('z.any()'); // nested object must resolve, not degrade
  });

  it('TypeScript → Zod', () => {
    const schema = parseTypeScriptToSchema(
      `interface User { id: string; email: string; role: "admin" | "user"; address: Address }
       interface Address { city: string }`,
    )!;
    const out = toZod(schema);
    expect(compiles(out)).toBe(true);
    expect(out).toMatch(/z\.enum\(\[[^\]]*admin[^\]]*user[^\]]*\]\)/);
    expect(out).not.toContain('z.any()');
  });

  it('OpenAPI → Zod (runEngine auto-detects and emits ALL components)', () => {
    const oapi = `openapi: 3.0.0
info: { title: API, version: 1.0.0 }
components:
  schemas:
    User:
      type: object
      properties:
        id: { type: string, format: uuid }
        email: { type: string, format: email }
    Order:
      type: object
      properties:
        orderId: { type: string }
        total: { type: number }`;
    const out = toZod(parseYAML(oapi));
    expect(compiles(out)).toBe(true);
    // "B": every component schema is emitted, not just the first.
    expect(out).toContain('userSchema');
    expect(out).toContain('orderSchema');
    expect(out).toContain('z.email()');
    expect(out).not.toContain('z.any()');
  });

  it('JSON Schema → Zod (bare schema, no $schema marker, via runEngine)', () => {
    const js = {
      $defs: { Address: { type: 'object', properties: { city: { type: 'string' } } } },
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        address: { $ref: '#/$defs/Address' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['id'],
    };
    const out = toZod(js);
    expect(compiles(out)).toBe(true);
    // Detected as a schema (not inferred as data) → real fields, $ref resolved.
    expect(out).toContain('z.array(z.string())');
    expect(out).toContain('addressSchema');
    expect(out).not.toContain('properties:'); // would appear if mis-inferred as plain data
  });

  it('YAML → Zod', () => {
    const out = toZod(parseYAML('id: 1\nemail: a@b.c\nnested:\n  city: Tokyo'));
    expect(compiles(out)).toBe(true);
    expect(out).toContain('z.email()');
    expect(out).not.toContain('z.any()');
  });

  it('SQL → Zod (parseSQLToZod — Workbench CREATE TABLE special case)', () => {
    const out = parseSQLToZod('CREATE TABLE users ( id UUID PRIMARY KEY, email VARCHAR(255) NOT NULL, age INT );');
    expect(typeof out).toBe('string');
    expect(compiles(out as string)).toBe(true);
    expect(out).toContain('z.object(');
    expect(out).toContain('email:');
  });
});

describe('Zod Hub: Zod → Y through the runEngine reverse path', () => {
  const zodIn = `z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    age: z.number().int().min(0),
    role: z.enum(["admin", "user"]),
    address: z.object({ city: z.string() })
  })`;
  const zs = () => parseZodToSchema(zodIn)!;

  it('parses the source Zod into a usable schema', () => {
    const s = zs();
    expect(s.type).toBe('object');
    expect(s.fields?.email?.format).toBe('email');
    expect(s.fields?.address?.type).toBe('object');
  });

  it('Zod → TypeScript (compiles)', () => {
    const out = runEngine(zs(), 'typescript', '', {});
    expect(compiles(out)).toBe(true);
    expect(out).toContain('email');
    expect(out).toContain('city');
  });

  it('Zod → OpenAPI (valid YAML, formats preserved)', () => {
    const out = runEngine(zs(), 'openapi', '', {});
    expect(yaml.load(out)).toBeTruthy();
    expect(out).toContain('format: email');
    expect(out).toContain('format: uuid');
  });

  it('Zod → JSON Schema (valid JSON, object-shaped)', () => {
    const doc = JSON.parse(runEngine(zs(), 'jsonschema', '', {}));
    expect(doc.type).toBe('object');
    expect(doc.properties?.email).toBeTruthy();
  });

  it('Zod → Mock JSON (valid JSON with fields populated)', () => {
    const parsed = JSON.parse(runEngine(zs(), 'mock', '', {}));
    expect(parsed).toHaveProperty('email');
    expect(parsed).toHaveProperty('address');
    expect(typeof parsed.address).toBe('object');
  });
});
