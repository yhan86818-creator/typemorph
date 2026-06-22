/**
 * LLM Output Validator — structural validation of real JSON outputs against an
 * expected Schema.
 *
 * Reuses the existing engine pieces (the `Schema` model, `inferSchema` for the
 * `--infer` bootstrap, `parseZodToSchema` for reading a Zod source). The per-record
 * walker below is purpose-built for *validation* semantics, which differ from the
 * breaking-change `compareSchemaTypes`:
 *   - a record missing an OPTIONAL expected field is fine (no issue)
 *   - an extra field the model added is a WARNING, not a breaking error
 *   - format / enum drift is a WARNING (heuristic — never hard-fail), matching the
 *     project's "誤検知ゼロ / open-vocab" philosophy
 * Only missing-required, wrong-type, and null-violations are errors.
 *
 * This stays 100% local: it never leaves the caller's process. Web and CLI both
 * call `validateOutputs`.
 */

import { inferSchema } from './engine';
import type { Schema } from './types';

export type IssueSeverity = 'error' | 'warning';
export type IssueCode = 'missing' | 'type' | 'null' | 'enum' | 'format' | 'extra';

export interface OutputIssue {
  /** Index of the record this issue belongs to (0-based). */
  recordIndex: number;
  /** Dotted path to the offending field, e.g. "sources", "user.email", "items[2].id". */
  path: string;
  code: IssueCode;
  severity: IssueSeverity;
  message: string;
  /** Optional one-line suggested fix (e.g. "z.coerce.number()"). */
  fix?: string;
}

export interface ValidationReport {
  total: number;
  passed: number;
  failed: number;
  issues: OutputIssue[];
  /** Issues aggregated by code, most frequent first — the "what broke and how often" line. */
  summary: { code: IssueCode; label: string; count: number }[];
  /** Overall pass: no record failed. */
  ok: boolean;
}

export interface ValidateOptions {
  /** Treat warnings as failures too (mirrors a strict/.strict() parser). Default false. */
  strict?: boolean;
  /**
   * How to treat fields present in the output but absent from the schema.
   * Default 'warn'. Set 'error' to mirror `z.object().strict()`, 'ignore' to skip.
   */
  extraFields?: 'warn' | 'error' | 'ignore';
}

// ── value helpers ──────────────────────────────────────────────────────────────
function jsType(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function preview(v: unknown): string {
  let s: string;
  try { s = typeof v === 'string' ? `"${v}"` : JSON.stringify(v); } catch { s = String(v); }
  if (s == null) s = String(v);
  return s.length > 40 ? s.slice(0, 37) + '…' : s;
}

function looksNumeric(s: string): boolean {
  return s.trim() !== '' && !Number.isNaN(Number(s));
}

// Light, warning-only format checks. Heuristic by design — never hard-fail.
const FORMAT_CHECK: Record<string, (s: string) => boolean> = {
  uuid: s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
  email: s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  url: s => /^https?:\/\/\S+$/i.test(s),
  datetime: s => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s),
  date: s => /^\d{4}-\d{2}-\d{2}$/.test(s),
  ip: s => /^(\d{1,3}\.){3}\d{1,3}$|:/.test(s),
};

