import { describe, it, expect } from 'vitest';
import { validateOutputs, inferExpectedSchema } from '../validate';
import type { Schema } from '../types';

// expected: { id: uuid-string, confidence: number, sources: string[], tag?: enum }
const expected: Schema = {
  type: 'object',
  fields: {
    id: { type: 'string', format: 'uuid' },
    confidence: { type: 'number' },
    sources: { type: 'array', itemType: { type: 'string' } },
    tag: { type: 'string', optional: true, enumValues: ['a', 'b'] },
  },
};

const good = { id: '550e8400-e29b-41d4-a716-446655440000', confidence: 0.9, sources: ['x'] };

describe('validateOutputs', () => {
  it('passes a fully-valid record', () => {
    const r = validateOutputs(expected, [good]);
    expect(r.ok).toBe(true);
    expect(r.passed).toBe(1);
    expect(r.issues).toHaveLength(0);
  });

  it('flags a missing required field as error and fails the record', () => {
    const r = validateOutputs(expected, [{ id: good.id, confidence: 0.9 }]);
    expect(r.ok).toBe(false);
    expect(r.failed).toBe(1);
    const miss = r.issues.find(i => i.code === 'missing');
    expect(miss?.path).toBe('sources');
    expect(miss?.severity).toBe('error');
  });

  it('allows a missing OPTIONAL field', () => {
    const r = validateOutputs(expected, [good]); // tag is optional & absent
    expect(r.ok).toBe(true);
  });

  it('flags a wrong type and suggests coerce for quoted numbers', () => {
    const r = validateOutputs(expected, [{ ...good, confidence: '0.9' }]);
    expect(r.ok).toBe(false);
    const t = r.issues.find(i => i.code === 'type');
    expect(t?.message).toContain('expected number, got string');
    expect(t?.fix).toContain('z.coerce.number()');
  });

  it('treats an extra field as warning (passes non-strict, fails strict)', () => {
    const rec = { ...good, reasoning: 'because' };
    const loose = validateOutputs(expected, [rec]);
    expect(loose.ok).toBe(true);
    expect(loose.issues.some(i => i.code === 'extra' && i.severity === 'warning')).toBe(true);

    const strict = validateOutputs(expected, [rec], { strict: true });
    expect(strict.ok).toBe(false);

    const asError = validateOutputs(expected, [rec], { extraFields: 'error' });
    expect(asError.ok).toBe(false);

    const ignored = validateOutputs(expected, [rec], { extraFields: 'ignore' });
    expect(ignored.issues).toHaveLength(0);
  });

  it('errors on null for a non-nullable field, allows it when nullable', () => {
    const bad = validateOutputs(expected, [{ ...good, confidence: null }]);
    expect(bad.issues.find(i => i.code === 'null')?.severity).toBe('error');

    const nullableExpected: Schema = { ...expected, fields: { ...expected.fields!, confidence: { type: 'number', nullable: true } } };
    const ok = validateOutputs(nullableExpected, [{ ...good, confidence: null }]);
    expect(ok.ok).toBe(true);
  });

  it('treats enum drift as warning only (never hard-fails unknown values)', () => {
    const r = validateOutputs(expected, [{ ...good, tag: 'z' }]);
    expect(r.ok).toBe(true); // warning, not error
    expect(r.issues.find(i => i.code === 'enum')?.severity).toBe('warning');
  });

  it('treats format drift as warning only', () => {
    const r = validateOutputs(expected, [{ ...good, id: 'not-a-uuid' }]);
    expect(r.ok).toBe(true);
    expect(r.issues.find(i => i.code === 'format')?.severity).toBe('warning');
  });

  it('validates array element types and reports the index', () => {
    const r = validateOutputs(expected, [{ ...good, sources: ['ok', 42] }]);
    expect(r.ok).toBe(false);
    const t = r.issues.find(i => i.code === 'type');
    expect(t?.path).toBe('sources[1]');
  });

  it('aggregates a batch: 2 of 3 failed with a summary', () => {
    const records = [
      good,
      { id: good.id, confidence: 0.5 },              // missing sources → fail
      { ...good, confidence: '1' },                   // wrong type → fail
    ];
    const r = validateOutputs(expected, records);
    expect(r.total).toBe(3);
    expect(r.failed).toBe(2);
    expect(r.passed).toBe(1);
    expect(r.summary[0].count).toBeGreaterThan(0);
  });

  it('passes through any/union without false positives', () => {
    const sc: Schema = { type: 'object', fields: { meta: { type: 'any' }, val: { type: 'union', unionTypes: ['string', 'number'] } } };
    const r = validateOutputs(sc, [{ meta: { anything: 1 }, val: 'x' }, { meta: 5, val: 99 }]);
    expect(r.ok).toBe(true);
  });
});

describe('inferExpectedSchema', () => {
  it('unwraps the array wrapper to the per-record object schema', () => {
    const s = inferExpectedSchema([good, { ...good, confidence: 0.1 }]);
    expect(s.type).toBe('object');
    expect(s.fields?.id).toBeTruthy();
  });

  it('round-trips: schema inferred from good outputs validates those outputs', () => {
    const records = [good, { ...good, confidence: 0.2, sources: ['a', 'b'] }];
    const schema = inferExpectedSchema(records);
    const r = validateOutputs(schema, records);
    expect(r.ok).toBe(true);
  });
});
