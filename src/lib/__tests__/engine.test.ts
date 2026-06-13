import { expect, test } from 'vitest';
import { inferSchema, extractSharedTypes, getDecisions, runEngine } from '../engine';
import { detectRecursiveTypes } from '../recursive';

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

test('inferSchema detects discriminated union in array of objects', () => {
  const json = [
    { type: 'circle', radius: 5 },
    { type: 'circle', radius: 3 },
    { type: 'rect', width: 4, height: 6 },
    { type: 'rect', width: 2, height: 8 },
  ];

  const schema = inferSchema(json);
  expect(schema.type).toBe('array');
  expect(schema.itemType?.discriminatorField).toBe('type');
  const variants = schema.itemType?.discriminatedVariants;
  expect(variants).toBeDefined();
  expect(Object.keys(variants!)).toContain('circle');
  expect(Object.keys(variants!)).toContain('rect');
  // circle variant has radius, not width/height
  expect(variants!.circle.fields?.radius).toBeDefined();
  expect(variants!.circle.fields?.width).toBeUndefined();
  // rect variant has width and height, not radius
  expect(variants!.rect.fields?.width).toBeDefined();
  expect(variants!.rect.fields?.height).toBeDefined();
  expect(variants!.rect.fields?.radius).toBeUndefined();
});

test('inferSchema does NOT flag uniform arrays as discriminated union', () => {
  // All items have the same fields — no structural divergence, so no DU
  const json = [
    { type: 'active', name: 'Alice' },
    { type: 'inactive', name: 'Bob' },
  ];

  const schema = inferSchema(json);
  expect(schema.type).toBe('array');
  expect(schema.itemType?.discriminatorField).toBeUndefined();
});

test('inferSchema does NOT flag sparse/inconsistent data as discriminated union', () => {
  // Only 1 variant-specific field (permissions absent in "user") — below the ≥2 threshold
  const json = [
    { role: 'admin', name: 'Alice', permissions: ['read', 'write'] },
    { role: 'user',  name: 'Bob' },
  ];

  const schema = inferSchema(json);
  expect(schema.type).toBe('array');
  // Should be inferred as a merged interface with optional permissions, not a DU
  expect(schema.itemType?.discriminatorField).toBeUndefined();
  expect(schema.itemType?.fields?.permissions?.optional).toBe(true);
});

test('runEngine prismaGen does NOT add @relation for non-uuid *Id fields', () => {
  // userId is an integer, not a UUID — should not trigger @relation
  const json = {
    users: [{ id: 1, name: 'Alice' }],
    posts: [{ id: 2, title: 'Hello', userId: 1 }],
  };

  const output = runEngine(json, 'sql', '', {});
  // No @relation should be emitted for integer FK
  expect(output).not.toContain('@relation');
});

test('runEngine tsGen output contains discriminated union interfaces', () => {
  const json = [
    { kind: 'dog', breed: 'husky' },
    { kind: 'dog', breed: 'poodle' },
    { kind: 'cat', indoor: true },
    { kind: 'cat', indoor: false },
  ];

  const output = runEngine(json, 'typescript', '', {});
  expect(output).toContain('RootItemDog');
  expect(output).toContain('RootItemCat');
  expect(output).toContain('kind: "dog"');
  expect(output).toContain('kind: "cat"');
  expect(output).toContain('export type RootItem =');
});

test('runEngine prismaGen adds @relation for *Id cross-references', () => {
  const json = {
    users: [{ id: '550e8400-e29b-41d4-a716-446655440000', name: 'Alice' }],
    posts: [{ id: '550e8400-e29b-41d4-a716-446655440001', title: 'Hello', userId: '550e8400-e29b-41d4-a716-446655440000' }],
  };

  const output = runEngine(json, 'sql', '', {});
  // userId field should have an implicit @relation to User
  expect(output).toContain('@relation');
  expect(output).toContain('userId');
});

// ---------------------------------------------------------------------------
// OpenAPI parser tests
// ---------------------------------------------------------------------------
import { isOpenAPISpec, parseOpenAPIComponents } from '../openapi-parser';

test('isOpenAPISpec detects OpenAPI 3.x documents', () => {
  expect(isOpenAPISpec({ openapi: '3.0.0', info: { title: 'Test' } })).toBe(true);
  expect(isOpenAPISpec({ openapi: '3.1.0', paths: {} })).toBe(true);
  expect(isOpenAPISpec({ swagger: '2.0', info: {} })).toBe(true);
});