// ── per-record walker ────────────────────────────────────────────────────────
function walk(
  expected: Schema,
  value: unknown,
  path: string,
  recordIndex: number,
  out: OutputIssue[],
  opts: Required<ValidateOptions>,
): void {
  // `any` / `union` are pass-through: no reliable single-type expectation, so
  // flagging would only produce false positives.
  if (expected.type === 'any' || expected.type === 'union') return;

  if (value === null) {
    if (!expected.nullable) {
      out.push({
        recordIndex, path, code: 'null', severity: 'error',
        message: `${q(path)} was null (expected ${expected.type})`,
      });
    }
    return;
  }
  if (value === undefined) {
    // handled by the caller's presence check; nothing to validate here
    return;
  }

  switch (expected.type) {
    case 'object': {
      if (jsType(value) !== 'object') {
        out.push({
          recordIndex, path, code: 'type', severity: 'error',
          message: `${q(path)}: expected object, got ${jsType(value)} (${preview(value)})`,
        });
        return;
      }
      const obj = value as Record<string, unknown>;
      const fields = expected.fields ?? {};

      for (const key of Object.keys(fields)) {
        const fieldSchema = fields[key];
        const childPath = path ? `${path}.${key}` : key;
        if (!(key in obj) || obj[key] === undefined) {
          if (!fieldSchema.optional) {
            out.push({
              recordIndex, path: childPath, code: 'missing', severity: 'error',
              message: `missing required field ${q(childPath)} (expected ${describe(fieldSchema)})`,
            });
          }
          continue;
        }
        walk(fieldSchema, obj[key], childPath, recordIndex, out, opts);
      }

      if (opts.extraFields !== 'ignore') {
        for (const key of Object.keys(obj)) {
          if (key in fields) continue;
          const childPath = path ? `${path}.${key}` : key;
          out.push({
            recordIndex, path: childPath, code: 'extra',
            severity: opts.extraFields === 'error' ? 'error' : 'warning',
            message: `unexpected field ${q(childPath)} appeared (not in schema)`,
          });
        }
      }
      return;
    }

    case 'array': {
      if (!Array.isArray(value)) {
        out.push({
          recordIndex, path, code: 'type', severity: 'error',
          message: `${q(path)}: expected array, got ${jsType(value)} (${preview(value)})`,
        });
        return;
      }
      // Positional tuple, if the schema captured one.
      if (expected.tupleTypes && expected.tupleTypes.length > 0) {
        expected.tupleTypes.forEach((t, i) => {
          if (i < value.length) walk(t, value[i], `${path}[${i}]`, recordIndex, out, opts);
        });
        return;
      }
      if (expected.itemType) {
        value.forEach((el, i) => walk(expected.itemType!, el, `${path}[${i}]`, recordIndex, out, opts));
      }
      return;
    }

    case 'string': {
      if (typeof value !== 'string') {
        out.push({
          recordIndex, path, code: 'type', severity: 'error',
          message: `${q(path)}: expected string, got ${jsType(value)} (${preview(value)})`,
        });
        return;
      }
      // enum drift — warning only (open-vocab lesson: never hard-fail unknown values)
      if (expected.enumValues && expected.enumValues.length > 0 && !expected.enumValues.includes(value)) {
        out.push({
          recordIndex, path, code: 'enum', severity: 'warning',
          message: `${q(path)}: unexpected value ${preview(value)} (expected ${expected.enumValues.join(' | ')})`,
        });
      }
      // format drift — warning only
      if (expected.format && FORMAT_CHECK[expected.format] && !FORMAT_CHECK[expected.format](value)) {
        out.push({
          recordIndex, path, code: 'format', severity: 'warning',
          message: `${q(path)}: not a valid ${expected.format} (${preview(value)})`,
        });
      }
      return;
    }

    case 'number': {
      if (typeof value !== 'number') {
        const numericString = typeof value === 'string' && looksNumeric(value);
        out.push({
          recordIndex, path, code: 'type', severity: 'error',
          message: `${q(path)}: expected number, got ${jsType(value)} (${preview(value)})`,
          fix: numericString ? 'model returned a quoted number → use z.coerce.number()' : undefined,
        });
      }
      return;
    }

    case 'boolean': {
      if (typeof value !== 'boolean') {
        const coercible = value === 'true' || value === 'false' || value === 0 || value === 1;
        out.push({
          recordIndex, path, code: 'type', severity: 'error',
          message: `${q(path)}: expected boolean, got ${jsType(value)} (${preview(value)})`,
          fix: coercible ? 'use z.coerce.boolean() or normalize the value' : undefined,
        });
      }
      return;
    }
  }
}

function q(path: string): string {
  return path ? `"${path}"` : 'root';
}

/** Short human description of an expected field's type for "missing" messages. */
function describe(s: Schema): string {
  if (s.type === 'array') {
    const item = s.itemType ? describe(s.itemType) : 'any';
    return `${item}[]`;
  }
  if (s.enumValues && s.enumValues.length > 0) return s.enumValues.map(v => `"${v}"`).join(' | ');
  if (s.format) return `${s.type} (${s.format})`;
  return s.type;
}

const CODE_LABELS: Record<IssueCode, string> = {
  missing: 'missing field',
  type: 'wrong type',
  null: 'null violation',
  enum: 'unexpected enum value',
  format: 'format drift',
  extra: 'extra field',
};

// ── public API ──────────────────────────────────────────────────────────────
/**
 * Validate a batch of JSON output records against an expected Schema.
 * Each record is checked independently so the report can say "2 of 10 failed".
 */
export function validateOutputs(
  expected: Schema,
  records: unknown[],
  options: ValidateOptions = {},
): ValidationReport {
  const opts: Required<ValidateOptions> = {
    strict: options.strict ?? false,
    extraFields: options.extraFields ?? 'warn',
  };

  const issues: OutputIssue[] = [];
  let failed = 0;

  records.forEach((record, i) => {
    const before = issues.length;
    walk(expected, record, '', i, issues, opts);
    const recordIssues = issues.slice(before);
    const fails = opts.strict
      ? recordIssues.length > 0
      : recordIssues.some(it => it.severity === 'error');
    if (fails) failed++;
  });

  // aggregate by code
  const counts = new Map<IssueCode, number>();
  for (const it of issues) counts.set(it.code, (counts.get(it.code) ?? 0) + 1);
  const summary = [...counts.entries()]
    .map(([code, count]) => ({ code, label: CODE_LABELS[code], count }))
    .sort((a, b) => b.count - a.count);

  return {
    total: records.length,
    passed: records.length - failed,
    failed,
    issues,
    summary,
    ok: failed === 0,
  };
}

/**
 * Bootstrap an expected Schema from a batch of *known-good* outputs (the `--infer`
 * path). Returns the per-record (object) schema, not the array wrapper, so it can be
 * fed straight into `validateOutputs`. Falls back to the raw inference for non-arrays.
 */
export function inferExpectedSchema(records: unknown[]): Schema {
  const inferred = inferSchema(records);
  if (inferred.type === 'array' && inferred.itemType) return inferred.itemType;
  return inferred;
}
