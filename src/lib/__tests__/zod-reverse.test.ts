/**
 * Zod → JSON Reverse Mode Tests
 * Verifies that Zod schema text is correctly parsed into TypeMorph's internal Schema,
 * enabling JSON mock generation from Zod schemas.
 */

import { describe, it, expect } from 'vitest';
import { parseZodToSchema } from '../parsers';
import { mockGen } from '../generators';

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