test('isOpenAPISpec does NOT flag normal JSON as OpenAPI', () => {
  expect(isOpenAPISpec({ id: 1, name: 'Alice' })).toBe(false);
  expect(isOpenAPISpec({ openapi: 'not-a-version', info: {} })).toBe(false);
  expect(isOpenAPISpec(null)).toBe(false);
});

test('parseOpenAPIComponents parses basic object schemas', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test' },
    components: {
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            age: { type: 'integer' },
          },
        },
      },
    },
  };

  const components = parseOpenAPIComponents(spec);
  expect(components).toHaveLength(1);
  const { name, schema } = components[0];
  expect(name).toBe('User');
  expect(schema.type).toBe('object');
  expect(schema.fields?.id.format).toBe('uuid');
  expect(schema.fields?.id.optional).toBeUndefined(); // required field
  expect(schema.fields?.name.optional).toBeUndefined(); // required field
  expect(schema.fields?.email.format).toBe('email');
  expect(schema.fields?.email.optional).toBe(true); // not in required
  expect(schema.fields?.age.type).toBe('number');
  expect(schema.fields?.age.format).toBe('int');
});

test('parseOpenAPIComponents resolves $ref between schemas as named stubs', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test' },
    components: {
      schemas: {
        Address: {
          type: 'object',
          properties: { street: { type: 'string' }, city: { type: 'string' } },
        },
        User: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { $ref: '#/components/schemas/Address' },
          },
        },
      },
    },
  };

  const components = parseOpenAPIComponents(spec);
  const user = components.find(c => c.name === 'User')!;
  // $ref to a known component returns a named stub — no inlined fields,
  // but _sharedTypeName is set so generators emit a classRef to 'Address'
  expect(user.schema.fields?.address.type).toBe('object');
  expect((user.schema.fields?.address as any)._sharedTypeName).toBe('Address');

  // Address component itself IS fully expanded
  const addr = components.find(c => c.name === 'Address')!;
  expect(addr.schema.fields?.street.type).toBe('string');
});

test('runEngine generates TypeScript from OpenAPI spec with correct class names', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test' },
    components: {
      schemas: {
        Pet: {
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            status: { type: 'string', enum: ['available', 'pending', 'sold'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            code: { type: 'integer' },
            message: { type: 'string' },
          },
        },
      },
    },
  };

  const output = runEngine(spec, 'typescript', '', {});
  // Should contain named interfaces matching component names
  expect(output).toContain('interface Pet');
  expect(output).toContain('interface Error');
  // Should NOT contain generic Root prefix
  expect(output).not.toContain('interface RootPet');
  // Status enum
  expect(output).toContain('available');
});

// ---------------------------------------------------------------------------
// JSON Schema parser tests
// ---------------------------------------------------------------------------
import { isJSONSchema, parseJSONSchema } from '../jsonschema-parser';

test('isJSONSchema detects draft-07 and 2020-12 documents', () => {
  expect(isJSONSchema({ $schema: 'http://json-schema.org/draft-07/schema#' })).toBe(true);
  expect(isJSONSchema({ $schema: 'https://json-schema.org/draft/2020-12/schema' })).toBe(true);
  expect(isJSONSchema({ $schema: 'https://json-schema.org/draft/2019-09/schema' })).toBe(true);
});

test('isJSONSchema does NOT flag regular JSON or OpenAPI as JSON Schema', () => {
  expect(isJSONSchema({ id: 1, name: 'Alice' })).toBe(false);
  expect(isJSONSchema({ openapi: '3.0.0', info: {} })).toBe(false);
  expect(isJSONSchema(null)).toBe(false);
});

test('parseJSONSchema parses root schema with title', () => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'User',
    type: 'object',
    required: ['id', 'name'],
    properties: {
      id: { type: 'string', format: 'uuid' },
      name: { type: 'string' },
      age: { type: 'integer' },
      email: { type: 'string', format: 'email' },
    },
  };

  const components = parseJSONSchema(schema);
  expect(components).toHaveLength(1);
  const { name, schema: s } = components[0];
  expect(name).toBe('User');
  expect(s.fields?.id.format).toBe('uuid');
  expect(s.fields?.id.optional).toBeUndefined();
  expect(s.fields?.age.type).toBe('number');
  expect(s.fields?.age.format).toBe('int');
  expect(s.fields?.age.optional).toBe(true);
  expect(s.fields?.email.format).toBe('email');
});

