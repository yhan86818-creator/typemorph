/**
 * Edge case tests
 * ───────────────
 * Verifies that generators handle unusual inputs gracefully.
 * Primary rule: generators must NEVER throw — they should return a string
 * (possibly empty or a comment) for any input inferSchema can produce.
 *
 * Secondary: structural properties that must hold regardless of input.
 */

import { describe, it, expect } from 'vitest';
import { inferSchema } from '../engine';
import { zodGen, tsGen, prismaGen } from '../generators';
import { drizzleGen } from '../generators-extended';

// Helper: run all 4 core generators and assert none throw
function allGensSafe(input: unknown, name = 'Root') {
  const schema = inferSchema(input);
  expect(() => zodGen.generate(schema, name, {})).not.toThrow();
  expect(() => tsGen.generate(schema, name)).not.toThrow();
  expect(() => prismaGen.generate(schema, name)).not.toThrow();
  expect(() => drizzleGen.generate(schema, name)).not.toThrow();
}

// ─── 1. Empty / minimal inputs ──────────────────────────────────────────────

describe('Edge cases: empty / minimal', () => {
  it('does not throw on empty object', () => {
    allGensSafe({});
  });

  it('does not throw on single string field', () => {
    allGensSafe({ name: 'Alice' });
  });

  it('does not throw on single number field', () => {
    allGensSafe({ count: 42 });
  });

  it('does not throw on single boolean field', () => {
    allGensSafe({ active: true });
  });

  it('zodGen returns empty string or comment for empty object', () => {
    const schema = inferSchema({});
    const out = zodGen.generate(schema, 'Empty', {});
    // Must not throw, must be a string
    expect(typeof out).toBe('string');
  });

  it('tsGen returns a string for empty object', () => {
    const schema = inferSchema({});
    const out = tsGen.generate(schema, 'Empty');
    expect(typeof out).toBe('string');
  });
});

// ─── 2. Null values ─────────────────────────────────────────────────────────

describe('Edge cases: null values', () => {
  it('does not throw when a field is null', () => {
    allGensSafe({ name: 'Alice', bio: null });
  });

  it('does not throw when all fields are null', () => {
    allGensSafe({ a: null, b: null, c: null });
  });

  it('does not throw when nested object is null', () => {
    allGensSafe({ user: null });
  });

  it('zodGen marks null fields as nullable', () => {
    const schema = inferSchema({ name: 'Alice', bio: null });
    const out = zodGen.generate(schema, 'User', {});
    expect(out).toMatch(/bio.*null|nullable/i);
  });

  it('tsGen marks null fields as nullable type', () => {
    const schema = inferSchema({ name: 'Alice', bio: null });
    const out = tsGen.generate(schema, 'User');
    expect(out).toMatch(/bio.*null|null.*bio/);
  });
});

// ─── 3. Array edge cases ────────────────────────────────────────────────────

describe('Edge cases: arrays', () => {
  it('does not throw on empty array field', () => {
    allGensSafe({ tags: [] });
  });

  it('does not throw on array of strings', () => {
    allGensSafe({ tags: ['a', 'b', 'c'] });
  });

  it('does not throw on array of numbers', () => {
    allGensSafe({ scores: [1, 2, 3] });
  });

  it('does not throw on array of booleans', () => {
    allGensSafe({ flags: [true, false, true] });
  });

  it('does not throw on array of objects', () => {
    allGensSafe({ items: [{ id: 1, name: 'x' }] });
  });

  it('does not throw on array containing null', () => {
    allGensSafe({ tags: [null, 'a', null] });
  });

  it('zodGen wraps array of strings in z.array(z.string())', () => {
    const schema = inferSchema({ tags: ['a', 'b'] });
    const out = zodGen.generate(schema, 'Post', {});
    expect(out).toMatch(/tags.*z\.array\(z\.string\(\)\)/);
  });

  it('zodGen wraps array of numbers in z.array(z.number())', () => {
    const schema = inferSchema({ scores: [1.5, 2.5] });
    const out = zodGen.generate(schema, 'Result', {});
    expect(out).toMatch(/scores.*z\.array\(z\.number\(\)\)/);
  });

  it('tsGen types string array as string[]', () => {
    const schema = inferSchema({ tags: ['a', 'b'] });
    const out = tsGen.generate(schema, 'Post');
    expect(out).toMatch(/tags.*string\[\]/);
  });
});

// ─── 4. Deep nesting ────────────────────────────────────────────────────────

describe('Edge cases: deep nesting', () => {
  const DEEP = { a: { b: { c: { d: { e: 'leaf' } } } } };
  const DEEP_WITH_ARRAY = { users: [{ posts: [{ tags: ['ts', 'react'] }] }] };

  it('does not throw on 5-level deep nesting', () => {
    allGensSafe(DEEP);
  });

  it('does not throw on nested arrays of objects', () => {
    allGensSafe(DEEP_WITH_ARRAY);
  });

  it('zodGen produces output for deeply nested schema', () => {
    const out = zodGen.generate(inferSchema(DEEP), 'Root', {});
    expect(out.length).toBeGreaterThan(0);
    expect(out).toContain('z.object(');
  });

  it('tsGen produces output for deeply nested schema', () => {
    const out = tsGen.generate(inferSchema(DEEP), 'Root');
    expect(out.length).toBeGreaterThan(0);
  });
});

