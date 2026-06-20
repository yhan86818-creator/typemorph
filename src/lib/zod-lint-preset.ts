/**
 * Default schema loaded on the /zod-lint landing page.
 *
 * It is deliberately seeded with the exact issues the linter detects so the
 * Lint tab lights up the moment the page opens — the value of the differentiator
 * is visible before the user types anything. The wiring that depends on this
 * (Zod detection → reverse mode → auto-open Lint) is locked by
 * src/lib/__tests__/zod-lint-preset.test.ts, so keep this string in sync with
 * what the linter actually flags.
 */
export const ZOD_LINT_PRESET = `// Paste your Zod schema below — the linter checks it instantly.
// This sample shows the rules in action:
const userSchema = z.object({
  id:          z.string().uuid(),
  email:       z.string(),
  avatar_url:  z.string(),
  website:     z.string().url(),
  createdAt:   z.string(),
  updatedAt:   z.string().datetime(),
  bio:         z.string().optional().nullable(),
  metadata:    z.any(),
});`;
