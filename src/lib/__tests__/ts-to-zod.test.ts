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

  describe('JSDoc constraint annotations (NEW-B)', () => {
    it('applies numeric @min/@max to z.number()', () => {
      const out = tsToZod(`interface P { /** @min 0 @max 100 */ pct: number; }`).output;
      expect(out).toContain('pct: z.number().min(0).max(100)');
    });

    it('applies @int / @positive / @negative to z.number()', () => {
      const out = tsToZod(`interface P { /** @int @positive */ stock: number; }`).output;
      expect(out).toContain('stock: z.number().int().positive()');
    });

    it('applies @email / @url / @uuid to z.string() using v3/v4-safe chained form', () => {
      const out = tsToZod(`interface P {
        /** @email */ a: string;
        /** @url */ b: string;
        /** @uuid */ c: string;
      }`).output;
      expect(out).toContain('a: z.string().email()');
      expect(out).toContain('b: z.string().url()');
      expect(out).toContain('c: z.string().uuid()');
    });

    it('applies @min/@max to z.string() as length and validates @pattern', () => {
      const out = tsToZod(`interface P {
        /** @min 2 @max 8 */ name: string;
        /** @pattern ^[A-Z]{3}$ */ code: string;
      }`).output;
      expect(out).toContain('name: z.string().min(2).max(8)');
      expect(out).toContain('code: z.string().regex(/^[A-Z]{3}$/)');
    });

    it('escapes slashes in @pattern so the regex literal stays well-formed', () => {
      const out = tsToZod(`interface P { /** @pattern a/b */ path: string; }`).output;
      expect(out).toContain('z.string().regex(/a\\/b/)');
    });

    it('drops invalid @pattern instead of emitting broken code', () => {
      const out = tsToZod(`interface P { /** @pattern [unterminated */ code: string; }`).output;
      expect(out).toContain('code: z.string()');
      expect(out).not.toContain('.regex(');
    });

    it('turns leading free text into .describe()', () => {
      const out = tsToZod(`interface P { /** The display title @min 1 */ title: string; }`).output;
      expect(out).toContain('.describe("The display title")');
      expect(out).toContain('.min(1)');
    });

    it('only describes non-string/number bases (ignores numeric/format tags)', () => {
      const out = tsToZod(`interface P {
        /** @min 0 */ items: string[];
        /** @email */ flag: boolean;
      }`).output;
      expect(out).toContain('items: z.array(z.string())');
      expect(out).toContain('flag: z.boolean()');
      expect(out).not.toContain('items: z.array(z.string()).min');
    });

    it('does NOT leak a constraint onto an unrelated same-named field', () => {
      const out = tsToZod(`interface A { /** @max 5 */ rating: number; }
interface B { rating: number; }`).output;
      // 'rating' is not globally unique → annotation is dropped entirely
      expect(out).not.toContain('.max(5)');
    });

    it('keeps constraints before .optional() on optional fields', () => {
      const out = tsToZod(`interface P { /** @min 1 */ code?: string; }`).output;
      expect(out).toContain('code: z.string().min(1).optional()');
    });

    it('applies constraints inside object type aliases too', () => {
      const out = tsToZod(`type Cfg = { /** @min 0 @max 1 */ ratio: number; };`).output;
      expect(out).toContain('ratio: z.number().min(0).max(1)');
    });
  });
});