test('parseJSONSchema extracts $defs as named schemas', () => {
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: 'Order',
    type: 'object',
    properties: {
      id: { type: 'string' },
      address: { $ref: '#/$defs/Address' },
    },
    $defs: {
      Address: {
        type: 'object',
        required: ['street'],
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
        },
      },
    },
  };

  const components = parseJSONSchema(schema);
  // Should have Address (from $defs) and Order (root)
  const address = components.find(c => c.name === 'Address')!;
  expect(address).toBeDefined();
  expect(address.schema.fields?.street.type).toBe('string');
  expect(address.schema.fields?.street.optional).toBeUndefined();
  expect(address.schema.fields?.city.optional).toBe(true);

  const order = components.find(c => c.name === 'Order')!;
  expect(order).toBeDefined();
  // $ref to known $def → named stub
  expect((order.schema.fields?.address as any)._sharedTypeName).toBe('Address');
});

test('parseJSONSchema handles nullable via ["string", "null"] type array', () => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Profile',
    type: 'object',
    properties: {
      nickname: { type: ['string', 'null'] },
      score: { type: ['integer', 'null'] },
    },
  };

  const components = parseJSONSchema(schema);
  const { schema: s } = components[0];
  expect(s.fields?.nickname.type).toBe('string');
  expect(s.fields?.nickname.nullable).toBe(true);
  expect(s.fields?.score.type).toBe('number');
  expect(s.fields?.score.nullable).toBe(true);
});

test('runEngine generates TypeScript from JSON Schema with correct interface names', () => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $defs: {
      Address: {
        type: 'object',
        required: ['street'],
        properties: {
          street: { type: 'string' },
          city: { type: 'string' },
        },
      },
      User: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          address: { $ref: '#/$defs/Address' },
        },
      },
    },
  };

  const output = runEngine(schema, 'typescript', '', {});
  expect(output).toContain('interface User');
  expect(output).toContain('interface Address');
  expect(output).not.toContain('interface RootUser');
  expect(output).toContain('address?: Address');
});

// ---------------------------------------------------------------------------
// OpenAPI parser — edge case tests
// ---------------------------------------------------------------------------

test('parseOpenAPIComponents merges fields from allOf', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test' },
    components: {
      schemas: {
        Base: {
          type: 'object',
          properties: { id: { type: 'integer' }, createdAt: { type: 'string', format: 'date-time' } },
        },
        Employee: {
          allOf: [
            { $ref: '#/components/schemas/Base' },
            {
              type: 'object',
              required: ['name'],
              properties: { name: { type: 'string' }, department: { type: 'string' } },
            },
          ],
        },
      },
    },
  };

  const components = parseOpenAPIComponents(spec);
  const emp = components.find(c => c.name === 'Employee')!;
  expect(emp).toBeDefined();
  // allOf expands Base inline — Employee should have id, createdAt, name, department
  expect(emp.schema.fields?.id).toBeDefined();
  expect(emp.schema.fields?.createdAt).toBeDefined();
  expect(emp.schema.fields?.name.optional).toBeUndefined(); // required
  expect(emp.schema.fields?.department.optional).toBe(true);
});

test('parseOpenAPIComponents maps anyOf to union type', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test' },
    components: {
      schemas: {
        StringOrNumber: {
          anyOf: [{ type: 'string' }, { type: 'integer' }],
        },
      },
    },
  };

  const components = parseOpenAPIComponents(spec);
  const s = components[0].schema;
  expect(s.type).toBe('union');
  expect(s.unionTypes).toContain('string');
  expect(s.unionTypes).toContain('number');
});

test('parseOpenAPIComponents handles Swagger 2.0 definitions', () => {
  const spec = {
    swagger: '2.0',
    info: { title: 'Test', version: '1.0' },
    paths: {},
    definitions: {
      Widget: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'integer' },
          label: { type: 'string' },
        },
      },
    },
  };

  const components = parseOpenAPIComponents(spec);
  expect(components).toHaveLength(1);
  expect(components[0].name).toBe('Widget');
  expect(components[0].schema.fields?.id.type).toBe('number');
  expect(components[0].schema.fields?.id.optional).toBeUndefined();
  expect(components[0].schema.fields?.label.optional).toBe(true);
});

