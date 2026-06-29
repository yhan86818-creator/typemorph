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
import type { Schema, ArithIdentity, ArithTermRef } from './types';

export type IssueSeverity = 'error' | 'warning';
export type IssueCode = 'missing' | 'type' | 'null' | 'enum' | 'format' | 'extra' | 'range' | 'arith';

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

// Calendar validity: shape must be YYYY-MM-DD *and* a real day (no 2026-13-45,
// no Feb 30). Guards against month/day rollover that a regex alone misses.
function isCalendarDate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12) return false;
  const lastDay = new Date(y, mo, 0).getDate(); // day 0 of next month = last of this
  return d >= 1 && d <= lastDay;
}

// Active ISO-4217 alphabetic currency codes (+ common funds/metals). Used as a
// dictionary so any real currency passes while typos/symbols ("US$") get flagged.
const ISO_4217 = new Set<string>(
  ('AED AFN ALL AMD ANG AOA ARS AUD AWG AZN BAM BBD BDT BGN BHD BIF BMD BND BOB BRL BSD BTN BWP ' +
   'BYN BZD CAD CDF CHF CLP CNY COP CRC CUP CVE CZK DJF DKK DOP DZD EGP ERN ETB EUR FJD FKP GBP ' +
   'GEL GHS GIP GMD GNF GTQ GYD HKD HNL HTG HUF IDR ILS INR IQD IRR ISK JMD JOD JPY KES KGS KHR ' +
   'KMF KPW KRW KWD KYD KZT LAK LBP LKR LRD LSL LYD MAD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK ' +
   'MXN MYR MZN NAD NGN NIO NOK NPR NZD OMR PAB PEN PGK PHP PKR PLN PYG QAR RON RSD RUB RWF SAR ' +
   'SBD SCR SDG SEK SGD SHP SLE SOS SRD SSP STN SVC SYP SZL THB TJS TMT TND TOP TRY TTD TWD TZS ' +
   'UAH UGX USD UYU UZS VED VES VND VUV WST XAF XCD XOF XPF YER ZAR ZMW ZWL').split(' '),
);

