/**
 * Regression tests for three code-generation defects fixed in
 * fix/discriminated-union-and-record-codegen:
 *
 *   1. Discriminated-union variants with NESTED OBJECT fields emitted dangling
 *      classRef references (`${Variant}_${field}Schema` / interfaces that were
 *      never declared) → broken, uncompilable output. Now gracefully degrades to
 *      the merged object schema.
 *   2. Discriminator VALUES that aren't identifier-safe (e.g. "page-view", 'a"b')
 *      produced invalid variant identifiers and unescaped z.literal(...) strings.
 *   3. A TOP-LEVEL dynamic-keyed map (record) emitted only the value type and
 *      dropped the root schema entirely.
 *
 * These assert structure (no dangling refs, valid identifiers, root type present)
 * rather than exact strings, so they survive cosmetic output changes.
 */
import { describe, it, expect } from 'vitest';
import { runEngine } from '../engine';

// Collect every JS/TS identifier that is referenced but, per the schema, ought to be
// declared as `export const <id> = ` / `export interface <id>` / `export type <id> =`.
const declaredSchemaConsts = (zod: string): Set<string> => {
  const s = new Set<string>();
  for (const m of zod.matchAll(/export const (\w+)\s*(?::[^=]+)?=/g)) s.add(m[1]);
  return s;
};

describe('discriminated union — nested object variants (bug 1)', () => {
  const DU_NESTED = [
    { type: 'circle', center: { x: 1, y: 2 }, radius: 5 },
    { type: 'circle', center: { x: 3, y: 4 }, radius: 6 },
    { type: 'rect', topLeft: { x: 0, y: 0 }, width: 10, height: 20 },
    { type: 'rect', topLeft: { x: 5, y: 5 }, width: 1, height: 2 },
  ];

  it('zod: emits no reference to an undeclared *Schema const', () => {
    const out = runEngine(DU_NESTED, 'zod');
    const declared = declaredSchemaConsts(out);
    // Every `<name>Schema` token used as a value must be declared somewhere.
    const referenced = [...out.matchAll(/(?<![.\w])(\w+Schema)\b/g)].map(m => m[1]);
    for (const ref of referenced) {
      expect(declared.has(ref), `undeclared schema reference: ${ref}`).toBe(true);
    }
    // Specifically must NOT contain the old dangling variant-prefixed refs.
    expect(out).not.toMatch(/rootItem\w+CenterSchema/);
    expect(out).not.toMatch(/rootItem\w+TopLeftSchema/);
    // The nested object is still represented (merged fallback keeps the shape).
    expect(out).toMatch(/z\.object\(\{[\s\S]*x:/);
  });

  it('typescript: every referenced interface/type is declared', () => {
    const out = runEngine(DU_NESTED, 'typescript');
    const declared = new Set<string>();
    for (const m of out.matchAll(/export (?:interface|type) (\w+)/g)) declared.add(m[1]);
    // Built-in / primitive type names that need no declaration.
    const builtin = new Set(['string', 'number', 'boolean', 'any', 'Date', 'Record', 'unknown', 'null']);
    // Capitalised type references inside field positions.
    for (const m of out.matchAll(/:\s*([A-Z]\w+)/g)) {
      const ref = m[1];
      if (builtin.has(ref)) continue;
      expect(declared.has(ref), `undeclared type reference: ${ref}`).toBe(true);
    }
    expect(out).not.toMatch(/RootItem\w+_center/);
  });
});

describe('discriminated union — unsafe discriminator values (bug 2)', () => {
  const DU_HYPHEN = [
    { event_type: 'page-view', url: '/a', dwell: 1 },
    { event_type: 'page-view', url: '/b', dwell: 2 },
    { event_type: 'click', target: 'btn', x: 1 },
    { event_type: 'click', target: 'lnk', x: 2 },
  ];

  it('zod: hyphenated value yields a valid identifier and a real discriminated union', () => {
    const out = runEngine(DU_HYPHEN, 'zod');
    expect(out).toContain('z.discriminatedUnion("event_type"');
    expect(out).toContain('rootItemPageViewSchema');
    expect(out).toContain('z.literal("page-view")');
    // No invalid identifier containing a hyphen on a declaration line.
    expect(out).not.toMatch(/export (?:const|type|interface) \w*-/);
  });

  it('typescript: hyphenated value yields valid interface names', () => {
    const out = runEngine(DU_HYPHEN, 'typescript');
    expect(out).toContain('export interface RootItemPageView');
    expect(out).not.toMatch(/export (?:interface|type) \w*-/);
  });

  it('zod: double-quote in value is escaped in z.literal and folded out of the identifier', () => {
    const out = runEngine([
      { kind: 'a"b', pa: 1, ea: 2 },
      { kind: 'a"b', pa: 3, ea: 4 },
      { kind: 'cd', pb: 1, eb: 2 },
      { kind: 'cd', pb: 3, eb: 4 },
    ], 'zod');
    expect(out).toContain('z.literal("a\\"b")');
    expect(out).not.toMatch(/export const \w*"/); // no raw quote in an identifier
  });
});

describe('discriminated union — flat variants unchanged (regression guard)', () => {
  it('zod: still emits a proper discriminatedUnion for flat variants', () => {
    const out = runEngine([
      { type: 'text', content: 'hi', n: 1 },
      { type: 'text', content: 'yo', n: 2 },
      { type: 'image', url: 'https://x/y.png', w: 1, h: 2 },
      { type: 'image', url: 'https://x/z.png', w: 3, h: 4 },
    ], 'zod');
    expect(out).toContain('z.discriminatedUnion("type"');
    expect(out).toContain('z.literal("text")');
    expect(out).toContain('z.literal("image")');
  });
});

describe('top-level record (bug 3)', () => {
  const REC = {
    user_1: { name: 'a', email: 'a@x.com' },
    user_2: { name: 'b', email: 'b@x.com' },
  };

  it('zod: emits the root z.record alias, not just the value schema', () => {
    const out = runEngine(REC, 'zod');
    expect(out).toContain('export const rootValueSchema = z.object(');
    expect(out).toContain('z.record(z.string(), rootValueSchema)');
    expect(out).toMatch(/export type Root = z\.infer<typeof rootSchema>/);
  });

  it('zod (v3): uses single-arg z.record', () => {
    const out = runEngine(REC, 'zod', '', { zodVersion: 'v3' });
    expect(out).toContain('z.record(rootValueSchema)');
  });

  it('zod: primitive-valued record', () => {
    const out = runEngine({ metric_1: 1, metric_2: 2, metric_3: 3 }, 'zod');
    expect(out).toContain('z.record(z.string(), z.number())');
  });

  it('typescript: emits Record<string, RootValue> root type', () => {
    const out = runEngine(REC, 'typescript');
    expect(out).toContain('export type Root = Record<string, RootValue>');
    expect(out).toContain('export interface RootValue');
  });
});
