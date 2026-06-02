import { expect, test } from 'vitest';
import { inferSchema, extractSharedTypes, getDecisions } from '../engine';

test('inferSchema basic types', () => {
  const json = {
    id: '6f1e9c2a-1d3b-4f6a-8c2d-1234567890ab',
    email: 'alice@example.com',
    age: 42,
    active: true,
    created_at: '2020-01-01'
  };

  const schema = inferSchema(json);
  expect(schema.type).toBe('object');
  expect(schema.fields).toBeTruthy();
  expect(schema.fields!.id.type).toBe('string');
  expect(schema.fields!.id.format).toBe('uuid');
  expect(schema.fields!.email.format).toBe('email');
  expect(schema.fields!.age.type).toBe('number');
  expect(schema.fields!.active.type).toBe('boolean');
  expect(schema.fields!.created_at.format).toBe('date');
});

test('extractSharedTypes finds shared type and getDecisions reports unification', () => {
  const json = {
    userA: { name: 'Alice', email: 'a@ex.com' },
    userB: { name: 'Bob', email: 'b@ex.com' }
  };

  const schema = inferSchema(json);
  // operate in-place
  extractSharedTypes(schema, { sharedPrefix: 'Shared' });

  const ua = (schema.fields!.userA as any);
  const ub = (schema.fields!.userB as any);
  expect(ua._sharedTypeName).toBeDefined();
  expect(ub._sharedTypeName).toBeDefined();
  expect(ua._sharedTypeName).toEqual(ub._sharedTypeName);

  const decisions = getDecisions(json);
  const unify = decisions.find(d => d.type === 'unification');
  expect(unify).toBeDefined();
  if (unify) expect((unify.meta.count || 0) >= 2).toBeTruthy();
});