// Light, warning-only format checks. Heuristic by design — never hard-fail.
const FORMAT_CHECK: Record<string, (s: string) => boolean> = {
  uuid: s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s),
  email: s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s),
  url: s => /^https?:\/\/\S+$/i.test(s),
  datetime: s => /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(s) && isCalendarDate(s.slice(0, 10)),
  date: s => isCalendarDate(s),
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

      // Arithmetic consistency — warning only. Each identity was auto-derived from
      // the good samples and held across all of them; a violation here means the
      // numbers in THIS record don't add up (off-by-unit / decimal shift / typo'd
      // total). Any missing/non-numeric operand → skip silently (never a FP).
      if (expected.arithIdentities) {
        for (const id of expected.arithIdentities) checkIdentity(id, obj, path, recordIndex, out);
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
      // currency-code drift — warning only (dictionary check)
      if (expected.isCurrencyCode && !ISO_4217.has(value)) {
        out.push({
          recordIndex, path, code: 'enum', severity: 'warning',
          message: `${q(path)}: ${preview(value)} is not a valid ISO-4217 currency code`,
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
        return;
      }
      // Conservative numeric outlier — warning only, never hard-fail. The only
      // signal we trust is an extreme >100× jump above the largest sampled value
      // (a classic off-by-unit / decimal-shift bug). Deliberately NOT min/max- or
      // sign-bounded: a sign flip looks like an error but is usually a legitimate
      // credit note / refund / adjustment (measured: 0 real catches, FP on every
      // negative invoice), and min/max over-fits small samples (the enum lesson).
      const st = expected.numericStats;
      if (st && st.max > 0 && value > st.max * 100) {
        out.push({
          recordIndex, path, code: 'range', severity: 'warning',
          message: `${q(path)}: ${value} is >100× the largest sampled value (${st.max}) — likely an off-by-unit error`,
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

// Rounding slack so legitimate cent-rounding never trips an identity: the larger
// of 2 cents and 0.5% of the expected magnitude. A fixed epsilon, not a fitted
// parameter — there is no per-dataset threshold to over-fit.
function arithTolerance(expected: number): number {
  return Math.max(0.02, Math.abs(expected) * 0.005);
}

/** Resolve one identity term to a number, or null if any operand is missing/non-numeric. */
function evalTerm(obj: Record<string, unknown>, ref: ArithTermRef): number | null {
  if (ref.kind === 'field') {
    const v = obj[ref.key];
    return typeof v === 'number' && Number.isFinite(v) ? v : null;
  }
  // colsum: Σ obj[key][i][itemKey]
  const arr = obj[ref.key];
  if (!Array.isArray(arr)) return null;
  let sum = 0;
  for (const el of arr) {
    if (el === null || typeof el !== 'object') return null;
    const v = (el as Record<string, unknown>)[ref.itemKey!];
    if (typeof v !== 'number' || !Number.isFinite(v)) return null;
    sum += v;
  }
  return sum;
}

function describeTerm(ref: ArithTermRef): string {
  return ref.kind === 'field' ? ref.key : `Σ ${ref.key}[].${ref.itemKey}`;
}

function checkIdentity(
  id: ArithIdentity, obj: Record<string, unknown>, path: string, recordIndex: number, out: OutputIssue[],
): void {
  const targetVal = obj[id.target];
  if (typeof targetVal !== 'number' || !Number.isFinite(targetVal)) return; // can't check → no FP
  const childPath = path ? `${path}.${id.target}` : id.target;

  if (id.kind === 'sum') {
    let sum = 0; const vals: number[] = [];
    for (const ref of id.addends!) {
      const v = evalTerm(obj, ref);
      if (v === null) return; // missing operand → skip
      sum += v; vals.push(v);
    }
    if (Math.abs(targetVal - sum) > arithTolerance(targetVal)) {
      const formula = id.addends!.map(describeTerm).join(' + ');
      // Show the numeric breakdown only when there are ≥2 addends (otherwise it
      // just restates the single value).
      const detail = id.addends!.length > 1 ? ` (${vals.map(round).join(' + ')} = ${round(sum)})` : ` (= ${round(sum)})`;
      out.push({
        recordIndex, path: childPath, code: 'arith', severity: 'warning',
        message: `${q(childPath)}: ${targetVal} ≠ ${formula}${detail} — off by ${round(targetVal - sum)}`,
      });
    }
    return;
  }

  // product
  let prod = 1; const parts: string[] = [];
  for (const key of id.factors!) {
    const v = obj[key];
    if (typeof v !== 'number' || !Number.isFinite(v)) return;
    prod *= v; parts.push(`${key}=${v}`);
  }
  if (Math.abs(targetVal - prod) > arithTolerance(targetVal)) {
    out.push({
      recordIndex, path: childPath, code: 'arith', severity: 'warning',
      message: `${q(childPath)}: ${targetVal} ≠ ${id.factors!.join(' × ')} (${parts.join(' × ')} = ${round(prod)})`,
    });
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
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
  range: 'numeric range/sign outlier',
  arith: 'arithmetic inconsistency',
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
  const itemSchema = inferred.type === 'array' && inferred.itemType ? inferred.itemType : inferred;
  // Post-pass: attach observed numeric stats onto the (shared) number nodes so
  // validateOutputs can do sign/outlier checks. Core inference stays untouched.
  attachNumericStats(itemSchema, records);
  // Post-pass: derive arithmetic identities (total ≈ subtotal + tax, amount ≈
  // qty × unit_price) that hold across every sample. Core inference stays untouched.
  attachArithIdentities(itemSchema, records);
  return itemSchema;
}

// ── arithmetic-identity discovery ────────────────────────────────────────────
// For every object schema node, collect the concrete object values that landed
// there across the bootstrap corpus, then derive sum/product identities among
// their numeric fields that hold on EVERY sample (within rounding tolerance).
// Deterministic and self-disabling: if no clean identity holds (hidden fees,
// locale rounding, missing operands), nothing is attached → no check → no FP.
function attachArithIdentities(itemSchema: Schema, records: unknown[]): void {
  const samples = new Map<Schema, Record<string, unknown>[]>();
  const collect = (schema: Schema, value: unknown): void => {
    if (value === null || value === undefined) return;
    if (schema.type === 'object') {
      if (typeof value !== 'object' || Array.isArray(value)) return;
      const obj = value as Record<string, unknown>;
      const arr = samples.get(schema); if (arr) arr.push(obj); else samples.set(schema, [obj]);
      const fields = schema.fields ?? {};
      for (const k of Object.keys(fields)) collect(fields[k], obj[k]);
    } else if (schema.type === 'array' && schema.itemType && Array.isArray(value)) {
      for (const el of value) collect(schema.itemType, el);
    }
  };
  for (const rec of records) collect(itemSchema, rec);

  for (const [node, objs] of samples) {
    if (objs.length < 3) continue; // too few to trust
    const ids = deriveIdentities(node, objs);
    if (ids.length > 0) node.arithIdentities = ids;
  }
}

const MAX_TERMS = 8; // combinatorial guard on subset search (2^8)

function deriveIdentities(node: Schema, objs: Record<string, unknown>[]): ArithIdentity[] {
  const fields = node.fields ?? {};
  const numericKeys = Object.keys(fields).filter(k => fields[k].type === 'number');
  if (numericKeys.length === 0) return [];

  // Candidate addend terms: each direct numeric field, plus the column-sum of each
  // numeric field inside an array-of-objects child.
  const terms: ArithTermRef[] = numericKeys.map(key => ({ kind: 'field' as const, key }));
  for (const key of Object.keys(fields)) {
    const f = fields[key];
    if (f.type !== 'array' || !f.itemType || f.itemType.type !== 'object') continue;
    const itemFields = f.itemType.fields ?? {};
    for (const ik of Object.keys(itemFields)) {
      if (itemFields[ik].type === 'number') terms.push({ kind: 'colsum', key, itemKey: ik });
    }
  }
  if (terms.length > MAX_TERMS) return [];

  const ids: ArithIdentity[] = [];
  for (const target of numericKeys) {
    const sum = findSumIdentity(target, terms, objs);
    if (sum) { ids.push(sum); continue; }
    const product = findProductIdentity(target, numericKeys, objs);
    if (product) ids.push(product);
  }
  return ids;
}

// Smallest subset of `terms` (excluding the target's own field) whose sum equals
// `target` on every sample. Non-triviality: a pure-field sum needs ≥2 addends, or
// must include a colsum — this rejects coincidental single-field aliasing.
function findSumIdentity(
  target: string, terms: ArithTermRef[], objs: Record<string, unknown>[],
): ArithIdentity | null {
  const pool = terms.filter(t => !(t.kind === 'field' && t.key === target));
  const n = pool.length;
  if (n === 0) return null;
  // Enumerate subsets by increasing size so the simplest identity wins.
  const subsets: number[][] = [];
  for (let mask = 1; mask < (1 << n); mask++) {
    const idx: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) idx.push(i);
    subsets.push(idx);
  }
  subsets.sort((a, b) => a.length - b.length);

  for (const idx of subsets) {
    const subset = idx.map(i => pool[i]);
    const hasColsum = subset.some(t => t.kind === 'colsum');
    if (subset.length < 2 && !hasColsum) continue; // non-triviality guard
    if (holdsSum(target, subset, objs)) return { kind: 'sum', target, addends: subset };
  }
  return null;
}

function holdsSum(target: string, subset: ArithTermRef[], objs: Record<string, unknown>[]): boolean {
  let sawVariation = false;
  let prev: number | undefined;
  for (const obj of objs) {
    const tv = obj[target];
    if (typeof tv !== 'number' || !Number.isFinite(tv)) return false;
    let s = 0;
    for (const ref of subset) {
      const v = evalTerm(obj, ref);
      if (v === null) return false;
      s += v;
    }
    if (Math.abs(tv - s) > arithTolerance(tv)) return false;
    if (prev !== undefined && tv !== prev) sawVariation = true;
    prev = tv;
  }
  return sawVariation; // reject all-constant (e.g. every total 0) — vacuous identity
}

// target ≈ a × b for two distinct direct numeric fields, on every sample.
function findProductIdentity(
  target: string, numericKeys: string[], objs: Record<string, unknown>[],
): ArithIdentity | null {
  const others = numericKeys.filter(k => k !== target);
  for (let i = 0; i < others.length; i++) {
    for (let j = i + 1; j < others.length; j++) {
      const a = others[i], b = others[j];
      if (holdsProduct(target, a, b, objs)) return { kind: 'product', target, factors: [a, b] };
    }
  }
  return null;
}

function holdsProduct(target: string, a: string, b: string, objs: Record<string, unknown>[]): boolean {
  let sawNonUnit = false; // require at least one sample where neither factor is 1 (avoid amount≡price aliasing)
  let prev: number | undefined;
  let sawVariation = false;
  for (const obj of objs) {
    const tv = obj[target], av = obj[a], bv = obj[b];
    if ([tv, av, bv].some(v => typeof v !== 'number' || !Number.isFinite(v as number))) return false;
    const t = tv as number, x = av as number, y = bv as number;
    if (Math.abs(t - x * y) > arithTolerance(t)) return false;
    if (x !== 1 && y !== 1) sawNonUnit = true;
    if (prev !== undefined && t !== prev) sawVariation = true;
    prev = t;
  }
  return sawNonUnit && sawVariation;
}

/** Collect observed numbers per schema node, then record sign/max on each node. */
function attachNumericStats(itemSchema: Schema, records: unknown[]): void {
  const buckets = new Map<Schema, number[]>();
  const strBuckets = new Map<Schema, string[]>();
  const gather = (schema: Schema, value: unknown): void => {
    if (value === null || value === undefined) return;
    switch (schema.type) {
      case 'number':
        if (typeof value === 'number' && Number.isFinite(value)) {
          const arr = buckets.get(schema); if (arr) arr.push(value); else buckets.set(schema, [value]);
        }
        return;
      case 'string':
        if (typeof value === 'string') {
          const arr = strBuckets.get(schema); if (arr) arr.push(value); else strBuckets.set(schema, [value]);
        }
        return;
      case 'object': {
        if (typeof value !== 'object' || Array.isArray(value)) return;
        const fields = schema.fields ?? {};
        for (const k of Object.keys(fields)) gather(fields[k], (value as Record<string, unknown>)[k]);
        return;
      }
      case 'array':
        if (Array.isArray(value) && schema.itemType) for (const el of value) gather(schema.itemType, el);
        return;
    }
  };
  for (const rec of records) gather(itemSchema, rec);
  for (const [node, nums] of buckets) {
    if (nums.length === 0) continue;
    node.numericStats = { max: Math.max(...nums) };
  }
  // Currency-code detection: every sampled value is a real ISO-4217 code (≥2 samples).
  // Dictionary-based, not statistical enum — so unseen real currencies still pass.
  for (const [node, vals] of strBuckets) {
    if (node.enumValues && node.enumValues.length > 0) continue; // enum already guards it
    if (vals.length >= 2 && vals.every(v => ISO_4217.has(v))) node.isCurrencyCode = true;
  }
}
