import { describe, it, expect } from 'vitest';
import { compareSchemas } from './diff';

describe('compareSchemas', () => {
  it('should detect removed fields as breaking', () => {
    const oldJson = { id: 1, name: 'Alice', email: 'a@example.com' };
    const newJson = { id: 1, name: 'Alice' };
    const diffs = compareSchemas(oldJson, newJson);
    const removed = diffs.find(d => d.path === 'email' && d.type === 'removed');
    expect(removed).toBeTruthy();
    expect(removed?.severity).toBe('error');
  });

  it('should detect added fields as info', () => {
    const oldJson = { id: 1, name: 'Alice' };
    const newJson = { id: 1, name: 'Alice', age: 25 };
    const diffs = compareSchemas(oldJson, newJson);
    const added = diffs.find(d => d.path === 'age' && d.type === 'added');
    expect(added).toBeTruthy();
    expect(added?.severity).toBe('info');
  });

  it('should detect type changes', () => {
    const oldJson = { id: 1 };
    const newJson = { id: 'uuid-1234' };
    const diffs = compareSchemas(oldJson, newJson);
    const changed = diffs.find(d => d.path === 'id' && d.type === 'type_changed');
    expect(changed).toBeTruthy();
  });

  it('should return empty array for identical schemas', () => {
    const json = { id: 1, name: 'Alice' };
    const diffs = compareSchemas(json, json);
    expect(diffs).toHaveLength(0);
  });

  it('should detect nullable change as warning', () => {
    const oldJson = { status: 'active' };
    const newJson = { status: null };
    const diffs = compareSchemas(oldJson, newJson);
    const changed = diffs.find(d => d.path === 'status');
    expect(changed).toBeTruthy();
    expect(changed?.severity).toBe('warning');
  });

  it('should detect nested field removal', () => {
    const oldJson = { user: { id: 1, email: 'a@example.com' } };
    const newJson = { user: { id: 1 } };
    const diffs = compareSchemas(oldJson, newJson);
    const removed = diffs.find(d => d.path === 'user.email');
    expect(removed).toBeTruthy();
    expect(removed?.type).toBe('removed');
  });

  it('[bugfix] should NOT report a false-positive type_changed when only primitive array element order differs', () => {
    // Previously flattenSchema used nonObjectElements[0] for the path[] type.
    // Swapping element order (string first vs number first) triggered a spurious diff.
    const oldJson = { values: ['hello', 1, null] };
    const newJson = { values: [1, 'hello', null] };
    const diffs = compareSchemas(oldJson, newJson);
    // No type_changed for values[] — same element types, only order changed
    const falsePositive = diffs.find(d => d.path === 'values[]' && d.type === 'type_changed');
    expect(falsePositive).toBeUndefined();
  });

  it('[bugfix] should still detect a genuine type change when all primitive array elements change type', () => {
    const oldJson = { ids: [1, 2, 3] };
    const newJson = { ids: ['a', 'b', 'c'] };
    const diffs = compareSchemas(oldJson, newJson);
    const changed = diffs.find(d => d.type === 'type_changed');
    expect(changed).toBeDefined();
  });

  it('[bugfix] should correctly represent mixed-type arrays using a union type signature', () => {
    const oldJson = { tags: [1, 'hello'] };
    const newJson = { tags: [1, 'world'] };
    const diffs = compareSchemas(oldJson, newJson);
    // Both arrays are [number, string] — no diff expected
    expect(diffs).toHaveLength(0);
  });
});
