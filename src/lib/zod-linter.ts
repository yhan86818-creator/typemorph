/**
 * Zod schema linter — the semantic-first checker that no other Zod linter does.
 *
 * Existing tools (eslint-plugin-zod, etc.) check SYNTAX. They can't tell you that
 * a field named `email` typed as `z.string()` is probably missing `.email()`,
 * because they don't model field-name semantics. TypeMorph already has that
 * dictionary (it's how the inference engine turns JSON into rich Zod), so the
 * linter runs it in reverse over a hand-written schema.
 *
 * Approach: scan the raw source line-by-line rather than going through
 * parseZodToSchema. We want to report the exact line and preserve the author's
 * notation (so we can also flag v3→v4 style and suggest a literal fix string).
 *
 * Rules:
 *   semantic-email / -url / -uuid / -datetime  → name implies a format the chain
 *                                                doesn't declare (the differentiator)
 *   prefer-nullish                             → .optional().nullable() → .nullish()
 *   no-any                                     → z.any()/z.unknown() disables validation
 *
 * Conservatism: semantic rules only fire on a chain rooted at `z.string()`, so
 * `emailVerified: z.boolean()` or `imageCount: z.number()` never get flagged.
 */
import { hintFormatFromFieldName, HINT_METHOD, type FieldFormatHint } from './field-format-hints';

export type ZodLintSeverity = 'warning' | 'info';

export interface ZodLintDiagnostic {
  /** 1-based line number in the source. */
  line: number;
  /** The offending field name. */
  field: string;
  /** Stable rule id, e.g. 'semantic-email'. */
  rule: string;
  severity: ZodLintSeverity;
  /** Human-readable explanation. */
  message: string;
  /** A concrete replacement for the field's type chain. */
  suggestion: string;
}

/** A chain rooted at a plain z.string() — the only place a string-format hint applies. */
function isPlainStringChain(chain: string): boolean {
  return /^z\.string\b/.test(chain.trim());
}

/** Whether the chain already declares the validator the hint would recommend. */
function chainDeclaresFormat(chain: string, hint: FieldFormatHint): boolean {
  switch (hint) {
    case 'email':
      return /\.email\s*\(|z\.email\s*\(/.test(chain);
    case 'url':
      return /\.url\s*\(|z\.url\s*\(/.test(chain);
    case 'uuid':
      return /\.uuid\s*\(|z\.uuid\s*\(|\.cuid2?\s*\(|z\.cuid2?\s*\(|\.ulid\s*\(|z\.ulid\s*\(/.test(chain);
    case 'datetime':
      return /\.datetime\s*\(|z\.iso\.datetime\s*\(/.test(chain);
  }
}

/** Insert the recommended validator right after `z.string()`. */
function withFormat(chain: string, hint: FieldFormatHint): string {
  return chain.replace(/z\.string\s*\(\s*\)/, `z.string()${HINT_METHOD[hint]}`);
}

// Matches `fieldName: z.<chain>` (optionally quoted key, optional trailing comma).
// Captures the field name and the type chain.
const FIELD_RE = /^\s*['"`]?([A-Za-z_$][\w$]*)['"`]?\s*:\s*(z\..+?)[,;]?\s*$/;

export function lintZod(source: string): ZodLintDiagnostic[] {
  const diagnostics: ZodLintDiagnostic[] = [];
  const lines = source.split('\n');

  lines.forEach((raw, idx) => {
    const m = raw.match(FIELD_RE);
    if (!m) return;
    const field = m[1];
    const chain = m[2];
    const line = idx + 1;

    // --- Semantic format rules (the differentiator) ---
    const hint = hintFormatFromFieldName(field);
    if (hint && isPlainStringChain(chain) && !chainDeclaresFormat(chain, hint)) {
      diagnostics.push({
        line,
        field,
        rule: `semantic-${hint}`,
        severity: 'warning',
        message: `'${field}' looks like a ${hint}, but the schema is a bare z.string() with no ${HINT_METHOD[hint]} validator.`,
        suggestion: withFormat(chain, hint),
      });
    }

    // --- Generic rules (parity with common linters; included as a bonus) ---
    if (/\.optional\s*\(\s*\)/.test(chain) && /\.nullable\s*\(\s*\)/.test(chain)) {
      const simplified = chain
        .replace(/\.optional\s*\(\s*\)\s*\.nullable\s*\(\s*\)/, '.nullish()')
        .replace(/\.nullable\s*\(\s*\)\s*\.optional\s*\(\s*\)/, '.nullish()');
      diagnostics.push({
        line,
        field,
        rule: 'prefer-nullish',
        severity: 'info',
        message: `'${field}' uses .optional().nullable(); .nullish() is the idiomatic shorthand.`,
        suggestion: simplified,
      });
    }

    if (/z\.(any|unknown)\s*\(\s*\)/.test(chain)) {
      diagnostics.push({
        line,
        field,
        rule: 'no-any',
        severity: 'warning',
        message: `'${field}' is z.any()/z.unknown(), which skips validation entirely. Give it a concrete shape.`,
        suggestion: chain,
      });
    }
  });

  return diagnostics;
}
