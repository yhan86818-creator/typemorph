import { describe, it, expect } from 'vitest';
import { compareSchemas, compareSchemaTypes } from './diff';
import { inferSchema } from './engine';

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

// ---------------------------------------------------------------------------
// compareSchemaTypes — semantic Schema-level diff
// ---------------------------------------------------------------------------
describe('compareSchemaTypes', () => {
  it('detects required field removal as breaking', () => {
    const old = inferSchema({ id: 1, name: 'Alice', email: 'a@b.com' });
    const next = inferSchema({ id: 1, name: 'Alice' });
    const diffs = compareSchemaTypes(old, next);
    const removed = diffs.find(d => d.path === 'email' && d.type === 'removed');
    expect(removed?.severity).toBe('error');
  });

  it('detects optional field removal as warning', () => {
    const old = inferSchema([{ id: 1, name: 'Alice', nickname: 'ali' }, { id: 2, name: 'Bob' }]);
    const next = inferSchema([{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]);
    // nickname was optional (missing in some items) → removal is warning
    const diffs = compareSchemaTypes(old, next);
    const removed = diffs.find(d => d.path.includes('nickname') && d.type === 'removed');
    expect(removed).toBeDefined();
    expect(removed?.severity).toBe('warning');
  });

  it('detects type change as breaking', () => {
    const old = inferSchema({ id: 1 });
    const next = inferSchema({ id: 'uuid-1234' });
    const diffs = compareSchemaTypes(old, next);
    expect(diffs.find(d => d.type === 'type_changed' && d.severity === 'error')).toBeDefined();
  });

  it('detects optional→required as breaking', () => {
    const old: any = { type: 'object', fields: { name: { type: 'string', optional: true } } };
    const next: any = { type: 'object', fields: { name: { type: 'string' } } };
    const diffs = compareSchemaTypes(old, next);
    const d = diffs.find(d => d.type === 'required_changed');
    expect(d?.severity).toBe('error');
  });

  it('detects required→optional as warning', () => {
    const old: any = { type: 'object', fields: { name: { type: 'string' } } };
    const next: any = { type: 'object', fields: { name: { type: 'string', optional: true } } };
    const diffs = compareSchemaTypes(old, next);
    const d = diffs.find(d => d.type === 'required_changed');
    expect(d?.severity).toBe('warning');
  });

  it('detects enum value removal as breaking', () => {
    const old: any = { type: 'object', fields: {
      status: { type: 'string', enumValues: ['active', 'inactive', 'pending'] }
    }};
    const next: any = { type: 'object', fields: {
      status: { type: 'string', enumValues: ['active', 'inactive'] }
    }};
    const diffs = compareSchemaTypes(old, next);
    const d = diffs.find(d => d.type === 'enum_changed' && d.severity === 'error');
    expect(d).toBeDefined();
    expect(d?.description).toContain('pending');
  });

  it('detects enum value addition as info', () => {
    const old: any = { type: 'object', fields: {
      role: { type: 'string', enumValues: ['admin', 'user'] }
    }};
    const next: any = { type: 'object', fields: {
      role: { type: 'string', enumValues: ['admin', 'user', 'moderator'] }
    }};
    const diffs = compareSchemaTypes(old, next);
    const d = diffs.find(d => d.type === 'enum_changed' && d.severity === 'info');
    expect(d).toBeDefined();
    expect(d?.description).toContain('moderator');
  });

  it('detects format change', () => {
    const old: any = { type: 'object', fields: { id: { type: 'string', format: 'uuid' } } };
    const next: any = { type: 'object', fields: { id: { type: 'string' } } };
    const diffs = compareSchemaTypes(old, next);
    expect(diffs.find(d => d.type === 'format_changed')).toBeDefined();
  });

  it('detects nullable added as info', () => {
    const old: any = { type: 'object', fields: { note: { type: 'string' } } };
    const next: any = { type: 'object', fields: { note: { type: 'string', nullable: true } } };
    const diffs = compareSchemaTypes(old, next);
    expect(diffs.find(d => d.type === 'nullable_changed' && d.severity === 'info')).toBeDefined();
  });

  it('detects nullable removed as warning', () => {
    const old: any = { type: 'object', fields: { note: { type: 'string', nullable: true } } };
    const next: any = { type: 'object', fields: { note: { type: 'string' } } };
    const diffs = compareSchemaTypes(old, next);
    expect(diffs.find(d => d.type === 'nullable_changed' && d.severity === 'warning')).toBeDefined();
  });

  it('returns no diffs for identical schemas', () => {
    const s = inferSchema({ id: 1, name: 'Alice', active: true });
    expect(compareSchemaTypes(s, s)).toHaveLength(0);
  });

  it('recursively checks nested object fields', () => {
    const old = inferSchema({ user: { id: 1, email: 'a@b.com' } });
    const next = inferSchema({ user: { id: 1 } });
    const diffs = compareSchemaTypes(old, next);
    expect(diffs.find(d => d.path.includes('email'))).toBeDefined();
  });

  it('checks array item type changes', () => {
    const old: any = { type: 'array', itemType: { type: 'string' } };
    const next: any = { type: 'array', itemType: { type: 'number' } };
    const diffs = compareSchemaTypes(old, next);
    expect(diffs.find(d => d.type === 'type_changed')).toBeDefined();
  });
});
