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

describe('arithmetic-identity derivation & checks', () => {
  // Minimal invoice corpus: subtotal = Σ line_items.amount, amount = qty × unit_price.
  // total = subtotal + tax holds for ALL rows here (no hidden fees), so it's learnable.
  const inv = (n: number, qty: number, price: number, tax: number) => {
    const amount = qty * price;
    return {
      subtotal: amount, tax, total: amount + tax,
      line_items: [{ description: `item${n}`, qty, unit_price: price, amount }],
    };
  };
  const corpus = [inv(1, 3, 50, 15), inv(2, 2, 100, 20), inv(3, 5, 30, 15), inv(4, 1, 200, 20)];

  it('derives sum and product identities that hold across all samples', () => {
    const s = inferExpectedSchema(corpus);
    const targets = (s.arithIdentities ?? []).map(i => `${i.target}:${i.kind}`);
    expect(targets).toContain('subtotal:sum');
    expect(targets).toContain('total:sum');
    expect(s.fields?.line_items?.itemType?.arithIdentities?.some(i => i.target === 'amount' && i.kind === 'product')).toBe(true);
  });

  it('produces zero arith issues on the clean corpus (no false positives)', () => {
    const s = inferExpectedSchema(corpus);
    const r = validateOutputs(s, corpus);
    expect(r.issues.filter(i => i.code === 'arith')).toHaveLength(0);
  });

  it('flags a line-item decimal shift (amount ≠ qty × unit_price)', () => {
    const s = inferExpectedSchema(corpus);
    const bad = { subtotal: 1500, tax: 150, total: 1650,
      line_items: [{ description: 'x', qty: 3, unit_price: 50, amount: 1500 }] }; // should be 150
    const a = validateOutputs(s, [bad]).issues.filter(i => i.code === 'arith');
    expect(a.some(i => i.path === 'line_items[0].amount')).toBe(true);
  });

  it('flags subtotal ≠ Σ line_items.amount', () => {
    const s = inferExpectedSchema(corpus);
    const bad = { subtotal: 999, tax: 100, total: 1099,
      line_items: [{ description: 'x', qty: 3, unit_price: 50, amount: 150 }] };
    const a = validateOutputs(s, [bad]).issues.filter(i => i.code === 'arith' && i.path === 'subtotal');
    expect(a).toHaveLength(1);
  });

  it('flags a 10× total typo when the total identity is learnable', () => {
    const s = inferExpectedSchema(corpus);
    const bad = { subtotal: 760, tax: 76, total: 8360, // 8360 vs 836
      line_items: [{ description: 'x', qty: 2, unit_price: 380, amount: 760 }] };
    const a = validateOutputs(s, [bad]).issues.filter(i => i.code === 'arith' && i.path === 'total');
    expect(a).toHaveLength(1);
  });

  it('self-disables the total identity when samples carry hidden fees (FP-zero)', () => {
    // inv with shipping/discount baked into total but NOT present as a field → total
    // has no identity that holds across all rows → must not be learned, so a later
    // odd total is NOT flagged (we cannot prove it wrong without the breakdown).
    const withHidden = [...corpus,
      { subtotal: 480, tax: 40.8, total: 555.8, line_items: [{ description: 'x', qty: 4, unit_price: 120, amount: 480 }] }, // +35 shipping
      { subtotal: 200, tax: 36, total: 216, line_items: [{ description: 'x', qty: 2, unit_price: 100, amount: 200 }] },     // -20 discount
    ];
    const s = inferExpectedSchema(withHidden);
    expect((s.arithIdentities ?? []).some(i => i.target === 'total')).toBe(false);
    // subtotal/amount identities still hold and still catch a real error
    const bad = { subtotal: 999, tax: 1, total: 1000, line_items: [{ description: 'x', qty: 1, unit_price: 1, amount: 1 }] };
    const a = validateOutputs(s, [bad]).issues.filter(i => i.code === 'arith' && i.path === 'subtotal');
    expect(a).toHaveLength(1);
  });

  it('does not derive identities from fewer than 3 samples', () => {
    const s = inferExpectedSchema(corpus.slice(0, 2));
    expect(s.arithIdentities ?? []).toHaveLength(0);
  });
});