test('parseOpenAPIComponents handles nullable and array types', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test' },
    components: {
      schemas: {
        Post: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            deleted_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
  };

  const components = parseOpenAPIComponents(spec);
  const post = components[0].schema;
  expect(post.fields?.tags.type).toBe('array');
  expect(post.fields?.tags.itemType?.type).toBe('string');
  expect(post.fields?.deleted_at.nullable).toBe(true);
  expect(post.fields?.deleted_at.format).toBe('datetime');
});

test('runEngine OpenAPI — secondary schemas omit import header and dep comment', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test' },
    components: {
      schemas: {
        A: { type: 'object', properties: { x: { type: 'string' } } },
        B: { type: 'object', properties: { y: { type: 'integer' } } },
      },
    },
  };

  const output = runEngine(spec, 'typescript', '', {});
  // Header should appear only once
  const headerCount = (output.match(/TypeMorph Generated/g) ?? []).length;
  expect(headerCount).toBe(1);
  // Dep comment should appear only once
  const depCount = (output.match(/npm install typescript/g) ?? []).length;
  expect(depCount).toBe(1);
  // Both interfaces present
  expect(output).toContain('interface A');
  expect(output).toContain('interface B');
});

test('runEngine OpenAPI — Zod output has schema per component without duplicate imports', () => {
  const spec = {
    openapi: '3.0.0',
    info: { title: 'Test' },
    components: {
      schemas: {
        Cat: { type: 'object', properties: { name: { type: 'string' } } },
        Dog: { type: 'object', properties: { breed: { type: 'string' } } },
      },
    },
  };

  const output = runEngine(spec, 'zod', '', {});
  // zod import should appear only once (first schema)
  const importCount = (output.match(/from "zod"/g) ?? []).length;
  expect(importCount).toBe(1);
  // Zod uses camelCase schema names
  expect(output).toContain('catSchema');
  expect(output).toContain('dogSchema');
});

// ---------------------------------------------------------------------------
// JSON Schema parser — edge case tests
// ---------------------------------------------------------------------------

test('parseJSONSchema handles definitions key (Draft 7 style)', () => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Invoice',
    type: 'object',
    properties: {
      lineItem: { $ref: '#/definitions/LineItem' },
    },
    definitions: {
      LineItem: {
        type: 'object',
        required: ['sku'],
        properties: {
          sku: { type: 'string' },
          qty: { type: 'integer' },
        },
      },
    },
  };

  const components = parseJSONSchema(schema);
  const li = components.find(c => c.name === 'LineItem')!;
  expect(li).toBeDefined();
  expect(li.schema.fields?.sku.optional).toBeUndefined();
  expect(li.schema.fields?.qty.format).toBe('int');

  const inv = components.find(c => c.name === 'Invoice')!;
  expect((inv.schema.fields?.lineItem as any)._sharedTypeName).toBe('LineItem');
});

test('parseJSONSchema handles enum and const', () => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Config',
    type: 'object',
    properties: {
      env: { type: 'string', enum: ['dev', 'staging', 'prod'] },
      version: { const: '2.0' },
    },
  };

  const components = parseJSONSchema(schema);
  const { schema: s } = components[0];
  expect(s.fields?.env.enumValues).toEqual(['dev', 'staging', 'prod']);
  expect(s.fields?.version.type).toBe('string');
  expect(s.fields?.version.enumValues).toEqual(['2.0']);
});

test('parseJSONSchema handles allOf field merging', () => {
  const schema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $defs: {
      Named: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      },
      Product: {
        allOf: [
          { $ref: '#/$defs/Named' },
          {
            type: 'object',
            properties: { price: { type: 'number' } },
          },
        ],
      },
    },
  };

  const components = parseJSONSchema(schema);
  const product = components.find(c => c.name === 'Product')!;
  expect(product).toBeDefined();
  // allOf expands Named inline — Product gets name + price
  expect(product.schema.fields?.name).toBeDefined();
  expect(product.schema.fields?.name.optional).toBeUndefined(); // required from Named
  expect(product.schema.fields?.price).toBeDefined();
});

