/**
 * Field-name → suggested string format.
 *
 * This mirrors the key-name inference dictionary used by the inference engine
 * (`inferValue` in engine.ts, the patterns around emailKeyPattern / urlKeyPattern
 * / uuidKeyPattern). Keep the two in sync: the engine GENERATES these formats
 * when inferring a schema from data; the Zod linter uses the same signals in
 * REVERSE to flag a hand-written schema whose field name strongly implies a
 * format it never declared.
 *
 * Only high-confidence, NAME-based signals live here. No value inspection — a
 * linter must avoid false positives above all, so we deliberately keep the
 * dictionary conservative (e.g. UUID is an exact-name match, not every `id`).
 */
export type FieldFormatHint = 'email' | 'url' | 'uuid' | 'datetime';

// Matches engine.ts emailKeyPattern.
const EMAIL_RE = /email|mail/i;
// Matches engine.ts urlKeyPattern (sans the value-dependent src exclusion, which
// the linter can't evaluate from a name alone).
const URL_RE = /url|uri|href|link|endpoint|avatar|thumbnail|image|photo/i;
// Intentionally strict: only a field literally named uuid/guid. Inferring `.uuid()`
// from every `id` / `userId` produces too many false positives (cuid, nanoid,
// numeric ids all exist), which would erode trust in the linter.
const UUID_RE = /^(uuid|guid)$/i;
// Common timestamp field names. Anchored prefixes for the camel/snake "...At"
// family avoid matching unrelated words ending in "at" (seat, format, chat).
const DATETIME_RE = /^(created|updated|deleted|published|modified|expired|expires|started|ended)_?[aA]t$|timestamp|datetime/i;

export function hintFormatFromFieldName(name: string): FieldFormatHint | null {
  if (EMAIL_RE.test(name)) return 'email';
  if (UUID_RE.test(name)) return 'uuid';
  if (URL_RE.test(name)) return 'url';
  if (DATETIME_RE.test(name)) return 'datetime';
  return null;
}

/** The Zod validator method a given hint recommends. */
export const HINT_METHOD: Record<FieldFormatHint, string> = {
  email: '.email()',
  url: '.url()',
  uuid: '.uuid()',
  datetime: '.datetime()',
};
