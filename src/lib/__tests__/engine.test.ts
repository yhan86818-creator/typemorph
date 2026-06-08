import { expect, test } from 'vitest';
import { inferSchema, extractSharedTypes, getDecisions, runEngine } from '../engine';

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

test('inferSchema merges array items and detects optional/union fields', () => {
  const json = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob', age: 30 },
    { id: 'uuid-1234', name: 'Charlie', age: 25.5 }
  ];

  const schema = inferSchema(json);
  
  expect(schema.type).toBe('array');
  expect(schema.itemType).toBeDefined();
  
  const item = schema.itemType!;
  expect(item.type).toBe('object');
  
  // 'id' is number in first two, string in third -> union of number and string
  expect(item.fields!.id.type).toBe('union');
  expect(item.fields!.id.unionTypes).toContain('number');
  expect(item.fields!.id.unionTypes).toContain('string');

  // 'name' is string in all
  expect(item.fields!.name.type).toBe('string');
  expect(item.fields!.name.optional).toBeFalsy();

  // 'age' is missing in first -> optional
  expect(item.fields!.age.type).toBe('number');
  expect(item.fields!.age.optional).toBe(true);
  expect(item.fields!.age.format).toBe('float'); // due to 25.5
});

test('inferSchema maintains stable sampling for large arrays', () => {
  const json = Array.from({ length: 50 }, (_, idx) => ({
    status: idx % 3 === 0 ? 'inactive' : 'active',
    category: idx % 2 === 0 ? 'A' : 'B'
  }));

  const schema = inferSchema(json, undefined, 0, undefined, {
    arrayLargeThreshold: 10,
    arraySampleCount: 6,
    arrayPrefixSample: 2,
    includeMeta: true,
  });

  expect(schema.type).toBe('array');
  expect(schema._meta?.info?.sampled).toBe(6);
  expect(schema.itemType?.fields?.status.enumValues).toEqual(expect.arrayContaining(['active', 'inactive']));
});

test('inferSchema format detection', () => {
  const json = {
    my_uuid: '123e4567-e89b-12d3-a456-426614174000',
    my_email: 'test@example.com',
    my_url: 'https://example.com',
    my_date: '2023-10-01',
    my_datetime: '2023-10-01T12:00:00Z'
  };

  const schema = inferSchema(json);
  expect(schema.fields!.my_uuid.format).toBe('uuid');
  expect(schema.fields!.my_email.format).toBe('email');
  expect(schema.fields!.my_url.format).toBe('url');
  expect(schema.fields!.my_date.format).toBe('date');
  expect(schema.fields!.my_datetime.format).toBe('datetime');
});

test('inferSchema Enum detection', () => {
  const json = [
    { status: 'active' },
    { status: 'inactive' },
    { status: 'pending' },
    { status: 'active' }
  ];

  const schema = inferSchema(json);
  const statusField = schema.itemType!.fields!.status;
  
  expect(statusField.type).toBe('string');
  expect(statusField.enumValues).toBeDefined();
  expect(statusField.enumValues).toContain('active');
  expect(statusField.enumValues).toContain('inactive');
  expect(statusField.enumValues).toContain('pending');
});

test('[context inference] currency neighbor upgrades amount/tax to float', () => {
  const json = {
    amount: 19.99,
    currency: 'USD',
    tax: 1.5,
  };
  const schema = inferSchema(json);
  // amount と tax は currency が隣にあるので float に昇格されるべき
  expect(schema.fields!.amount.format).toBe('float');
  expect(schema.fields!.tax.format).toBe('float');
});

test('[context inference] lat/lng pair both become float', () => {
  const json = { lat: 35.6895, lon: 139.6917, name: 'Tokyo' };
  const schema = inferSchema(json);
  expect(schema.fields!.lat.format).toBe('float');
  expect(schema.fields!.lon.format).toBe('float');
});

test('[context inference] createdBy next to createdAt becomes uuid format', () => {
  const json = {
    created_at: '2024-01-01T00:00:00Z',
    created_by: 'some-author-id',
  };
  const schema = inferSchema(json);
  expect(schema.fields!.created_by.format).toBe('uuid');
});

test('runEngine returns explicit unsupported target notice', () => {
  const json = { foo: 'bar' };
  const output = runEngine(json, 'does-not-exist', 'does-not-exist', {});

  expect(output).toContain('Unsupported output target');
  expect(output).not.toBe(JSON.stringify(json, null, 2));
});

test('runEngine returns raw JSON for json target', () => {
  const json = { foo: 'bar' };
  const output = runEngine(json, 'json', '', {});

  expect(output).toBe(JSON.stringify(json, null, 2));
});
