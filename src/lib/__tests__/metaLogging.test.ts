import { expect, test } from 'vitest';
import { inferSchema } from '../engine';

test('inferSchema includeMeta adds _meta with reason', () => {
  const json = { id: '6f1e9c2a-1d3b-4f6a-8c2d-1234567890ab', email: 'a@ex.com' };
  const s = inferSchema(json, undefined, 0, undefined, { includeMeta: true });
  expect(s.fields!.id._meta).toBeDefined();
  expect(s.fields!.id._meta!.reason).toBe('format:uuid');
  expect(s.fields!.email._meta).toBeDefined();
  expect(s.fields!.email._meta!.reason).toBe('format:email');
});