// ─── 5. Reserved keyword field names ────────────────────────────────────────

describe('Edge cases: reserved keyword field names', () => {
  it('does not throw when field is named "type"', () => {
    allGensSafe({ type: 'admin', name: 'Alice' });
  });

  it('does not throw when field is named "class"', () => {
    allGensSafe({ class: 'premium', id: 1 });
  });

  it('does not throw when field is named "default"', () => {
    allGensSafe({ default: 'value', id: 1 });
  });

  it('does not throw when field is named "constructor"', () => {
    allGensSafe({ constructor: 'CustomClass' });
  });

  it('zodGen outputs something for "type" field name', () => {
    const out = zodGen.generate(inferSchema({ type: 'user', id: 1 }), 'Item', {});
    expect(out).toContain('type');
    expect(typeof out).toBe('string');
  });

  it('tsGen outputs something for "class" field name', () => {
    const out = tsGen.generate(inferSchema({ class: 'premium' }), 'User');
    expect(out).toContain('class');
    expect(typeof out).toBe('string');
  });
});

// ─── 6. Zero and falsy values ────────────────────────────────────────────────

describe('Edge cases: zero and falsy values', () => {
  it('does not throw on zero-value fields', () => {
    allGensSafe({ count: 0, price: 0.0, active: false, name: '' });
  });

  it('infers count:0 as number (not absent/null)', () => {
    const schema = inferSchema({ count: 0 });
    const out = zodGen.generate(schema, 'Item', {});
    expect(out).toMatch(/count.*z\.number/);
  });

  it('infers active:false as boolean (not absent/null)', () => {
    const schema = inferSchema({ active: false });
    const out = zodGen.generate(schema, 'Item', {});
    expect(out).toMatch(/active.*z\.boolean/);
  });

  it('integer zero is still treated as integer', () => {
    // count:0 should produce .int().min(0), not just z.number()
    const schema = inferSchema({ count: 0 });
    const out = zodGen.generate(schema, 'Item', {});
    expect(out).toContain('count: z.number().int().min(0)');
  });

  it('drizzleGen maps count:0 to integer column', () => {
    const out = drizzleGen.generate(inferSchema({ count: 0 }), 'Item');
    expect(out).toContain("integer('count')");
  });
});

// ─── 7. Large schema ────────────────────────────────────────────────────────

describe('Edge cases: large schema', () => {
  const LARGE = {
    id: 'usr_123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '+1-555-0100',
    age: 30,
    score: 4.5,
    isActive: true,
    isVerified: false,
    role: 'admin',
    department: 'Engineering',
    salary: 95000.00,
    startDate: '2020-01-15T00:00:00Z',
    lastLogin: '2024-01-15T10:30:00Z',
    address: { street: '123 Main St', city: 'NY', country: 'US' },
    tags: ['typescript', 'react'],
    viewCount: 1234,
    rating: 4.8,
  };

  it('does not throw on 18-field schema', () => {
    allGensSafe(LARGE, 'User');
  });

  it('zodGen produces non-empty output for large schema', () => {
    const out = zodGen.generate(inferSchema(LARGE), 'User', {});
    expect(out.length).toBeGreaterThan(100);
    expect(out).toContain('email: z.email()');
    expect(out).toContain('isActive: z.boolean()');
  });

  it('tsGen produces an exported interface/type for large schema', () => {
    const out = tsGen.generate(inferSchema(LARGE), 'User');
    expect(out).toMatch(/export (type|interface) User/);
  });

  it('prismaGen produces a model with at least 10 fields', () => {
    const out = prismaGen.generate(inferSchema(LARGE), 'User');
    expect(out).toContain('model User');
    const fieldCount = (out.match(/^\s+\w+\s+\w+/gm) || []).length;
    expect(fieldCount).toBeGreaterThanOrEqual(10);
  });
});

// ─── 8. Naming edge cases ────────────────────────────────────────────────────

describe('Edge cases: naming', () => {
  it('does not throw on all-uppercase field names', () => {
    allGensSafe({ ID: 1, NAME: 'Alice', STATUS: 'active' });
  });

  it('does not throw on snake_case field names', () => {
    allGensSafe({ user_id: 1, first_name: 'Alice', is_active: true });
  });

  it('does not throw on mixed camel and snake_case', () => {
    allGensSafe({ userId: 1, user_name: 'Alice', isActive: true });
  });

  it('zodGen handles snake_case field names', () => {
    const out = zodGen.generate(inferSchema({ is_active: true, user_name: 'Alice' }), 'User', {});
    expect(out).toContain('is_active');
    expect(out).toContain('user_name');
  });

  it('drizzleGen converts camelCase to snake_case column names', () => {
    const out = drizzleGen.generate(inferSchema({ firstName: 'Alice', isActive: true }), 'User');
    expect(out).toContain("varchar('first_name'");
    expect(out).toContain("boolean('is_active'");
  });
});
