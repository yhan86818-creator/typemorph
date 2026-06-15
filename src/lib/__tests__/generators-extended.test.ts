import { describe, it, expect } from 'vitest';
import { avroGen, mongooseGen, openApiGen, valibotGen, yupGen, typeormGen, drizzleGen, kyselyGen, bigQueryGen, dynamoDBGen, sqlToMermaidERGen, apiRouteGen, reactHookGen, envValidatorGen, haskellGen, mermaidERGen, piniaStoreGen, sveltePropsGen, djangoGen } from '../generators-extended';
import { mockGen } from '../generators';
import { inferSchema } from '../engine';
import { Schema } from '../types';

describe('generators-extended', () => {
  describe('avroGen', () => {
    it('should generate valid Apache Avro schema', () => {
      const json = { id: 1, name: 'Alice', active: true };
      const schema = inferSchema(json);
      const result = avroGen.generate(schema, 'Root');
      expect(result).toContain('"type": "record"');
      expect(result).toMatch(/"name": "id",\s*"type": "double"/);
      expect(result).toMatch(/"name": "name",\s*"type": "string"/);
    });
  });

  describe('Generators Extended - Complex Types', () => {
    const schema: Schema = {
      type: 'object',
      fields: {
        status: {
          type: 'string',
          enumValues: ['active', 'inactive', 'pending'],
          optional: false,
          nullable: true,
        },
        mixedData: {
          type: 'union',
          unionTypes: ['string', 'number'],
          optional: true,
        }
      }
    };

    it('Mongoose should generate enum and Mixed type for unions', () => {
      const result = mongooseGen.generate(schema, 'User');
      expect(result).toContain("enum: [\"active\", \"inactive\", \"pending\"]");
      expect(result).toContain("mixedData: { type: Schema.Types.Mixed }");
    });

    it('OpenAPI should generate enum, oneOf, and nullable', () => {
      const result = openApiGen.generate(schema, 'User');
      expect(result).toMatch(/enum:\s+- active\s+- inactive\s+- pending/);
      expect(result).toContain('nullable: true');
      expect(result).toMatch(/anyOf:\s+- type: string\s+- type: number/);
    });

    it('Valibot should generate picklist for enums and union for unions', () => {
      const result = valibotGen.generate(schema, 'User');
      expect(result).toContain('v.picklist(["active", "inactive", "pending"])');
      expect(result).toContain('v.union([v.literal("string"), v.literal("number")])');
      expect(result).toContain('v.nullable');
    });

    it('Yup should generate oneOf and mixed for unions', () => {
      const result = yupGen.generate(schema, 'User');
      expect(result).toContain('yup.string().oneOf(["active", "inactive", "pending"])');
      // Union of multiple types → yup.mixed() is correct.
      // Previously generated yup.mixed().oneOf(["string","number"]) which is wrong:
      // oneOf() checks actual values, not types — passing type name strings is meaningless.
      expect(result).toContain('yup.mixed()');
      expect(result).not.toContain('yup.mixed().oneOf(["string"');
    });
  });

  describe('mongooseGen', () => {
    it('should generate valid Mongoose schema definition', () => {
      const json = { title: 'Hello', views: 100 };
      const schema = inferSchema(json);
      const result = mongooseGen.generate(schema, 'Root');
      expect(result).toContain('const RootSchema = new Schema({');
      expect(result).toContain('title: { type: String, required: true }');
      expect(result).toContain('views: { type: Number, required: true }');
    });

    // Regression: union/any array items must use Schema.Types.Mixed, not String
    it('[regression] should use Schema.Types.Mixed for union-typed array items', () => {
      const schema: Schema = {
        type: 'object',
        fields: {
          tags: {
            type: 'array',
            itemType: { type: 'union', unionTypes: ['string', 'number'] },
          },
          data: {
            type: 'array',
            itemType: { type: 'any' },
          },
        },
      };
      const result = mongooseGen.generate(schema, 'Root');
      expect(result).toContain('[Schema.Types.Mixed]'); // tags
      expect(result).toContain('[Schema.Types.Mixed]'); // data
      expect(result).not.toMatch(/tags:\s*\[String\]/); // must NOT fall through to String
    });
  });

  describe('openApiGen', () => {
    it('should generate valid OpenAPI 3.0 component schema', () => {
      const json = { email: 'test@example.com' };
      const schema = inferSchema(json);
      const result = openApiGen.generate(schema, 'Root');
      expect(result).toContain('openapi: 3.0.3');
      expect(result).toContain('Root:');
      expect(result).toContain('format: email');
    });
  });

  describe('yupGen', () => {
    // Regression: 'any' type schema must emit yup.mixed(), not the non-existent yup.any()
    it('[regression] should emit yup.mixed() for any-typed fields, not yup.any()', () => {
      const schema: Schema = {
        type: 'object',
        fields: {
          payload: { type: 'any', optional: true },
        },
      };
      const result = yupGen.generate(schema, 'root');
      expect(result).toContain('yup.mixed()');
      expect(result).not.toContain('yup.any()');
    });
  });

  describe('typeormGen', () => {
    // Regression: nullable enum fields must have nullable:true inside @Column decorator
    it('[regression] should inject nullable:true into @Column for nullable enum fields', () => {
      const schema: Schema = {
        type: 'object',
        fields: {
          status: {
            type: 'string',
            enumValues: ['active', 'inactive'],
            optional: false,
            nullable: true,
          },
        },
      };
      const result = typeormGen.generate(schema, 'Order');
      // The @Column decorator must contain both type:'enum' and nullable:true
      expect(result).toContain("type: 'enum'");
      expect(result).toContain('nullable: true');
      // The TS field type must also carry | null
      expect(result).toContain('| null');
    });

    it('should NOT add nullable:true for non-nullable enum fields', () => {
      const schema: Schema = {
        type: 'object',
        fields: {
          role: {
            type: 'string',
            enumValues: ['admin', 'user'],
            optional: false,
            nullable: false,
          },
        },
      };
      const result = typeormGen.generate(schema, 'User');
      expect(result).toContain("type: 'enum'");
      expect(result).not.toContain('nullable: true');
    });

    it('[regression] should not duplicate boilerplate columns like id and createdAt', () => {
      // If the schema already has an 'id' and 'createdAt', generators shouldn't blindly append them again.
      const schema: Schema = {
        type: 'object',
        fields: {
          id: { type: 'string' },
          createdAt: { type: 'string', format: 'datetime' },
        },
      };

      const typeormOut = typeormGen.generate(schema, 'User');
      // Should only have one PrimaryGeneratedColumn
      expect((typeormOut.match(/id!?: string;/g) || []).length).toBe(1);
      expect((typeormOut.match(/createdAt!?: Date;/g) || []).length).toBe(1);

      const drizzleOut = drizzleGen.generate(schema, 'User');
      // Should not have multiple 'id' or 'createdAt' declarations
      expect((drizzleOut.match(/id:/g) || []).length).toBe(1);
      expect((drizzleOut.match(/createdAt:/g) || []).length).toBe(1);
    });

    it('[regression] nullable non-enum field uses @Column({ type, nullable: true }) not replace hack', () => {
      const schema: Schema = {
        type: 'object',
        fields: { score: { type: 'number', nullable: true } },
      };
      const out = typeormGen.generate(schema, 'Result');
      expect(out).toContain("@Column({ type: 'double', nullable: true })");
      expect(out).not.toMatch(/@Column\('[^']+',\s*nullable/);
    });

    it('kyselyGen should generate sub-interfaces for nested objects and list them in Database', () => {
      const json = { id: 1, name: 'Alice', address: { city: 'Tokyo', zip: '150' } };
      const out = kyselyGen.generate(inferSchema(json), 'User');
      expect(out).toContain('export interface Address');
      expect(out).toContain('city: string');
      expect(out).toContain('address: Address');
      expect(out).toContain('address: Address');
    });

    it('[regression] drizzleGen should never produce a trailing comma before })', () => {
      const cases = [
        { id: 1, name: 'Alice' },
        { id: 1, name: 'Alice', createdAt: '2024-01-01T00:00:00Z' },
        { id: 1, name: 'Alice', updatedAt: '2024-01-01T00:00:00Z' },
        { id: 1, name: 'Alice', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' },
        { name: 'Alice' },
      ];
      for (const json of cases) {
        const out = drizzleGen.generate(inferSchema(json), 'Root');
        expect(out).not.toMatch(/,\s*\n\s*\}\)/);
      }
    });
  });

  describe('bigQueryGen', () => {
    it('should expand nested objects as RECORD type', () => {
      const json = { user: { id: 1, name: 'Alice', address: { city: 'Tokyo', zip: '150-0002' } } };
      const schema = inferSchema(json);
      const result = bigQueryGen.generate(schema);
      const parsed = JSON.parse(result);
      // user should be a RECORD with nested fields
      const userField = parsed.find((f: any) => f.name === 'user');
      expect(userField).toBeDefined();
      expect(userField.type).toBe('RECORD');
      expect(userField.fields).toBeDefined();
      expect(userField.fields.length).toBeGreaterThanOrEqual(3);
      // address should be a nested RECORD inside user
      const addrField = userField.fields.find((f: any) => f.name === 'address');
      expect(addrField).toBeDefined();
      expect(addrField.type).toBe('RECORD');
      expect(addrField.fields).toBeDefined();
      expect(addrField.fields.find((f: any) => f.name === 'city')).toBeDefined();
    });

    it('should expand arrays as REPEATED RECORD', () => {
      const json = { items: [{ id: 1, name: 'Item A', price: 19.99 }] };
      const schema = inferSchema(json);
      const result = bigQueryGen.generate(schema);
      const parsed = JSON.parse(result);
      const itemsField = parsed.find((f: any) => f.name === 'items');
      expect(itemsField).toBeDefined();
      expect(itemsField.mode).toBe('REPEATED');
      expect(itemsField.type).toBe('RECORD');
      expect(itemsField.fields).toBeDefined();
      expect(itemsField.fields.find((f: any) => f.name === 'name')).toBeDefined();
    });
  });

  describe('dynamoDBGen', () => {
    it('should expand nested objects as M with nested keys', () => {
      const json = { user: { id: 1, name: 'Alice', address: { city: 'Tokyo' } } };
      const schema = inferSchema(json);
      const result = dynamoDBGen.generate(schema, 'Root');
      const parsed = JSON.parse(result);
      expect(parsed.Item.user.M).toBeDefined();
      expect(parsed.Item.user.M.id.N).toBe('0');
      expect(parsed.Item.user.M.name.S).toBeDefined();
      // address should be a nested M inside user
      expect(parsed.Item.user.M.address.M).toBeDefined();
      expect(parsed.Item.user.M.address.M.city.S).toBeDefined();
    });

    it('should expand arrays as L with nested items', () => {
      const json = { items: [{ id: 1, name: 'Item A' }] };
      const schema = inferSchema(json);
      const result = dynamoDBGen.generate(schema, 'Root');
      const parsed = JSON.parse(result);
      expect(parsed.Item.items.L).toBeDefined();
      expect(Array.isArray(parsed.Item.items.L)).toBe(true);
      expect(parsed.Item.items.L.length).toBeGreaterThanOrEqual(1);
      expect(parsed.Item.items.L[0].M).toBeDefined();
      expect(parsed.Item.items.L[0].M.id.N).toBe('0');
      expect(parsed.Item.items.L[0].M.name.S).toBeDefined();
    });
  });

  describe('mockGen', () => {
    it('should generate context-aware mock values for nested arrays', () => {
      const json = { items: [{ id: 1, name: 'Item A', price: 19.99 }] };
      const schema = inferSchema(json);
      const result = mockGen.generate(schema);
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed.items)).toBe(true);
      expect(parsed.items.length).toBeGreaterThanOrEqual(2);
      // items[].name should be item-like (e.g. "Item A"), not a person name
      for (const item of parsed.items) {
        expect(item.name).toMatch(/^Item /);
      }
      // items[].id should be incrementing
      expect(parsed.items[0].id).toBe(1);
      expect(parsed.items[1].id).toBe(2);
    });

    it('should generate role-like values for role/status/type keys', () => {
      const json = { role: 'admin', status: 'active', type: 'premium' };
      const schema = inferSchema(json);
      const result = mockGen.generate(schema);
      const parsed = JSON.parse(result);
      const validRoles = ['admin', 'user', 'guest', 'moderator'];
      expect(validRoles).toContain(parsed.role);
      expect(validRoles).toContain(parsed.status);
      expect(validRoles).toContain(parsed.type);
    });

    it('should generate realistic address-related mock values', () => {
      const json = { street: 'Shibuya', zip: '150-0002', city: 'Tokyo' };
      const schema = inferSchema(json);
      const result = mockGen.generate(schema);
      const parsed = JSON.parse(result);
      expect(parsed.street).toBe('123 Main Street');
      expect(parsed.zip).toBe('100-0001');
      expect(parsed.city).toBe('Tokyo');
    });
  });

  describe('sqlToMermaidERGen', () => {
    it('should generate erDiagram for single table', () => {
      const sql = `
        CREATE TABLE users (
          id UUID PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL
        );
      `;
      const result = sqlToMermaidERGen.generate(sql);
      expect(result).toContain('erDiagram');
      expect(result).toContain('users');
      expect(result).toContain('id PK');
      expect(result).toContain('name');
      expect(result).toContain('email');
    });

    it('should detect FOREIGN KEY relations', () => {
      const sql = `
        CREATE TABLE users (id UUID PRIMARY KEY);
        CREATE TABLE posts (
          id UUID PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES users(id)
        );
      `;
      const result = sqlToMermaidERGen.generate(sql);
      expect(result).toContain('posts');
      expect(result).toContain('users');
      expect(result).toContain('user_id');
    });

    it('should return placeholder for non-SQL input', () => {
      const result = sqlToMermaidERGen.generate('{ "not": "sql" }');
      expect(result).toContain('erDiagram');
      expect(result).toContain('%%');
    });
  });

  describe('apiRouteGen', () => {
    it('should generate Next.js API Route with GET and POST', () => {
      const schema = inferSchema({ name: 'Alice', email: 'a@example.com' });
      const result = apiRouteGen.generate(schema, 'User');
      expect(result).toContain('NextRequest');
      expect(result).toContain('NextResponse');
      expect(result).toContain('export async function GET');
      expect(result).toContain('export async function POST');
      expect(result).toContain('UserSchema');
    });
  });

  describe('apiRouteGen — semantic Zod validators', () => {
    it('applies .uuid() to id and _id FK fields', () => {
      const schema = inferSchema({
        id: '550e8400-e29b-41d4-a716-446655440000',
        user_id: '550e8400-e29b-41d4-a716-000000000001',
      });
      const result = apiRouteGen.generate(schema, 'Post');
      expect(result).toContain('id: z.string().uuid()');
      expect(result).toContain('user_id: z.string().uuid()');
    });

    it('applies .email() to email field', () => {
      const schema = inferSchema({ email: 'test@example.com' });
      const result = apiRouteGen.generate(schema, 'User');
      expect(result).toContain('email: z.string().email()');
    });

    it('applies .url() to url/link/website fields', () => {
      const schema = inferSchema({ profile_url: 'https://example.com', website: 'https://example.com' });
      if (schema.fields?.profile_url) schema.fields.profile_url.format = undefined;
      if (schema.fields?.website) schema.fields.website.format = undefined;
      const result = apiRouteGen.generate(schema, 'User');
      expect(result).toContain('profile_url: z.string().url()');
      expect(result).toContain('website: z.string().url()');
    });

    it('applies .int().min(0).max(150) to age field', () => {
      const schema = inferSchema({ age: 28 });
      const result = apiRouteGen.generate(schema, 'User');
      expect(result).toContain('age: z.number().int().min(0).max(150)');
    });

    it('applies .min(0) to price and amount fields', () => {
      const schema = inferSchema({ price: 99.9, amount: 100 });
      const result = apiRouteGen.generate(schema, 'Order');
      expect(result).toContain('price: z.number().min(0)');
      expect(result).toContain('amount: z.number().min(0)');
    });

    it('applies .min(1).trim() to required name field', () => {
      const schema = inferSchema({ username: 'alice' });
      const result = apiRouteGen.generate(schema, 'User');
      expect(result).toContain('username: z.string().min(1).trim()');
    });

    it('applies .datetime() to fields inferred as datetime format', () => {
      const schema = inferSchema({ created_at: '2024-01-01T00:00:00Z' });
      const result = apiRouteGen.generate(schema, 'Post');
      expect(result).toContain('created_at: z.string().datetime()');
    });

    it('applies z.boolean() to boolean fields', () => {
      const schema = inferSchema({ is_active: true });
      const result = apiRouteGen.generate(schema, 'User');
      expect(result).toContain('is_active: z.boolean()');
    });
  });

  describe('mermaidERGen', () => {
    it('generates basic erDiagram with correct field types', () => {
      const schema = inferSchema({ id: '1', name: 'Alice', age: 30 });
      const result = mermaidERGen.generate(schema, 'User');
      expect(result).toContain('erDiagram');
      expect(result).toContain('User {');
      expect(result).toContain('string name');
      expect(result).toContain('float age');
    });

    it('[FK inference] detects _id suffix and emits }o--|| reference', () => {
      const schema = inferSchema({ id: '1', user_id: '2', title: 'Post' });
      const result = mermaidERGen.generate(schema, 'Post');
      expect(result).toContain('User {');
      expect(result).toContain('Post }o--|| User : "references"');
    });

    it('[FK inference] detects camelCase Id suffix and emits }o--|| reference', () => {
      const schema = inferSchema({ id: '1', authorId: '2', content: 'text' });
      const result = mermaidERGen.generate(schema, 'Post');
      expect(result).toContain('Author {');
      expect(result).toContain('Post }o--|| Author : "references"');
    });

    it('[FK inference] bare id field does NOT generate a self-reference', () => {
      const schema = inferSchema({ id: '1', title: 'Post' });
      const result = mermaidERGen.generate(schema, 'Post');
      expect(result).not.toContain('}o--||');
    });

    it('emits ||--o{ for nested object children', () => {
      const schema = inferSchema({ id: '1', address: { city: 'Tokyo', zip: '100-0001' } });
      const result = mermaidERGen.generate(schema, 'User');
      expect(result).toContain('Address {');
      expect(result).toContain('User ||--o{ Address : "has"');
    });
  });

  describe('sveltePropsGen', () => {
    it('required fields have type-based defaults (no bare declarations)', () => {
      const json = { name: 'Alice', age: 30, active: true };
      const out = sveltePropsGen.generate(inferSchema(json), 'Card');
      expect(out).toContain("export let name: string = '';");
      expect(out).toContain('export let age: number = 0;');
      expect(out).toContain('export let active: boolean = false;');
    });

    it('optional fields use undefined default', () => {
      const rows = [{ id: 1, nickname: 'Alice' }, { id: 2 }];
      const out = sveltePropsGen.generate(inferSchema(rows), 'Card');
      expect(out).toContain('export let id: number = 0;');
      expect(out).toContain('export let nickname: string | undefined = undefined;');
    });
  });

  describe('piniaStoreGen', () => {
    it('update action uses Partial<XxxState> — not ReturnType<typeof this.$state>', () => {
      const schema = inferSchema({ id: '1', name: 'Alice', email: 'a@b.com' });
      const result = piniaStoreGen.generate(schema, 'User');
      expect(result).toContain('update(data: Partial<UserState>)');
      expect(result).not.toContain('ReturnType<typeof this.$state>');
    });

    it('uses Object.assign(this, data) — not Object.assign(this.$state, data)', () => {
      const schema = inferSchema({ id: '1', name: 'Alice' });
      const result = piniaStoreGen.generate(schema, 'Item');
      expect(result).toContain('Object.assign(this, data)');
      expect(result).not.toContain('Object.assign(this.$state, data)');
    });

    it('generates correct initial state values per type', () => {
      const schema = inferSchema({ id: '1', name: 'Alice', count: 5, active: true });
      const result = piniaStoreGen.generate(schema, 'Counter');
      expect(result).toContain("id: '' as string");
      expect(result).toContain("name: '' as string");
      expect(result).toContain("count: 0 as number");
      expect(result).toContain("active: false as boolean");
    });
  });

  describe('reactHookGen', () => {
    it('should generate React Query hooks', () => {
      const schema = inferSchema({ name: 'Alice', email: 'a@example.com' });
      const result = reactHookGen.generate(schema, 'User');
      expect(result).toContain('useQuery');
      expect(result).toContain('useMutation');
      expect(result).toContain('useUserList');
      expect(result).toContain('useUserCreate');
      expect(result).toContain('useUserDelete');
    });
  });

  describe('envValidatorGen', () => {
    const envSchema = {
      type: 'object' as const,
      fields: {
        DATABASE_URL: { type: 'string' as const, format: 'url' as const },
        PORT:         { type: 'number' as const, format: 'int' as const },
        DEBUG:        { type: 'boolean' as const },
        API_KEY:      { type: 'string' as const },
        ADMIN_EMAIL:  { type: 'string' as const, format: 'email' as const },
        OPTIONAL_VAR: { type: 'string' as const, optional: true },
      },
    };

    it('generates z.coerce.number().int() for integer fields', () => {
      const result = envValidatorGen.generate(envSchema);
      expect(result).toContain('PORT: z.coerce.number().int()');
    });

    it('generates z.enum transform for boolean fields', () => {
      const result = envValidatorGen.generate(envSchema);
      expect(result).toContain('DEBUG: z.enum(["true", "false"]).transform');
    });

    it('generates z.string().url() for url fields', () => {
      const result = envValidatorGen.generate(envSchema);
      expect(result).toContain('DATABASE_URL: z.string().url()');
    });

    it('generates z.string().email() for email fields', () => {
      const result = envValidatorGen.generate(envSchema);
      expect(result).toContain('ADMIN_EMAIL: z.string().email()');
    });

    it('generates .optional() for optional fields', () => {
      const result = envValidatorGen.generate(envSchema);
      expect(result).toContain('OPTIONAL_VAR: z.string().optional()');
    });

    it('includes envSchema.parse(process.env) at the end', () => {
      const result = envValidatorGen.generate(envSchema);
      expect(result).toContain('envSchema.parse(process.env)');
    });

    it('returns empty string for empty schema', () => {
      expect(envValidatorGen.generate({ type: 'object', fields: {} })).toBe('');
    });
  });

  describe('haskellGen', () => {
    const schema: Schema = {
      type: 'object',
      fields: {
        userId:    { type: 'string' },
        itemCount: { type: 'number', format: 'int' },
        price:     { type: 'number' },
        isActive:  { type: 'boolean' },
        email:     { type: 'string', optional: true },
      },
    };

    it('uses camelCase for record field names (not snake_case)', () => {
      const result = haskellGen.generate(schema, 'Order');
      expect(result).toContain('userId ::');
      expect(result).toContain('itemCount ::');
      expect(result).not.toMatch(/user_id\s*::/);
      expect(result).not.toMatch(/item_count\s*::/);
    });

    it('uses Int for integer fields, Double for float', () => {
      const result = haskellGen.generate(schema, 'Order');
      expect(result).toContain('itemCount :: Int');
      expect(result).toContain('price :: Double');
    });

    it('wraps optional fields in Maybe', () => {
      const result = haskellGen.generate(schema, 'Order');
      expect(result).toContain('email :: Maybe String');
    });

    it('includes DeriveGeneric and Aeson instances', () => {
      const result = haskellGen.generate(schema, 'Order');
      expect(result).toContain('DeriveGeneric');
      expect(result).toContain('instance FromJSON');
      expect(result).toContain('instance ToJSON');
    });
  });

  describe('djangoGen', () => {
    it('[regression] optional number/json fields must not produce leading comma', () => {
      const rows = [{ id: 1, score: 9.5, meta: {} }, { id: 2 }];
      const out = djangoGen.generate(inferSchema(rows), 'Result');
      expect(out).not.toMatch(/FloatField\(,/);
      expect(out).not.toMatch(/JSONField\(,/);
      expect(out).toContain('models.FloatField(null=True, blank=True)');
      expect(out).toContain('models.JSONField(null=True, blank=True)');
    });

    it('optional boolean uses BooleanField(null=True, blank=True)', () => {
      const rows = [{ active: true }, {}];
      const out = djangoGen.generate(inferSchema(rows), 'Flag');
      expect(out).toContain('models.BooleanField(null=True, blank=True)');
    });

    it('required fields have no null=True', () => {
      const out = djangoGen.generate(inferSchema({ name: 'Alice', age: 30 }), 'User');
      expect(out).toContain('models.CharField(max_length=255)');
      expect(out).toContain('models.FloatField()');
      expect(out).not.toContain('null=True');
    });
  });
});
