/**
 * Wiring contract for the /zod-lint landing page.
 *
 * The page lands on the Lint tab only if a chain of runtime facts holds — and
 * that chain has bitten us before (the engine's behavior diverging from what
 * the UI assumed). This test locks the chain against the EXACT shipped preset
 * string so a future edit to the preset (or the linter) that would silently
 * break the landing experience fails here instead of in production.
 *
 * The landing contract (mirrors Workbench.processInput):
 *   1. The preset is detected as Zod input  → reverse mode turns on
 *   2. parseZodToSchema(preset) succeeds     → the Lint tab is allowed to exist
 *   3. lintZod(preset) has issues            → auto-open picks 'lint', not 'mock'
 *   4. resolveSlugTarget('zod-lint') is non-null → the converter page renders
 */
import { describe, it, expect } from 'vitest';
import { ZOD_LINT_PRESET } from '../zod-lint-preset';
import { parseZodToSchema } from '../engine';
import { lintZod } from '../zod-linter';
import { resolveSlugTarget } from '../targets';

describe('/zod-lint landing contract', () => {
  const trimmed = ZOD_LINT_PRESET.trim();

  it('1. the preset is recognized as Zod input (triggers reverse mode)', () => {
    // Same heuristic Workbench uses to decide isZodInput.
    const isZodInput =
      trimmed.includes('z.object(') ||
      trimmed.includes('z.array(') ||
      /(?:const|let|var|export)\s+\w+\s*=\s*z\./.test(trimmed);
    expect(isZodInput).toBe(true);
  });

  it('2. parseZodToSchema accepts the preset (reverse mode actually engages)', () => {
    const schema = parseZodToSchema(trimmed);
    expect(schema).toBeTruthy();
  });

  it('3. the preset has lint issues, so auto-open selects the Lint tab', () => {
    // If this were 0, Workbench would fall back to the 'mock' tab and the
    // linter — the whole point of the page — would be hidden on arrival.
    const diagnostics = lintZod(ZOD_LINT_PRESET);
    expect(diagnostics.length).toBeGreaterThan(0);
  });

  it('3b. the preset demonstrates every rule category (it is a showcase)', () => {
    const rules = new Set(lintZod(ZOD_LINT_PRESET).map(d => d.rule));
    expect(rules).toContain('semantic-email');     // email: z.string()
    expect(rules).toContain('semantic-url');       // avatar_url: z.string()
    expect(rules).toContain('semantic-datetime');  // createdAt: z.string()
    expect(rules).toContain('prefer-nullish');     // bio: .optional().nullable()
    expect(rules).toContain('no-any');             // metadata: z.any()
  });

  it('3c. the preset does NOT flag fields that already declare their format', () => {
    // id/website/updatedAt are correct — a noisy preset would undersell the linter.
    const flaggedFields = new Set(lintZod(ZOD_LINT_PRESET).map(d => d.field));
    expect(flaggedFields.has('id')).toBe(false);         // z.string().uuid()
    expect(flaggedFields.has('website')).toBe(false);    // z.string().url()
    expect(flaggedFields.has('updatedAt')).toBe(false);  // z.string().datetime()
  });

  it('4. the zod-lint slug resolves a target so /converters/zod-lint renders', () => {
    expect(resolveSlugTarget('zod-lint')).not.toBeNull();
  });
});
