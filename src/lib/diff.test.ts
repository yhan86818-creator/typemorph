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
});
