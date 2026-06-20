/**
 * Cross-language real-data pass — runs realistic API payloads through the actual
 * UX path (runEngine) for the languages that real-world.test.ts didn't cover
 * (go/rust/python/swift/java/kotlin/csharp).
 *
 * Written AFTER inspecting real output, not from assumption. The Python block
 * locks an ordering bug this pass found: Python evaluates class-body annotations
 * eagerly, so a parent model referencing a nested model defined later throws
 * NameError. The generator now emits child models first (topological order).
 */
import { describe, it, expect } from 'vitest';
import { runEngine } from '../engine';

const EC_ORDER = {
  id: 'ord_abc123', userId: 'usr_456', status: 'pending',
  items: [{ productId: 'prd_789', quantity: 2, price: 29.99, discount: 0 }],
  shippingAddress: { street: '123 Main St', city: 'Tokyo', postalCode: '150-0002', country: 'JP' },
  total: 59.98, createdAt: '2024-01-15T10:30:00Z',
};

const TRANSACTION = {
  transactionId: 'txn_abc123', fromAccountId: 'acc_123', toAccountId: 'acc_456',
  amount: 1500.0, fee: 2.5, currency: 'USD', type: 'transfer', status: 'completed',
  processedAt: '2024-01-15T10:30:00Z', metadata: { reference: 'INV-001', note: 'Monthly subscription' },
};

const LANGS = ['go', 'rust', 'python', 'swift', 'java', 'kotlin', 'csharp'];

describe('Real-world cross-language: no garbage', () => {
  // A linter/codegen that emits [object Object] / undefined / NaN is broken.
  const GARBAGE = ['[object Object]', 'undefined', 'NaN', ': tuple', 'null,null'];
  for (const lang of LANGS) {
    for (const [name, fixture] of [['EC_ORDER', EC_ORDER], ['TRANSACTION', TRANSACTION]] as const) {
      it(`${lang} / ${name} produces no garbage tokens`, () => {
        const out: string = runEngine(fixture, lang);
        expect(out.length).toBeGreaterThan(50);
        for (const token of GARBAGE) {
          expect(out, `${lang}/${name} leaked "${token}"`).not.toContain(token);
        }
      });
    }
  }
});

describe('Real-world cross-language: nested objects become nested types', () => {
  it('every language emits a nested type for shippingAddress (not flattened)', () => {
    for (const lang of LANGS) {
      const out: string = runEngine(EC_ORDER, lang);
      // schemaToAST names the nested class RootShippingAddress across generators.
      expect(out, `${lang} flattened or dropped the nested address`).toContain('ShippingAddress');
    }
  });

  it('every language emits a nested type for the items element', () => {
    for (const lang of LANGS) {
      const out: string = runEngine(EC_ORDER, lang);
      expect(out, `${lang} dropped the items element type`).toContain('RootItem');
    }
  });
});

describe('Real-world: Python forward-reference ordering (regression guard)', () => {
  it('declares nested models BEFORE the model that references them', () => {
    const out: string = runEngine(EC_ORDER, 'python');
    const iRoot = out.indexOf('class Root(');
    const iItem = out.indexOf('class RootItem(');
    const iAddr = out.indexOf('class RootShippingAddress(');
    expect(iItem).toBeGreaterThanOrEqual(0);
    expect(iAddr).toBeGreaterThanOrEqual(0);
    expect(iRoot).toBeGreaterThanOrEqual(0);
    // Children must come first, or `List[RootItem]` raises NameError at import.
    expect(iItem, 'RootItem must be defined before Root').toBeLessThan(iRoot);
    expect(iAddr, 'RootShippingAddress must be defined before Root').toBeLessThan(iRoot);
  });

  it('also orders the nested metadata model before its parent', () => {
    const out: string = runEngine(TRANSACTION, 'python');
    expect(out.indexOf('class RootMetadata(')).toBeLessThan(out.indexOf('class Root('));
  });
});

describe('Real-world cross-language: reserved keywords and types', () => {
  it('Rust escapes the reserved field name `type` as a raw identifier', () => {
    const out: string = runEngine(TRANSACTION, 'rust');
    expect(out).toContain('r#type');
  });

  it('Go maps an ISO datetime string to time.Time, not string', () => {
    const out: string = runEngine(EC_ORDER, 'go');
    expect(out).toMatch(/CreatedAt\s+time\.Time/);
  });
});
