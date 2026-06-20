import { describe, it, expect } from 'vitest';
import { migrateZodV3ToV4 } from '../zod-migrate';

describe('migrateZodV3ToV4', () => {
  it('converts z.string().email() to z.email()', () => {
    const r = migrateZodV3ToV4('z.string().email()');
    expect(r.output).toBe('z.email()');
    expect(r.changes).toHaveLength(1);
    expect(r.changes[0].isIso).toBe(false);
  });

  it('converts z.string().url() to z.url()', () => {
    expect(migrateZodV3ToV4('z.string().url()').output).toBe('z.url()');
  });

  it('converts z.string().uuid() to z.uuid()', () => {
    expect(migrateZodV3ToV4('z.string().uuid()').output).toBe('z.uuid()');
  });

  it('converts z.string().datetime() to z.iso.datetime()', () => {
    const r = migrateZodV3ToV4('z.string().datetime()');
    expect(r.output).toBe('z.iso.datetime()');
    expect(r.changes[0].isIso).toBe(true);
  });

  it('converts z.string().date() to z.iso.date()', () => {
    expect(migrateZodV3ToV4('z.string().date()').output).toBe('z.iso.date()');
  });

  it('converts z.string().time() to z.iso.time()', () => {
    expect(migrateZodV3ToV4('z.string().time()').output).toBe('z.iso.time()');
  });

  it('converts z.string().duration() to z.iso.duration()', () => {
    expect(migrateZodV3ToV4('z.string().duration()').output).toBe('z.iso.duration()');
  });

  it('preserves args: z.string().email("msg") → z.email("msg")', () => {
    expect(migrateZodV3ToV4('z.string().email("invalid email")').output).toBe('z.email("invalid email")');
  });

  it('preserves object args: z.string().datetime({ offset: true }) → z.iso.datetime({ offset: true })', () => {
    expect(migrateZodV3ToV4('z.string().datetime({ offset: true })').output).toBe('z.iso.datetime({ offset: true })');
  });

  it('preserves chained .optional(): z.string().email().optional() → z.email().optional()', () => {
    expect(migrateZodV3ToV4('z.string().email().optional()').output).toBe('z.email().optional()');
  });

  it('preserves chained .nullable(): z.string().url().nullable() → z.url().nullable()', () => {
    expect(migrateZodV3ToV4('z.string().url().nullable()').output).toBe('z.url().nullable()');
  });

  it('handles multiple validators in one schema', () => {
    const src = 'const s = z.object({ id: z.string().uuid(), email: z.string().email() })';
    const r = migrateZodV3ToV4(src);
    expect(r.output).toContain('z.uuid()');
    expect(r.output).toContain('z.email()');
    expect(r.changes).toHaveLength(2);
  });

  it('leaves already-v4 code unchanged', () => {
    const src = 'z.email()';
    const r = migrateZodV3ToV4(src);
    expect(r.output).toBe('z.email()');
    expect(r.changes).toHaveLength(0);
  });

  it('handles parens inside string args: z.string().email("has (parens)")', () => {
    const src = 'z.string().email("has (parens) inside")';
    const r = migrateZodV3ToV4(src);
    expect(r.output).toBe('z.email("has (parens) inside")');
  });

  it('does not transform z.string().min().email() (complex chain) and warns', () => {
    const src = 'z.string().min(1).email()';
    const r = migrateZodV3ToV4(src);
    expect(r.output).toBe(src); // unchanged
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  describe('ip()/cidr() — removed in v4, must split into version-specific validators', () => {
    it('splits bare z.string().ip() into a union of ipv4/ipv6 (not the non-existent z.ip())', () => {
      const r = migrateZodV3ToV4('z.string().ip()');
      expect(r.output).toBe('z.union([z.ipv4(), z.ipv6()])');
      expect(r.output).not.toContain('z.ip(');
    });

    it('maps { version: "v4" } to z.ipv4()', () => {
      expect(migrateZodV3ToV4('z.string().ip({ version: "v4" })').output).toBe('z.ipv4()');
    });

    it('maps { version: "v6" } to z.ipv6()', () => {
      expect(migrateZodV3ToV4('z.string().ip({ version: "v6" })').output).toBe('z.ipv6()');
    });

    it('splits bare z.string().cidr() into a union of cidrv4/cidrv6', () => {
      expect(migrateZodV3ToV4('z.string().cidr()').output).toBe('z.union([z.cidrv4(), z.cidrv6()])');
    });

    it('maps cidr { version: "v4" } to z.cidrv4()', () => {
      expect(migrateZodV3ToV4('z.string().cidr({ version: "v4" })').output).toBe('z.cidrv4()');
    });

    it('preserves a message on a versioned conversion as { error }', () => {
      expect(migrateZodV3ToV4('z.string().ip({ version: "v4", message: "bad" })').output)
        .toBe('z.ipv4({ error: "bad" })');
    });

    it('warns when a message is dropped during a union split', () => {
      const r = migrateZodV3ToV4('z.string().ip("bad ip")');
      expect(r.output).toBe('z.union([z.ipv4(), z.ipv6()])');
      expect(r.warnings.length).toBeGreaterThan(0);
    });

    it('transforms ip() inside a larger schema alongside other formats', () => {
      const r = migrateZodV3ToV4('z.object({ ip: z.string().ip(), email: z.string().email() })');
      expect(r.output).toBe('z.object({ ip: z.union([z.ipv4(), z.ipv6()]), email: z.email() })');
    });

    it('does not transform a chained .min().ip() but warns', () => {
      const r = migrateZodV3ToV4('z.string().min(1).ip()');
      expect(r.output).toBe('z.string().min(1).ip()');
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  it('counts changes correctly', () => {
    const src = `
      id: z.string().uuid(),
      email: z.string().email(),
      url: z.string().url(),
      at: z.string().datetime(),
    `;
    const r = migrateZodV3ToV4(src);
    expect(r.changes).toHaveLength(4);
  });
});
