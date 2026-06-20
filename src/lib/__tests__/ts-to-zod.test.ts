/**
 * TypeScript → Zod conversion tests.
 *
 * Focus: the P0 correctness fixes that previously produced `z.unknown()` or
 * silently dropped fields — nested inline objects, `extends` inheritance,
 * index signatures, TS `enum` declarations — plus the tokenizer-level fixes
 * (single-line bodies, trailing comments) that those depend on.
 */
import { describe, it, expect } from 'vitest';
import { tsToZod } from '../ts-to-zod';

describe('tsToZod', () => {
  describe('regression: existing behavior preserved', () => {
    it('converts primitives, arrays, optionals, enums, refs', () => {
      const out = tsToZod(`interface Address { street: string; zip?: string }
interface User {
  id: string;
  age: number;
  active: boolean;
  role: 'admin' | 'user';
  tags: string[];
  address: Address;
}`).output;
      expect(out).toContain("import { z } from 'zod';");
      expect(out).toContain('id: z.string()');
      expect(out).toContain('age: z.number()');
      expect(out).toContain('active: z.boolean()');
      expect(out).toContain("role: z.enum(['admin', 'user'])");
      expect(out).toContain('tags: z.array(z.string())');
      expect(out).toContain('address: AddressSchema');
      expect(out).toContain('zip: z.string().optional()');
    });

    it('reports an error when no types are found', () => {
      const r = tsToZod('const x = 1;');
      expect(r.schemaCount).toBe(0);
      expect(r.error).toBeTruthy();
    });
  });

  describe('nested inline object literals', () => {
    it('converts an inline object field to a nested z.object (not z.unknown)', () => {
      const out = tsToZod(`interface User {
  name: string;
  address: { street: string; city: string; zip?: string };
}`).output;
      expect(out).not.toContain('z.unknown()');
      expect(out).toContain('address: z.object({');
      expect(out).toContain('street: z.string()');
      expect(out).toContain('zip: z.string().optional()');
    });

    it('handles deeply nested inline objects', () => {
      const out = tsToZod(`interface Deep {
  a: { b: { c: string } };
}`).output;
      expect(out).toContain('a: z.object({ b: z.object({ c: z.string() }) })');
    });

    it('marks an optional inline object field as optional', () => {
      const out = tsToZod(`interface T { meta?: { k: string } }`).output;
      expect(out).toContain('meta: z.object({ k: z.string() }).optional()');
    });
  });

  describe('tokenizer robustness (root cause of silent mis-conversions)', () => {
    it('parses a single-line interface with multiple fields', () => {
      const out = tsToZod(`interface P { x: number; y: number; label: string }`).output;
      expect(out).not.toContain('z.unknown()');
      expect(out).toContain('x: z.number()');
      expect(out).toContain('y: z.number()');
      expect(out).toContain('label: z.string()');
    });

    it('ignores trailing line comments', () => {
      const out = tsToZod(`interface A {
  id: string; // primary key
  age: number;
}`).output;
      expect(out).toContain('id: z.string()');
      expect(out).not.toContain('z.unknown()');
    });
  });

  describe('extends inheritance', () => {
    it('emits BaseSchema.extend for a single parent', () => {
      const out = tsToZod(`interface Base { id: string; createdAt: Date }
interface Admin extends Base { role: string }`).output;
      expect(out).toContain('export const AdminSchema = BaseSchema.extend({');
      expect(out).toContain('role: z.string()');
    });

    it('chains .extend(...shape) for multiple parents', () => {
      const out = tsToZod(`interface A { a: string }
interface B { b: number }
interface C extends A, B { c: boolean }`).output;
      expect(out).toContain('CSchema = ASchema.extend(BSchema.shape).extend({');
    });

    it('declares parents before children', () => {
      const out = tsToZod(`interface Admin extends Base { role: string }
interface Base { id: string }`).output;
      expect(out.indexOf('BaseSchema =')).toBeLessThan(out.indexOf('AdminSchema ='));
    });
  });

  describe('index signatures', () => {
    it('converts a pure index signature to z.record', () => {
      const out = tsToZod(`interface Dict { [key: string]: number }`).output;
      expect(out).toContain('DictSchema = z.record(z.string(), z.number())');
    });

    it('uses .catchall when named fields coexist with an index signature', () => {
      const out = tsToZod(`interface Mixed {
  id: string;
  [key: string]: string;
}`).output;
      expect(out).toContain('}).catchall(z.string())');
      expect(out).toContain('id: z.string()');
    });
  });

  describe('TS enum declarations', () => {
    it('converts a string enum to z.enum with its values', () => {
      const out = tsToZod(`enum Role { Admin = 'admin', User = 'user', Guest = 'guest' }
interface U { role: Role }`).output;
      expect(out).toContain("RoleSchema = z.enum(['admin', 'user', 'guest'])");
      expect(out).toContain('role: RoleSchema');
    });

    it('re-emits the enum and uses z.nativeEnum for numeric enums', () => {
      const out = tsToZod(`enum Dir { Up, Down }
interface Move { dir: Dir }`).output;
      expect(out).toContain('export enum Dir { Up, Down }');
      expect(out).toContain('DirSchema = z.nativeEnum(Dir)');
      expect(out).toContain('dir: DirSchema');
    });

    it('declares enum schemas before interfaces that reference them', () => {
      const out = tsToZod(`interface U { role: Role }
enum Role { Admin = 'admin' }`).output;
      expect(out.indexOf('RoleSchema =')).toBeLessThan(out.indexOf('USchema ='));
    });
  });
});
