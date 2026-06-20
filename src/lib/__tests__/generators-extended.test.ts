import { describe, it, expect } from 'vitest';
import { avroGen, mongooseGen, openApiGen, valibotGen, yupGen, typeormGen, drizzleGen, kyselyGen, bigQueryGen, dynamoDBGen, sqlToMermaidERGen, apiRouteGen, reactHookGen, envValidatorGen, haskellGen, mermaidERGen, piniaStoreGen, sveltePropsGen, djangoGen, mcpToolGen, openAiFunctionGen, vercelAiToolGen } from '../generators-extended';
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
      // union は型名なので型バリデータを使う（v.literal はリテラル値用なので誤り）
      expect(result).toContain('v.union([v.string(), v.number()])');
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

  describe('drizzleGen', () => {
    // ── Column type mapping ───────────────────────────────────────────────

    it('maps integer numbers to integer()', () => {
      const out = drizzleGen.generate(inferSchema({ age: 25, count: 0 }), 'Item');
      expect(out).toContain("integer('age').notNull()");
      expect(out).toContain("integer('count').notNull()");
      expect(out).not.toContain('doublePrecision');
    });

    it('maps float numbers to real()', () => {
      const out = drizzleGen.generate(inferSchema({ score: 4.5, weight: 72.3 }), 'Item');
      expect(out).toContain("real('score').notNull()");
      expect(out).toContain("real('weight').notNull()");
    });

    it('maps price/amount/cost/fee/total/balance fields to numeric(10,2)', () => {
      const out = drizzleGen.generate(inferSchema({ price: 9.99, amount: 100.5, totalCost: 50.0, balance: 0.0 }), 'Order');
      expect(out).toContain("numeric('price', { precision: 10, scale: 2 })");
      expect(out).toContain("numeric('amount', { precision: 10, scale: 2 })");
      expect(out).toContain("numeric('total_cost', { precision: 10, scale: 2 })");
      expect(out).toContain("numeric('balance', { precision: 10, scale: 2 })");
    });

    it('maps email fields to varchar(255).unique()', () => {
      const out = drizzleGen.generate(inferSchema({ email: 'a@b.com', userEmail: 'a@b.com' }), 'User');
      expect(out).toContain("varchar('email', { length: 255 }).notNull().unique()");
      expect(out).toContain("varchar('user_email', { length: 255 }).notNull().unique()");
    });

    it('maps bio/description/content/body/note fields to text()', () => {
      const out = drizzleGen.generate(inferSchema({ bio: 'hello', description: 'x', content: 'y', body: 'z', note: 'n' }), 'Post');
      expect(out).toContain("text('bio')");
      expect(out).toContain("text('description')");
      expect(out).toContain("text('content')");
      expect(out).toContain("text('body')");
      expect(out).toContain("text('note')");
    });

    it('maps url/link/website/href fields to text()', () => {
      const out = drizzleGen.generate(inferSchema({ website: 'https://x.com', avatarUrl: 'https://x.com/img.png' }), 'Profile');
      expect(out).toContain("text('website')");
      expect(out).toContain("text('avatar_url')");
    });

    it('maps required boolean to boolean().notNull().default(false)', () => {
      const out = drizzleGen.generate(inferSchema({ published: false }), 'Post');
      expect(out).toContain("boolean('published').notNull().default(false)");
    });

    it('maps is_active/active/enabled to boolean().default(true)', () => {
      const out = drizzleGen.generate(
        inferSchema({ isActive: true, active: true, enabled: true }),
        'User',
      );
      expect(out).toContain("boolean('is_active').notNull().default(true)");
      expect(out).toContain("boolean('active').notNull().default(true)");
      expect(out).toContain("boolean('enabled').notNull().default(true)");
    });

    it('maps datetime-format strings to timestamp({ withTimezone: true })', () => {
      const out = drizzleGen.generate(inferSchema({ publishedAt: '2024-01-01T00:00:00Z' }), 'Post');
      expect(out).toContain("timestamp('published_at', { withTimezone: true })");
    });

    it('maps nested objects and arrays to jsonb()', () => {
      const out = drizzleGen.generate(inferSchema({ meta: { key: 'val' }, tags: ['a', 'b'] }), 'Post');
      expect(out).toContain("jsonb('meta')");
      expect(out).toContain("jsonb('tags')");
      expect(out).toContain('consider extracting to separate tables');
    });

    // ── Primary key ───────────────────────────────────────────────────────

    it('auto-injects uuid primary key when no id field', () => {
      const out = drizzleGen.generate(inferSchema({ name: 'Alice' }), 'User');
      expect(out).toContain("uuid('id').defaultRandom().primaryKey()");
      expect((out.match(/id:/g) || []).length).toBe(1);
    });

    it('uses serial().primaryKey() when id is a number', () => {
      const out = drizzleGen.generate(inferSchema({ id: 1, name: 'Alice' }), 'User');
      expect(out).toContain("serial('id').primaryKey()");
      expect(out).not.toContain("uuid('id')");
    });

    it('uses uuid().defaultRandom().primaryKey() when id is a string', () => {
      const out = drizzleGen.generate(inferSchema({ id: 'abc-123', name: 'Alice' }), 'User');
      expect(out).toContain("uuid('id').defaultRandom().primaryKey()");
    });

    it('treats userId/teamId as foreign key uuid columns, not primary key', () => {
      const out = drizzleGen.generate(inferSchema({ userId: 'abc', teamId: 'def', name: 'Alice' }), 'Member');
      expect(out).toContain("uuid('user_id')");
      expect(out).toContain("uuid('team_id')");
      // userId/teamId must not get primaryKey; only the auto-injected id does
      expect(out).not.toMatch(/user_id.*primaryKey/);
      expect(out).not.toMatch(/team_id.*primaryKey/);
    });

    // ── Enum ─────────────────────────────────────────────────────────────

    it('generates pgEnum and uses it as column type', () => {
      const schema: Schema = {
        type: 'object',
        fields: {
          role: { type: 'string', enumValues: ['admin', 'user', 'guest'], optional: false, nullable: false },
        },
      };
      const out = drizzleGen.generate(schema, 'User');
      expect(out).toContain("pgEnum");
      expect(out).toContain("'admin', 'user', 'guest'");
      expect(out).toContain("roleEnum('role')");
      expect(out).toContain("import { pgTable, pgEnum");
    });

    // ── Auto-inject createdAt / updatedAt ────────────────────────────────

    it('auto-injects createdAt and updatedAt when absent', () => {
      const out = drizzleGen.generate(inferSchema({ name: 'Alice' }), 'User');
      expect(out).toContain("createdAt: timestamp('created_at'");
      expect(out).toContain("updatedAt: timestamp('updated_at'");
      expect(out).toContain('.defaultNow().notNull()');
    });

    it('does not duplicate createdAt/updatedAt when already present', () => {
      const json = { id: 1, name: 'x', createdAt: '2024-01-01T00:00:00Z', updatedAt: '2024-01-01T00:00:00Z' };
      const out = drizzleGen.generate(inferSchema(json), 'User');
      expect((out.match(/createdAt:/g) || []).length).toBe(1);
      expect((out.match(/updatedAt:/g) || []).length).toBe(1);
    });

    // ── Type exports ─────────────────────────────────────────────────────

    it('exports $inferSelect and $inferInsert types', () => {
      const out = drizzleGen.generate(inferSchema({ name: 'Alice' }), 'User');
      expect(out).toContain('export type User = typeof user.$inferSelect;');
      expect(out).toContain('export type NewUser = typeof user.$inferInsert;');
    });

    // ── Imports ───────────────────────────────────────────────────────────

    it('only imports used column types', () => {
      const out = drizzleGen.generate(inferSchema({ name: 'Alice', age: 30 }), 'User');
      expect(out).toContain('integer');
      expect(out).toContain('varchar');
      expect(out).not.toContain('doublePrecision');
      expect(out).not.toContain('jsonb');
      expect(out).not.toContain('real');
    });

    it('does not import pgEnum when no enum fields', () => {
      const out = drizzleGen.generate(inferSchema({ name: 'Alice' }), 'User');
      expect(out).not.toContain('pgEnum');
    });

    // ── Naming ────────────────────────────────────────────────────────────

    it('converts camelCase field names to snake_case column names', () => {
      const out = drizzleGen.generate(inferSchema({ firstName: 'Alice', lastName: 'Smith' }), 'User');
      expect(out).toContain("varchar('first_name'");
      expect(out).toContain("varchar('last_name'");
    });

    it('uses snake_case plural for table name', () => {
      const out = drizzleGen.generate(inferSchema({ name: 'Alice' }), 'BlogPost');
      expect(out).toContain("pgTable('blog_posts'");
    });

    it('does not double-pluralize already-plural table names', () => {
      const out = drizzleGen.generate(inferSchema({ name: 'Alice' }), 'Users');
      expect(out).toContain("pgTable('users'");
      expect(out).not.toContain("pgTable('userss'");
    });

    // ── Optional fields ───────────────────────────────────────────────────

    it('omits .notNull() for optional fields', () => {
      const schema: Schema = {
        type: 'object',
        fields: {
          nickname: { type: 'string', optional: true, nullable: false },
          score: { type: 'number', format: 'float', optional: true, nullable: false },
        },
      };
      const out = drizzleGen.generate(schema, 'User');
      expect(out).toContain("varchar('nickname', { length: 255 })");
      expect(out).not.toMatch(/varchar\('nickname'[^)]*\)\.notNull/);
      expect(out).not.toMatch(/real\('score'\)\.notNull/);
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
      expect(result).toContain('id: z.uuid()');
      expect(result).toContain('user_id: z.uuid()');
    });

    it('applies .email() to email field', () => {
      const schema = inferSchema({ email: 'test@example.com' });
      const result = apiRouteGen.generate(schema, 'User');
      expect(result).toContain('email: z.email()');
    });

    it('applies .url() to url/link/website fields', () => {
      const schema = inferSchema({ profile_url: 'https://example.com', website: 'https://example.com' });
      if (schema.fields?.profile_url) schema.fields.profile_url.format = undefined;
      if (schema.fields?.website) schema.fields.website.format = undefined;
      const result = apiRouteGen.generate(schema, 'User');
      expect(result).toContain('profile_url: z.url()');
      expect(result).toContain('website: z.url()');
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
      expect(result).toContain('created_at: z.iso.datetime()');
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
      expect(result).toContain("id: ''");
      expect(result).toContain("name: ''");
      expect(result).toContain("count: 0");
      expect(result).toContain("active: false");
    });

    it('emits the State interface that update() references', () => {
      const schema = inferSchema({ id: '1', name: 'Alice', count: 5, active: true });
      const result = piniaStoreGen.generate(schema, 'Counter');
      // Partial<CounterState> が参照する interface が定義されていること
      expect(result).toContain('export interface CounterState {');
      expect(result).toContain('id: string;');
      expect(result).toContain('count: number;');
      expect(result).toContain('active: boolean;');
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

    it('generates z.url() for url fields', () => {
      const result = envValidatorGen.generate(envSchema);
      expect(result).toContain('DATABASE_URL: z.url()');
    });

    it('generates z.email() for email fields', () => {
      const result = envValidatorGen.generate(envSchema);
      expect(result).toContain('ADMIN_EMAIL: z.email()');
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
      // age: 30 is integer → IntegerField (not FloatField)
      expect(out).toContain('models.IntegerField()');
      expect(out).not.toContain('null=True');
    });
  });

  describe('mcpToolGen', () => {
    const schema = inferSchema({ name: 'Alice', age: 30, email: 'alice@example.com' });

    it('wraps in server.tool()', () => {
      const out = mcpToolGen.generate(schema, 'User');
      expect(out).toContain('server.tool(');
      expect(out).toContain('"user"');
    });

    it('adds .describe() to each field', () => {
      const out = mcpToolGen.generate(schema, 'User');
      expect(out).toContain('.describe(');
    });

    it('uses z.string() for string fields', () => {
      const out = mcpToolGen.generate(schema, 'User');
      expect(out).toContain('z.string()');
    });

    it('uses z.number() for number fields', () => {
      const out = mcpToolGen.generate(schema, 'User');
      expect(out).toContain('z.number()');
    });

    it('includes handler placeholder', () => {
      const out = mcpToolGen.generate(schema, 'User');
      // Handler takes a single `args` param (not destructured) so invalid-identifier
      // field keys like "content-type" don't produce a broken binding pattern.
      expect(out).toContain('async (args) =>');
    });
  });

  describe('openAiFunctionGen', () => {
    const schema = inferSchema({ title: 'Hello', count: 5.5, active: true });

    it('produces valid JSON output', () => {
      const out = openAiFunctionGen.generate(schema, 'Task');
      expect(() => JSON.parse(out)).not.toThrow();
    });

    it('sets type to function', () => {
      const out = openAiFunctionGen.generate(schema, 'Task');
      const parsed = JSON.parse(out);
      expect(parsed.type).toBe('function');
    });

    it('includes function name in snake_case', () => {
      const out = openAiFunctionGen.generate(schema, 'MyTask');
      const parsed = JSON.parse(out);
      expect(parsed.function.name).toBe('my_task');
    });

    it('has properties for each field', () => {
      const out = openAiFunctionGen.generate(schema, 'Task');
      const parsed = JSON.parse(out);
      const props = parsed.function.parameters.properties;
      expect(props).toHaveProperty('title');
      expect(props).toHaveProperty('count');
      expect(props).toHaveProperty('active');
    });

    it('maps string/number/boolean to correct JSON Schema types', () => {
      const out = openAiFunctionGen.generate(schema, 'Task');
      const parsed = JSON.parse(out);
      const props = parsed.function.parameters.properties;
      expect(props.title.type).toBe('string');
      expect(props.count.type).toBe('number');
      expect(props.active.type).toBe('boolean');
    });
  });

  describe('vercelAiToolGen', () => {
    const schema = inferSchema({ query: 'search term', limit: 10 });

    it('wraps in tool()', () => {
      const out = vercelAiToolGen.generate(schema, 'Search');
      expect(out).toContain('tool({');
    });

    it('includes z.object() parameters', () => {
      const out = vercelAiToolGen.generate(schema, 'Search');
      expect(out).toContain('z.object(');
    });

    it('has execute placeholder', () => {
      const out = vercelAiToolGen.generate(schema, 'Search');
      expect(out).toContain('execute:');
      expect(out).toContain('async (params)');
    });

    it('includes string and number fields', () => {
      const out = vercelAiToolGen.generate(schema, 'Search');
      expect(out).toContain('z.string()');
      expect(out).toContain('z.number()');
    });
  });

  // ─── AI Tool Generator: advanced features ──────────────────────────────────

  describe('openAiFunctionGen: nested objects', () => {
    const schema = inferSchema({
      user: { name: 'Alice', email: 'alice@example.com' },
      count: 5,
    });

    it('expands nested objects into JSON Schema object type', () => {
      const out = openAiFunctionGen.generate(schema, 'Task');
      const parsed = JSON.parse(out);
      const props = parsed.function.parameters.properties;
      expect(props.user.type).toBe('object');
      expect(props.user.properties).toBeDefined();
      expect(props.user.properties.name.type).toBe('string');
    });

    it('sets email format inside nested object', () => {
      const out = openAiFunctionGen.generate(schema, 'Task');
      const parsed = JSON.parse(out);
      const email = parsed.function.parameters.properties.user.properties.email;
      expect(email.format).toBe('email');
    });

    it('nested object has required array', () => {
      const out = openAiFunctionGen.generate(schema, 'Task');
      const parsed = JSON.parse(out);
      const user = parsed.function.parameters.properties.user;
      expect(Array.isArray(user.required)).toBe(true);
    });
  });

  describe('openAiFunctionGen: array item types', () => {
    it('detects string array items', () => {
      const out = openAiFunctionGen.generate(inferSchema({ tags: ['a', 'b'] }), 'Post');
      const parsed = JSON.parse(out);
      expect(parsed.function.parameters.properties.tags.items.type).toBe('string');
    });

    it('detects number array items', () => {
      const out = openAiFunctionGen.generate(inferSchema({ scores: [1.5, 2.5] }), 'Game');
      const parsed = JSON.parse(out);
      expect(parsed.function.parameters.properties.scores.items.type).toBe('number');
    });

    it('detects object array items with nested properties', () => {
      const out = openAiFunctionGen.generate(inferSchema({ items: [{ id: 1, name: 'x' }] }), 'Order');
      const parsed = JSON.parse(out);
      const items = parsed.function.parameters.properties.items;
      expect(items.type).toBe('array');
      expect(items.items.type).toBe('object');
      expect(items.items.properties.name).toBeDefined();
    });
  });

  describe('openAiFunctionGen: field descriptions', () => {
    it('adds description to all top-level fields', () => {
      const schema = inferSchema({ email: 'a@b.com', age: 25, isActive: true });
      const out = openAiFunctionGen.generate(schema, 'User');
      const parsed = JSON.parse(out);
      const props = parsed.function.parameters.properties;
      expect(typeof props.email.description).toBe('string');
      expect(typeof props.age.description).toBe('string');
      expect(typeof props.isActive.description).toBe('string');
    });

    it('describes email field as "Email address"', () => {
      const schema = inferSchema({ email: 'a@b.com' });
      const out = openAiFunctionGen.generate(schema, 'User');
      const parsed = JSON.parse(out);
      expect(parsed.function.parameters.properties.email.description).toBe('Email address');
    });
  });

  describe('openAiFunctionGen: number constraints', () => {
    it('adds minimum:0 to monetary amount fields', () => {
      const schema = inferSchema({ price: 9.99, amount: 100 });
      const out = openAiFunctionGen.generate(schema, 'Payment');
      const parsed = JSON.parse(out);
      expect(parsed.function.parameters.properties.price.minimum).toBe(0);
      expect(parsed.function.parameters.properties.amount.minimum).toBe(0);
    });

    it('adds minimum:0 maximum:100 to score/rating fields', () => {
      const schema = inferSchema({ score: 88.5 });
      const out = openAiFunctionGen.generate(schema, 'Review');
      const parsed = JSON.parse(out);
      expect(parsed.function.parameters.properties.score.minimum).toBe(0);
      expect(parsed.function.parameters.properties.score.maximum).toBe(100);
    });

    it('adds minimum:1 maximum:65535 to port field', () => {
      const schema = inferSchema({ port: 8080 });
      const out = openAiFunctionGen.generate(schema, 'Server');
      const parsed = JSON.parse(out);
      expect(parsed.function.parameters.properties.port.minimum).toBe(1);
      expect(parsed.function.parameters.properties.port.maximum).toBe(65535);
    });
  });

  describe('mcpToolGen: nested objects', () => {
    it('renders nested object as z.object() instead of z.any()', () => {
      const schema = inferSchema({ address: { city: 'Tokyo', country: 'JP' } });
      const out = mcpToolGen.generate(schema, 'User');
      expect(out).toContain('z.object(');
      expect(out).toContain('city');
    });

    it('renders string arrays as z.array(z.string())', () => {
      const schema = inferSchema({ tags: ['ts', 'react'] });
      const out = mcpToolGen.generate(schema, 'Post');
      expect(out).toContain('z.array(z.string())');
    });
  });

  describe('vercelAiToolGen: nested objects', () => {
    it('renders nested object as z.object() instead of z.any()', () => {
      const schema = inferSchema({ address: { city: 'Tokyo', country: 'JP' } });
      const out = vercelAiToolGen.generate(schema, 'User');
      expect(out).toContain('z.object(');
      expect(out).toContain('city');
    });

    it('renders string arrays as z.array(z.string())', () => {
      const schema = inferSchema({ tags: ['ts', 'react'] });
      const out = vercelAiToolGen.generate(schema, 'Post');
      expect(out).toContain('z.array(z.string())');
    });
  });
});
