/**
 * Zod linter tests. Two halves of equal importance:
 *   1. It catches the real issues (semantic format gaps + the generic rules).
 *   2. It does NOT false-positive — a linter that cries wolf gets disabled. The
 *      "no false positives" block is the load-bearing one.
 *
 * The linter scans formatted source line-by-line (one field per line, the way a
 * schema is actually written in an editor), so tests build sources the same way
 * via the `obj` helper rather than cramming a whole object onto one line.
 */
import { describe, it, expect } from 'vitest';
import { lintZod, type ZodLintDiagnostic } from '../zod-linter';
import { hintFormatFromFieldName } from '../field-format-hints';

/** Build a formatted z.object({...}) from one-field-per-line entries. */
const obj = (...fieldLines: string[]): string =>
  `z.object({\n${fieldLines.map(f => '  ' + f).join('\n')}\n})`;

const rules = (src: string): string[] => lintZod(src).map(d => d.rule);
const find = (src: string, rule: string): ZodLintDiagnostic | undefined =>
  lintZod(src).find(d => d.rule === rule);

describe('hintFormatFromFieldName', () => {
  it('maps high-confidence names', () => {
    expect(hintFormatFromFieldName('email')).toBe('email');
    expect(hintFormatFromFieldName('userEmail')).toBe('email');
    expect(hintFormatFromFieldName('avatarUrl')).toBe('url');
    expect(hintFormatFromFieldName('homepage_link')).toBe('url');
    expect(hintFormatFromFieldName('uuid')).toBe('uuid');
    expect(hintFormatFromFieldName('guid')).toBe('uuid');
    expect(hintFormatFromFieldName('createdAt')).toBe('datetime');
    expect(hintFormatFromFieldName('updated_at')).toBe('datetime');
    expect(hintFormatFromFieldName('timestamp')).toBe('datetime');
  });

  it('returns null for ambiguous / unrelated names', () => {
    expect(hintFormatFromFieldName('name')).toBeNull();
    expect(hintFormatFromFieldName('id')).toBeNull();       // not every id is a uuid
    expect(hintFormatFromFieldName('userId')).toBeNull();   // ditto
    expect(hintFormatFromFieldName('status')).toBeNull();
    expect(hintFormatFromFieldName('seat')).toBeNull();     // ends in "at" but not a timestamp
    expect(hintFormatFromFieldName('format')).toBeNull();
    expect(hintFormatFromFieldName('count')).toBeNull();
  });
});

describe('Zod linter — semantic format rules (the differentiator)', () => {
  it('flags email field typed as bare z.string()', () => {
    const d = find(obj('email: z.string(),'), 'semantic-email');
    expect(d).toBeTruthy();
    expect(d!.suggestion).toContain('z.string().email()');
  });

  it('flags url-ish names', () => {
    expect(rules(obj('avatarUrl: z.string(),'))).toContain('semantic-url');
    expect(rules(obj('website: z.string(),'))).not.toContain('semantic-url'); // "website" isn't in dict
    expect(rules(obj('profileLink: z.string(),'))).toContain('semantic-url');
  });

  it('flags exact uuid/guid names only', () => {
    expect(rules(obj('uuid: z.string(),'))).toContain('semantic-uuid');
    expect(rules(obj('guid: z.string(),'))).toContain('semantic-uuid');
  });

  it('flags timestamp names', () => {
    expect(rules(obj('createdAt: z.string(),'))).toContain('semantic-datetime');
    expect(rules(obj('created_at: z.string(),'))).toContain('semantic-datetime');
    const d = find(obj('updatedAt: z.string(),'), 'semantic-datetime');
    expect(d!.suggestion).toContain('z.string().datetime()');
  });

  it('preserves the rest of the chain in the suggestion', () => {
    const d = find(obj('email: z.string().min(3).optional(),'), 'semantic-email');
    expect(d!.suggestion).toBe('z.string().email().min(3).optional()');
  });

  it('reports the correct 1-based line number', () => {
    const src = 'z.object({\n  name: z.string(),\n  email: z.string(),\n})';
    const d = find(src, 'semantic-email');
    expect(d!.line).toBe(3);
  });
});

describe('Zod linter — generic rules (bonus)', () => {
  it('prefers .nullish() over .optional().nullable()', () => {
    const d = find(obj('bio: z.string().optional().nullable(),'), 'prefer-nullish');
    expect(d).toBeTruthy();
    expect(d!.suggestion).toContain('.nullish()');
    expect(d!.severity).toBe('info');
  });

  it('also catches .nullable().optional() (reverse order)', () => {
    expect(rules(obj('bio: z.string().nullable().optional(),'))).toContain('prefer-nullish');
  });

  it('warns on z.any() / z.unknown()', () => {
    expect(rules(obj('payload: z.any(),'))).toContain('no-any');
    expect(rules(obj('blob: z.unknown(),'))).toContain('no-any');
  });
});

describe('Zod linter — NO false positives (load-bearing)', () => {
  it('stays silent when the format is already declared', () => {
    expect(rules(obj('email: z.string().email(),'))).toEqual([]);
    expect(rules(obj('email: z.email(),'))).toEqual([]);
    expect(rules(obj('avatarUrl: z.string().url(),'))).toEqual([]);
    expect(rules(obj('uuid: z.string().uuid(),'))).toEqual([]);
    expect(rules(obj('createdAt: z.string().datetime(),'))).toEqual([]);
    expect(rules(obj('createdAt: z.iso.datetime(),'))).toEqual([]);
  });

  it('never suggests a string-format for non-string chains', () => {
    // The classic trap: a name matches the dictionary but the type isn't a string.
    expect(rules(obj('emailVerified: z.boolean(),'))).toEqual([]);
    expect(rules(obj('emailCount: z.number(),'))).toEqual([]);
    expect(rules(obj('imageWidth: z.number(),'))).toEqual([]);
    expect(rules(obj('createdAt: z.date(),'))).toEqual([]);
  });

  it('stays silent on a fully idiomatic schema', () => {
    const good = `z.object({
      id: z.string().uuid(),
      email: z.string().email(),
      website: z.string().url(),
      age: z.number().int().min(0),
      role: z.enum(["admin", "user"]),
      createdAt: z.string().datetime(),
      bio: z.string().nullish(),
    })`;
    expect(lintZod(good)).toEqual([]);
  });

  it('does not treat cuid/ulid ids as missing uuid', () => {
    expect(rules(obj('uuid: z.string().cuid(),'))).toEqual([]);
    expect(rules(obj('uuid: z.string().ulid(),'))).toEqual([]);
  });
});
