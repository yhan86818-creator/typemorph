import { describe, it, expect } from 'vitest';
import { compareSchemas } from './diff';

describe('Schema Diff Comparison Engine', () => {
  it('should detect added fields', () => {
    const oldObj = { id: 1, name: 'Alice' };
    const newObj = { id: 1, name: 'Alice', email: 'alice@example.com' };

    const diffs = compareSchemas(oldObj, newObj);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toEqual({
      path: 'email',
      type: 'added',
      newType: 'string',
      severity: 'info',
      description: "New field 'email' of type 'string' added."
    });
  });

  it('should detect removed fields', () => {
    const oldObj = { id: 1, name: 'Alice', email: 'alice@example.com' };
    const newObj = { id: 1, name: 'Alice' };

    const diffs = compareSchemas(oldObj, newObj);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]).toEqual({
      path: 'email',
      type: 'removed',
      oldType: 'string',
      severity: 'error',
      description: "Field 'email' was removed. Frontend code referencing this property will break."
    });
  });

  it('should detect type changes', () => {
    const oldObj = { age: 25 };
    const newObj = { age: '25' };

    const diffs = compareSchemas(oldObj, newObj);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe('type_changed');
    expect(diffs[0].severity).toBe('error');
    expect(diffs[0].path).toBe('age');
  });

  it('should flag nullable transition as warning', () => {
    const oldObj = { phone: '123' };
    const newObj = { phone: null };

    const diffs = compareSchemas(oldObj, newObj);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe('type_changed');
    expect(diffs[0].severity).toBe('warning');
    expect(diffs[0].description).toContain('became optional or nullable');
  });

  it('should resolve empty arrays to typed arrays as info', () => {
    const oldObj = { tags: [] };
    const newObj = { tags: ['admin', 'moderator'] };

    const diffs = compareSchemas(oldObj, newObj);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].type).toBe('type_changed');
    expect(diffs[0].severity).toBe('info');
  });
});
