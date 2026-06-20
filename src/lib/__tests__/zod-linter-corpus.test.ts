/**
 * Real-world corpus for the Zod linter — the "flood it with actual schemas" pass.
 *
 * Unit tests prove the rules in isolation; this proves the linter behaves on
 * schemas shaped like ones developers actually write (Drizzle-inferred, Prisma
 * DTOs, Stripe webhooks, form schemas, config). A linter lives or dies on its
 * false-positive rate at scale, so every CLEAN schema below asserts ZERO
 * diagnostics, and every DIRTY one asserts the specific issue is caught.
 *
 * Run with `console.log` visible via: npx vitest run zod-linter-corpus --reporter=verbose
 */
import { describe, it, expect } from 'vitest';
import { lintZod } from '../zod-linter';

// ── CLEAN schemas: idiomatic, fully-declared. Must produce ZERO diagnostics. ──
const CLEAN: Record<string, string> = {
  'drizzle-inferred user': `z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  avatarUrl: z.string().url().nullable(),
  emailVerified: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})`,

  'numeric-and-count fields (the classic trap)': `z.object({
  emailCount: z.number().int(),
  imageWidth: z.number(),
  imageHeight: z.number(),
  urlVisits: z.number(),
  uuidVersion: z.number(),
  linkClicks: z.number(),
})`,

  'boolean flags named like string formats': `z.object({
  emailVerified: z.boolean(),
  hasAvatar: z.boolean(),
  urlShortened: z.boolean(),
  isUuid: z.boolean(),
})`,

  'date objects not strings': `z.object({
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().nullable(),
})`,

  'non-uuid ids (cuid/nanoid/int)': `z.object({
  id: z.string(),
  userId: z.string(),
  orderId: z.string(),
  sessionId: z.string().cuid(),
  externalId: z.number(),
})`,

  'zod v4 shorthand formats': `z.object({
  email: z.email(),
  homepage: z.url(),
  createdAt: z.iso.datetime(),
})`,

  'enum / literal / union heavy config': `z.object({
  theme: z.enum(["light", "dark"]),
  logLevel: z.union([z.literal("debug"), z.literal("info")]),
  retries: z.number().int().min(0).max(5),
  featureFlags: z.record(z.string(), z.boolean()),
})`,
};

// ── DIRTY schemas: each has a known issue the linter MUST catch. ──
// Written multi-line (one field per line) — the way Zod schemas live in source,
// which is what the line-based linter scans.
const DIRTY: { name: string; src: string; expectRule: string }[] = [
  {
    name: 'API DTO with bare email',
    src: `z.object({\n  userEmail: z.string(),\n  name: z.string(),\n})`,
    expectRule: 'semantic-email',
  },
  {
    name: 'profile with bare avatar url',
    src: `z.object({\n  avatarUrl: z.string(),\n  bio: z.string(),\n})`,
    expectRule: 'semantic-url',
  },
  {
    name: 'timestamps left as plain strings',
    src: `z.object({\n  createdAt: z.string(),\n  title: z.string(),\n})`,
    expectRule: 'semantic-datetime',
  },
  {
    name: 'verbose optional+nullable',
    src: `z.object({\n  note: z.string().optional().nullable(),\n})`,
    expectRule: 'prefer-nullish',
  },
  {
    name: 'z.any() escape hatch',
    src: `z.object({\n  payload: z.any(),\n})`,
    expectRule: 'no-any',
  },
];

describe('Zod linter — real-world corpus (false-positive gate)', () => {
  it('produces ZERO diagnostics on every clean, idiomatic schema', () => {
    const offenders: string[] = [];
    for (const [name, src] of Object.entries(CLEAN)) {
      const diags = lintZod(src);
      if (diags.length > 0) {
        offenders.push(`  "${name}" → ${diags.map(d => `${d.field}:${d.rule}`).join(', ')}`);
      }
    }
    if (offenders.length > 0) {
      console.error('FALSE POSITIVES:\n' + offenders.join('\n'));
    }
    expect(offenders, `Linter false-positived on clean schemas:\n${offenders.join('\n')}`).toEqual([]);
  });

  it('catches the known issue in every dirty schema', () => {
    const misses: string[] = [];
    for (const { name, src, expectRule } of DIRTY) {
      const rules = lintZod(src).map(d => d.rule);
      if (!rules.includes(expectRule)) {
        misses.push(`  "${name}" → expected ${expectRule}, got [${rules.join(', ') || 'none'}]`);
      }
    }
    expect(misses, `Linter missed real issues:\n${misses.join('\n')}`).toEqual([]);
  });

  it('reports corpus precision/recall numbers', () => {
    const cleanCount = Object.keys(CLEAN).length;
    const falsePositives = Object.values(CLEAN).filter(s => lintZod(s).length > 0).length;
    const dirtyCount = DIRTY.length;
    const caught = DIRTY.filter(d => lintZod(d.src).map(x => x.rule).includes(d.expectRule)).length;
    console.log(
      `\n  Corpus: ${cleanCount} clean schemas, ${dirtyCount} dirty schemas` +
      `\n  False positives: ${falsePositives}/${cleanCount}` +
      `\n  Real issues caught: ${caught}/${dirtyCount}\n`,
    );
    expect(falsePositives).toBe(0);
    expect(caught).toBe(dirtyCount);
  });
});
