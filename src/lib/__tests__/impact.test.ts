import { describe, it, expect } from 'vitest';
import { analyzeImpact, buildPathToClass } from '../impact';
import { schemaToAST } from '../ast';
import { compareSchemaTypes } from '../diff';
import { inferSchema } from '../engine';

const ORDER = {
  order_id: 'abc-123',
  status: 'shipped',
  total: 99.99,
  customer: { name: 'Alice', email: 'alice@example.com' },
  items: [{ product_id: 'p1', quantity: 2, price: 49.99 }],
};

describe('buildPathToClass', () => {
  it('maps root prefix to root class', () => {
    const schema = inferSchema(ORDER);
    const classes = schemaToAST(schema, 'Order');
    const map = buildPathToClass(classes, 'Order');
    expect(map.get('')).toBe('Order');
  });

  it('maps nested object field to its ASTClass', () => {
    const schema = inferSchema(ORDER);
    const classes = schemaToAST(schema, 'Order');
    const map = buildPathToClass(classes, 'Order');
    // customer is an object → generates a class (Customer or OrderCustomer)
    const customerEntry = [...map.entries()].find(([k]) => k === 'customer');
    expect(customerEntry).toBeDefined();
    expect(customerEntry![1]).toMatch(/Customer|Order/i);
  });

  it('maps array item path with [] suffix', () => {
    const schema = inferSchema(ORDER);
    const classes = schemaToAST(schema, 'Order');
    const map = buildPathToClass(classes, 'Order');
    const itemEntry = [...map.entries()].find(([k]) => k === 'items[]');
    expect(itemEntry).toBeDefined();
  });
});

describe('analyzeImpact', () => {
  it('returns all safe when diffs is empty', () => {
    const schema = inferSchema(ORDER);
    const classes = schemaToAST(schema, 'Order');
    const result = analyzeImpact([], classes, 'Order');
    expect(result.totalChanged).toBe(0);
    expect(result.totalImpacted).toBe(0);
    expect(result.totalSafe).toBe(classes.length);
    for (const [, kind] of result.classImpact) {
      expect(kind).toBe('safe');
    }
  });

  it('marks root class as changed when a root-level field changes type', () => {
    const before = inferSchema({ order_id: 'abc', total: 100 });
    const after = inferSchema({ order_id: 'abc', total: 'n/a' });
    const diffs = compareSchemaTypes(before, after, 'root');
    const classes = schemaToAST(after, 'Root');
    const result = analyzeImpact(diffs, classes, 'Root');

    expect(result.classImpact.get('Root')).toBe('changed');
    expect(result.totalChanged).toBeGreaterThan(0);
  });

  it('marks leaf class as changed and parent class as impacted', () => {
    const before = inferSchema({ name: 'Order', item: { sku: 'A1', price: 10 } });
    const after = inferSchema({ name: 'Order', item: { sku: 'A1', price: 'free' } });
    const diffs = compareSchemaTypes(before, after, 'root');
    const classes = schemaToAST(after, 'Root');
    const result = analyzeImpact(diffs, classes, 'Root');

    // Item class contains the changed field
    const itemClass = [...result.classImpact.entries()].find(([, kind]) => kind === 'changed');
    expect(itemClass).toBeDefined();

    // Root has a field referencing Item → it becomes impacted
    expect(result.classImpact.get('Root')).toBe('impacted');
  });

  it('changedFields maps the owning class to the relevant diffs', () => {
    const before = inferSchema({ id: '1', address: { city: 'Tokyo', zip: '100' } });
    const after = inferSchema({ id: '1', address: { city: 'Tokyo', zip: 160 } });
    const diffs = compareSchemaTypes(before, after, 'root');
    const classes = schemaToAST(after, 'Root');
    const result = analyzeImpact(diffs, classes, 'Root');

    // At least one class should have changedFields
    expect(result.changedFields.size).toBeGreaterThan(0);
    const allDiffs = [...result.changedFields.values()].flat();
    expect(allDiffs.some(d => d.path.includes('zip'))).toBe(true);
  });

  it('counts match total classes', () => {
    const before = inferSchema(ORDER);
    const after = inferSchema({ ...ORDER, total: 'updated' });
    const diffs = compareSchemaTypes(before, after, 'root');
    const classes = schemaToAST(after, 'Order');
    const result = analyzeImpact(diffs, classes, 'Order');

    expect(result.totalChanged + result.totalImpacted + result.totalSafe).toBe(classes.length);
  });
});
