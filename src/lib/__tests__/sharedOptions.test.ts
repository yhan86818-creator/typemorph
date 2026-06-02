import { expect, test } from 'vitest';
import { inferSchema, extractSharedTypes } from '../engine';

test('extractSharedTypes respects minMatchRatio option', () => {
  const json = {
    objA: { a: 1, b: 2, c: 3, d: 4, e: 5 },
    objB: { a: 1, b: 2, c: 3, d: 4, f: 'x' }
  };

  const s1 = inferSchema(json);
  extractSharedTypes(s1); // default should unify
  expect(s1.fields!.objA._sharedTypeName).toBeDefined();

  const s2 = inferSchema(json);
  extractSharedTypes(s2, { minMatchRatio: 0.85 }); // stricter should avoid unification
  expect(s2.fields!.objA._sharedTypeName).toBeUndefined();
});
