/**
 * Zod → JSON Reverse Mode Tests
 * Verifies that Zod schema text is correctly parsed into TypeMorph's internal Schema,
 * enabling JSON mock generation from Zod schemas.
 */

import { describe, it, expect } from 'vitest';
import { parseZodToSchema } from '../parsers';
import { mockGen, zodGen } from '../generators';

describe('parseZodToSchema', () => {
  describe('primitive types', () => {
    it('parses z.string()', () => {
      const s = parseZodToSchema('const x = z.object({ name: z.string() })');
      expect(s?.fields?.name?.type).toBe('string');
    });

    it('parses z.number()', () => {
      const s = parseZodToSchema('const x = z.object({ age: z.number() })');
      expect(s?.fields?.age?.type).toBe('number');
    });

    it('parses z.boolean()', () => {
      const s = parseZodToSchema('const x = z.object({ active: z.boolean() })');
      expect(s?.fields?.active?.type).toBe('boolean');
    });

    it('parses z.number().int() as integer format', () => {
      const s = parseZodToSchema('const x = z.object({ count: z.number().int() })');
      expect(s?.fields?.count?.format).toBe('int');
    });

    it('parses z.any() as any type', () => {
      const s = parseZodToSchema('const x = z.object({ meta: z.any() })');
      expect(s?.fields?.meta?.type).toBe('any');
    });
  });

  describe('string formats', () => {
    it('parses z.string().email() format', () => {
      const s = parseZodToSchema('const x = z.object({ email: z.string().email() })');
      expect(s?.fields?.email?.format).toBe('email');
    });

    it('parses z.string().uuid() format', () => {
      const s = parseZodToSchema('const x = z.object({ id: z.string().uuid() })');
      expect(s?.fields?.id?.format).toBe('uuid');
    });

    it('parses z.string().url() format', () => {
      const s = parseZodToSchema('const x = z.object({ website: z.string().url() })');
      expect(s?.fields?.website?.format).toBe('url');
    });

    it('parses z.string().datetime() format', () => {
      const s = parseZodToSchema('const x = z.object({ createdAt: z.string().datetime() })');
      expect(s?.fields?.createdAt?.format).toBe('datetime');
    });

    it('parses z.email() shorthand', () => {
      const s = parseZodToSchema('const x = z.object({ email: z.email() })');
      expect(s?.fields?.email?.format).toBe('email');
    });
  });

  describe('optional and nullable', () => {
    it('parses .optional()', () => {
      const s = parseZodToSchema('const x = z.object({ bio: z.string().optional() })');
      expect(s?.fields?.bio?.optional).toBe(true);
    });

    it('parses .nullable()', () => {
      const s = parseZodToSchema('const x = z.object({ avatar: z.string().nullable() })');
      expect(s?.fields?.avatar?.nullable).toBe(true);
    });

    it('parses .nullish() as both optional and nullable', () => {
      const s = parseZodToSchema('const x = z.object({ note: z.string().nullish() })');
      expect(s?.fields?.note?.optional).toBe(true);
      expect(s?.fields?.note?.nullable).toBe(true);
    });
  });

  describe('z.enum', () => {
    it('parses enum values', () => {
      const s = parseZodToSchema("const x = z.object({ role: z.enum(['admin', 'user', 'guest']) })");
      expect(s?.fields?.role?.type).toBe('string');
      expect(s?.fields?.role?.enumValues).toEqual(['admin', 'user', 'guest']);
    });
  });

  // R1 regression: the union branch previously kept only members[0], silently
  // dropping every other member (z.union([z.literal("admin"), z.literal("user")]) → "admin").
  describe('z.union (R1: no member dropping)', () => {
    it('merges a union of literals into a single enum', () => {
      const s = parseZodToSchema('z.object({ role: z.union([z.literal("admin"), z.literal("user"), z.literal("guest")]) })');
      expect(s?.fields?.role?.type).toBe('string');
      expect(s?.fields?.role?.enumValues).toEqual(['admin', 'user', 'guest']);
    });

    it('preserves heterogeneous primitives as a type-level union', () => {
      const s = parseZodToSchema('z.object({ id: z.union([z.string(), z.number()]) })');
      expect(s?.fields?.id?.type).toBe('union');
      expect(s?.fields?.id?.unionTypes).toEqual(['string', 'number']);
    });

    it('treats z.null() member as nullability, not a variant', () => {
      const s = parseZodToSchema('z.object({ name: z.union([z.string(), z.null()]) })');
      expect(s?.fields?.name?.type).toBe('string');
      expect(s?.fields?.name?.nullable).toBe(true);
    });

    it('merges object members of a union, marking partial fields optional', () => {
      const s = parseZodToSchema('z.object({ shape: z.union([z.object({ a: z.string() }), z.object({ b: z.number() })]) })');
      const shape = s?.fields?.shape;
      expect(shape?.type).toBe('object');
      expect(shape?.fields?.a?.optional).toBe(true);
      expect(shape?.fields?.b?.optional).toBe(true);
    });

    it('keeps all variant fields from a discriminatedUnion', () => {
      const input = 'z.object({ event: z.discriminatedUnion("type", [z.object({ type: z.literal("a"), x: z.string() }), z.object({ type: z.literal("b"), y: z.number() })]) })';
      const event = parseZodToSchema(input)?.fields?.event;
      expect(event?.type).toBe('object');
      expect(event?.discriminatorField).toBe('type');
      expect(event?.fields?.x?.optional).toBe(true);
      expect(event?.fields?.y?.optional).toBe(true);
    });
  });

  // R2/R3 regression: tuple element types and record value types were previously
  // discarded (z.tuple → itemType:any, z.record → fields:{}), so the round-trip
  // (paste Zod → convert) silently lost them.
  describe('z.tuple (R2: element types preserved)', () => {
    it('captures each positional element type', () => {
      const s = parseZodToSchema('z.object({ coord: z.tuple([z.string(), z.number()]) })');
      const t = s?.fields?.coord;
      expect(t?.type).toBe('array');
      expect(t?.tupleTypes?.map(e => e.type)).toEqual(['string', 'number']);
    });

    it('round-trips back to z.tuple([...]) through zodGen', () => {
      const s = parseZodToSchema('z.object({ pair: z.tuple([z.boolean(), z.string()]) })')!;
      expect(zodGen.generate(s, 'Root')).toContain('pair: z.tuple([z.boolean(), z.string()])');
    });
  });

  describe('z.record (R3: value type preserved)', () => {
    it('captures the value type (v4 two-arg form)', () => {
      const s = parseZodToSchema('z.object({ metrics: z.record(z.string(), z.number()) })');
      expect(s?.fields?.metrics?.recordValueType?.type).toBe('number');
    });

    it('captures the value type from v3 single-arg form', () => {
      const s = parseZodToSchema('z.object({ legacy: z.record(z.boolean()) })');
      expect(s?.fields?.legacy?.recordValueType?.type).toBe('boolean');
    });

    it('round-trips back to z.record(z.string(), V) through zodGen', () => {
      const s = parseZodToSchema('z.object({ scores: z.record(z.string(), z.number()) })')!;
      expect(zodGen.generate(s, 'Root')).toContain('scores: z.record(z.string(), z.number())');
    });

    it('generates a representative mock for a record', () => {
      const s = parseZodToSchema('z.object({ flags: z.record(z.boolean()) })')!;
      const parsed = JSON.parse(mockGen.generate(s));
      expect(typeof parsed.flags).toBe('object');
      expect(Object.values(parsed.flags).every(v => typeof v === 'boolean')).toBe(true);
    });
  });

  // R4 regression: value-level constraints (.min/.max/.regex/.default/.describe/.length)
  // were dropped entirely by parseZodTypeStr, so the round-trip lost them.
  describe('constraint preservation (R4: raw passthrough)', () => {
    const rt = (inner: string) => zodGen.generate(parseZodToSchema(`z.object({ f: ${inner} })`)!, 'Root');

    it('preserves numeric .min/.max', () => {
      expect(parseZodToSchema('z.object({ age: z.number().min(0).max(120) })')?.fields?.age?.refinements)
        .toEqual(['.min(0)', '.max(120)']);
      expect(rt('z.number().min(0).max(120)')).toContain('f: z.number().min(0).max(120)');
    });

    it('preserves string .min/.max/.length', () => {
      expect(rt('z.string().min(1).max(50)')).toContain('f: z.string().min(1).max(50)');
    });

    it('preserves .default and .describe verbatim', () => {
      expect(rt('z.string().default("none").describe("user bio")')).toContain('f: z.string().default("none").describe("user bio")');
    });

    it('preserves .regex including parens inside the pattern', () => {
      const out = rt('z.string().regex(/^(a|b)+$/i)');
      expect(out).toContain('f: z.string().regex(/^(a|b)+$/i)');
    });

    it('keeps .default("a)b") with a paren inside the string literal', () => {
      const s = parseZodToSchema('z.object({ f: z.string().default("a)b") })');
      expect(s?.fields?.f?.refinements).toEqual(['.default("a)b")']);
    });

    it('preserves array-level .min/.max', () => {
      expect(rt('z.array(z.string()).min(1).max(10)')).toContain('f: z.array(z.string()).min(1).max(10)');
    });

    it('combines a captured format with refinements (z.email().min(5))', () => {
      expect(rt('z.string().email().min(5)')).toContain('f: z.email().min(5)');
    });

    it('does NOT double-apply name-based constraints when explicit ones exist', () => {
      // field literally named "age" would otherwise get name-based .min(0).max(150)
      const out = zodGen.generate(parseZodToSchema('z.object({ age: z.number().min(0).max(120) })')!, 'Root');
      expect(out).toContain('age: z.number().min(0).max(120)');
      expect(out).not.toContain('.max(150)');
    });
  });

  // R5 regression: z.literal(...) previously widened to z.string()/z.any(), silently
  // dropping the literal value (z.literal("user") → z.string(), z.literal(42) → z.string()).
  describe('z.literal (R5: value preserved)', () => {
    const rt = (inner: string) => zodGen.generate(parseZodToSchema(`z.object({ f: ${inner} })`)!, 'Root');

    it('captures a string literal value', () => {
      const f = parseZodToSchema('z.object({ f: z.literal("user") })')?.fields?.f;
      expect(f?.type).toBe('string');
      expect(f?.literalValue).toBe('user');
    });

    it('captures a numeric literal value', () => {
      const f = parseZodToSchema('z.object({ f: z.literal(42) })')?.fields?.f;
      expect(f?.type).toBe('number');
      expect(f?.literalValue).toBe(42);
    });

    it('captures a boolean literal value', () => {
      const f = parseZodToSchema('z.object({ f: z.literal(true) })')?.fields?.f;
      expect(f?.type).toBe('boolean');
      expect(f?.literalValue).toBe(true);
    });

    it('round-trips a string literal back to z.literal("user")', () => {
      expect(rt('z.literal("user")')).toContain('f: z.literal("user")');
    });

    it('round-trips a numeric literal back to z.literal(42)', () => {
      expect(rt('z.literal(42)')).toContain('f: z.literal(42)');
    });

    it('round-trips a boolean literal back to z.literal(true)', () => {
      expect(rt('z.literal(true)')).toContain('f: z.literal(true)');
    });

    it('does NOT widen an explicit literal to z.string()', () => {
      expect(rt('z.literal("user")')).not.toContain('f: z.string()');
    });

    // P2 heuristic must still hold: an INFERRED single-value enum (no literalValue)
    // stays widened, since one JSON sample is weak evidence for a closed literal.
    it('still widens an inferred single-value enum to z.string()', () => {
      const out = zodGen.generate({ type: 'object', fields: { f: { type: 'string', enumValues: ['active'] } } } as any, 'Root');
      expect(out).toContain('f: z.string()');
    });
  });

  // R6 regression: z.coerce.<type>() previously fell through to z.any(), losing the
  // base type entirely (z.coerce.number() → z.any()).
  describe('z.coerce (R6: base type preserved)', () => {
    const rt = (inner: string) => zodGen.generate(parseZodToSchema(`z.object({ f: ${inner} })`)!, 'Root');

    it('captures z.coerce.number() base type and flag', () => {
      const f = parseZodToSchema('z.object({ f: z.coerce.number() })')?.fields?.f;
      expect(f?.type).toBe('number');
      expect(f?.coerced).toBe(true);
    });

    it('round-trips z.coerce.number()', () => {
      expect(rt('z.coerce.number()')).toContain('f: z.coerce.number()');
    });

    it('round-trips z.coerce.string()', () => {
      expect(rt('z.coerce.string()')).toContain('f: z.coerce.string()');
    });

    it('round-trips z.coerce.boolean()', () => {
      expect(rt('z.coerce.boolean()')).toContain('f: z.coerce.boolean()');
    });

    it('does NOT drop a coerced number to z.any()', () => {
      expect(rt('z.coerce.number()')).not.toContain('z.any()');
    });
  });

  describe('z.array', () => {
    it('parses z.array(z.string())', () => {
      const s = parseZodToSchema('const x = z.object({ tags: z.array(z.string()) })');
      expect(s?.fields?.tags?.type).toBe('array');
      expect(s?.fields?.tags?.itemType?.type).toBe('string');
    });

    it('parses z.array(z.number())', () => {
      const s = parseZodToSchema('const x = z.object({ scores: z.array(z.number()) })');
      expect(s?.fields?.scores?.itemType?.type).toBe('number');
    });
  });

  describe('nested z.object', () => {
    it('parses nested object recursively', () => {
      const input = `const x = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email(),
        }),
      })`;
      const s = parseZodToSchema(input);
      expect(s?.fields?.user?.type).toBe('object');
      expect(s?.fields?.user?.fields?.name?.type).toBe('string');
      expect(s?.fields?.user?.fields?.email?.format).toBe('email');
    });
  });

  describe('input format variants', () => {
    it('parses bare z.object({}) without const assignment', () => {
      const s = parseZodToSchema('z.object({ name: z.string() })');
      expect(s?.fields?.name?.type).toBe('string');
    });

    it('parses export const schema = z.object({})', () => {
      const s = parseZodToSchema('export const schema = z.object({ id: z.string().uuid() })');
      expect(s?.fields?.id?.format).toBe('uuid');
    });

    it('returns null for plain JSON input (not a Zod schema)', () => {
      const s = parseZodToSchema('{ "name": "Alice" }');
      expect(s).toBeNull();
    });

    it('sets _isTypeMorphSchema flag', () => {
      const s = parseZodToSchema('z.object({ id: z.string() })') as any;
      expect(s?._isTypeMorphSchema).toBe(true);
    });
  });

  describe('mock JSON generation from Zod schema', () => {
    it('generates valid JSON from a parsed Zod schema', () => {
      const schema = parseZodToSchema(`
        const userSchema = z.object({
          id: z.string().uuid(),
          email: z.string().email(),
          age: z.number().int(),
          isActive: z.boolean(),
        })
      `);
      expect(schema).not.toBeNull();
      const mock = mockGen.generate(schema!);
      const parsed = JSON.parse(mock);
      expect(parsed).toHaveProperty('email');
      expect(parsed).toHaveProperty('age');
      expect(typeof parsed.isActive).toBe('boolean');
    });

    it('generates enum value in mock output', () => {
      const schema = parseZodToSchema("z.object({ role: z.enum(['admin', 'user']) })");
      const mock = mockGen.generate(schema!);
      const parsed = JSON.parse(mock);
      expect(['admin', 'user']).toContain(parsed.role);
    });
  });
});