test('parseJSONSchema handles anyOf with null (nullable pattern)', () => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: 'Event',
    type: 'object',
    properties: {
      endDate: { anyOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }] },
    },
  };

  const components = parseJSONSchema(schema);
  const { schema: s } = components[0];
  expect(s.fields?.endDate.type).toBe('string');
  expect(s.fields?.endDate.format).toBe('datetime');
  expect(s.fields?.endDate.nullable).toBe(true);
});

test('runEngine JSON Schema — Zod output uses correct schema names', () => {
  const schema = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    $defs: {
      Tag: {
        type: 'object',
        properties: { id: { type: 'integer' }, label: { type: 'string' } },
      },
    },
  };

  const output = runEngine(schema, 'zod', '', {});
  // Zod uses camelCase schema names
  expect(output).toContain('tagSchema');
  expect(output).not.toContain('rootTagSchema');
});

// ---------------------------------------------------------------------------
// Recursive type detection tests
// ---------------------------------------------------------------------------

test('detectRecursiveTypes marks nested object as named stub when field sets match', () => {
  const json = {
    id: 1,
    name: 'root',
    children: [{ id: 2, name: 'child', children: [] }],
  };
  const schema = inferSchema(json);
  detectRecursiveTypes(schema, 'Root');

  // children.itemType should now be a stub pointing to Root
  const childrenItem = (schema.fields!.children as any).itemType;
  expect((childrenItem as any)._sharedTypeName).toBe('Root');
  expect(childrenItem.fields).toBeUndefined();
});

test('detectRecursiveTypes handles array-root recursive items', () => {
  const json = [
    { id: 1, label: 'a', children: [{ id: 2, label: 'b', children: [] }] },
  ];
  const schema = inferSchema(json);
  detectRecursiveTypes(schema, 'Root');

  // schema is array, itemType is RootItem
  const item = schema.itemType!;
  const childItem = (item.fields!.children as any).itemType;
  expect((childItem as any)._sharedTypeName).toBe('RootItem');
});

test('detectRecursiveTypes handles left/right binary tree', () => {
  const json = {
    value: 1,
    left:  { value: 2, left: null, right: null },
    right: { value: 3, left: null, right: null },
  };
  const schema = inferSchema(json);
  detectRecursiveTypes(schema, 'Root');

  // left and right are objects with same fields as Root → stubs
  expect((schema.fields!.left as any)._sharedTypeName).toBe('Root');
  expect((schema.fields!.right as any)._sharedTypeName).toBe('Root');
});

test('detectRecursiveTypes does NOT mark unrelated similar schemas', () => {
  // Two objects at different levels with completely different fields
  const json = {
    user: { id: 1, email: 'a@b.com' },
    post: { title: 'Hello', body: 'World' },
  };
  const schema = inferSchema(json);
  detectRecursiveTypes(schema, 'Root');

  // user and post should NOT be marked as recursive references to Root
  expect((schema.fields!.user as any)._sharedTypeName).toBeUndefined();
  expect((schema.fields!.post as any)._sharedTypeName).toBeUndefined();
});

test('runEngine generates self-referential TypeScript interface for tree JSON', () => {
  const json = {
    id: 1,
    name: 'root',
    children: [{ id: 2, name: 'child', children: [] }],
  };
  const output = runEngine(json, 'typescript', '', {});

  // Should use Root as the type for children items (required — always present in test JSON)
  expect(output).toContain('children: Root[]');
  // Should NOT generate a separate RootChildrenItem interface
  expect(output).not.toContain('RootChildrenItem');
});

test('runEngine generates self-referential interface for binary tree', () => {
  const json = {
    value: 10,
    left:  { value: 5, left: null, right: null },
    right: { value: 15, left: null, right: null },
  };
  const output = runEngine(json, 'typescript', '', {});

  // left and right should reference Root (required — always present in test JSON)
  expect(output).toContain('left: Root');
  expect(output).toContain('right: Root');
  expect(output).not.toContain('interface RootLeft');
  expect(output).not.toContain('interface RootRight');
});

test('runEngine does not flag non-recursive JSON as recursive', () => {
  const json = {
    user: { id: 1, email: 'a@b.com', name: 'Alice' },
    settings: { theme: 'dark', lang: 'en', notify: true },
  };
  const output = runEngine(json, 'typescript', '', {});

  // Both should generate their own interfaces, not collapse into Root
  expect(output).toContain('interface RootUser');
  expect(output).toContain('interface RootSettings');
});
