import { describe, it, expect } from 'vitest';
import { swiftGen, kotlinGen, zodGen, protoGen, gqlGen, tsGen, goGen, rustGen, jsonSchemaGen, mockGen, prismaGen, javaGen, uiGen, docGen, csharpGen, phpGen } from './generators';
import { inferSchema } from './engine';
import { parseTypeScriptToSchema } from './parsers';

describe('generators', () => {
  describe('swiftGen', () => {
    it('should format types correctly (Int, Double, String?)', () => {
      const json = { id: 42, total: 129.99, updatedAt: null };
      const schema = inferSchema(json);
      const result = swiftGen.generate(schema, 'Root');
      expect(result).toContain('let id: Int');
      expect(result).toContain('let total: Double');
      expect(result).toContain('let updatedAt: AnyCodable?');
    });
  });

  describe('kotlinGen', () => {
    it('should format types correctly (Int, Double, String?)', () => {
      const json = { id: 42, total: 129.99, updatedAt: null };
      const schema = inferSchema(json);
      const result = kotlinGen.generate(schema, 'Root');
      expect(result).toContain('val id: Int');
      expect(result).toContain('val total: Double');
      expect(result).toContain('val updatedAt: Any?');
    });

    it('[regression] datetime fields should not embed comments that break comma-separated params', () => {
      const json = { createdAt: '2024-01-01T00:00:00Z', name: 'Alice' };
      const schema = inferSchema(json);
      const result = kotlinGen.generate(schema, 'Root');
      expect(result).not.toContain('//');
      expect(result).toContain('val createdAt: String');
      expect(result).toContain('val name: String');
      const body = result.match(/data class Root\(([\s\S]*?)\)/)?.[1] ?? '';
      expect(body).toMatch(/createdAt: String,/);
    });
  });

  describe('zodGen', () => {
    it('should handle email and url formats', () => {
      const json = { email: 'test@example.com', url: 'https://example.com' };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.string().email()');
      expect(result).toContain('z.string().url()');
    });

    it('should include type export', () => {
      const json = { id: 1 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('export type Root = z.infer<typeof rootSchema>;');
    });
  });

  describe('protoGen', () => {
    it('should format types correctly (int32, double)', () => {
      const json = { id: 42, total: 129.99 };
      const schema = inferSchema(json);
      const result = protoGen.generate(schema, 'Root');
      expect(result).toContain('int32 id =');
      expect(result).toContain('double total =');
    });
  });

  describe('gqlGen', () => {
    it('should add ! to required fields (Int, Float)', () => {
      const json = { id: 42, total: 129.99 };
      const schema = inferSchema(json);
      const result = gqlGen.generate(schema, 'Root');
      expect(result).toContain('id: Int!');
      expect(result).toContain('total: Float!');
    });

    it('should not add ! to optional fields', () => {
      const rows = [{ id: 1, nickname: 'Alice' }, { id: 2 }];
      const schema = inferSchema(rows);
      const result = gqlGen.generate(schema, 'Root');
      expect(result).toContain('id: Int!');
      expect(result).toMatch(/nickname: String[^!]/);
    });

    it('should add ! to array item types', () => {
      const json = { tags: ['a', 'b'] };
      const schema = inferSchema(json);
      const result = gqlGen.generate(schema, 'Root');
      expect(result).toContain('[String!]');
    });
  });

  describe('tsGen', () => {
    it('should handle optional, union, and nested objects correctly', () => {
      const json = [
        { id: 1, info: { status: 'active' } },
        { id: 'uuid-1234', name: 'Alice' }
      ];
      const schema = inferSchema(json);
      const result = tsGen.generate(schema, 'Root');
      
      // 'id' should be a union of number and string
      expect(result).toMatch(/id:\s*number\s*\|\s*string;/);
      // 'info' is missing in second item -> optional
      expect(result).toMatch(/info\?:\s*RootItemInfo;/);
      // 'name' is missing in first item -> optional
      expect(result).toMatch(/name\?:\s*string;/);
    });
  });

  describe('goGen', () => {
    it('should format struct tags for optional fields', () => {
      const json = [{ id: 1 }, { id: 2, name: 'Alice' }];
      const schema = inferSchema(json);
      const result = goGen.generate(schema, 'Root');
      
      // 'Name' should be optional (pointer and omitempty in Go)
      expect(result).toContain('Name *string `json:"name,omitempty"`');
      // 'Id' is required (int64)
      expect(result).toContain('Id int64 `json:"id"`');
    });
  });

  describe('rustGen', () => {
    it('should format Option<T> for optional fields', () => {
      const json = [{ id: 1 }, { id: 2, name: 'Alice' }];
      const schema = inferSchema(json);
      const result = rustGen.generate(schema, 'Root');
      
      // 'name' should be Option<String>
      expect(result).toContain('pub name: Option<String>,');
      // 'id' should be required (i64)
      expect(result).toContain('pub id: i64,');
    });
  });

  describe('jsonSchemaGen', () => {
    it('should output enumValues correctly (regression test)', () => {
      const json = [{ status: 'active' }, { status: 'inactive' }, { status: 'pending' }];
      const schema = inferSchema(json);
      const result = jsonSchemaGen.generate(schema);
      
      // Should contain the enum array in the JSON Schema output
      expect(result).toContain('"enum":');
      expect(result).toContain('"active"');
      expect(result).toContain('"inactive"');
    });
  });
  
  describe('regression tests', () => {
    it('[regression] zodGen should use z.lazy for recursive types (cycle detection)', () => {
      const rootSchema: any = {
        type: 'object',
        _sharedTypeName: 'Node',
        fields: {
          id: { type: 'string' },
        }
      };
      const childSchema: any = {
        type: 'object',
        _sharedTypeName: 'NodeChild',
        fields: {
          parent: rootSchema
        }
      };
      rootSchema.fields.child = childSchema; // create a cycle

      const result = zodGen.generate(rootSchema, 'Node');
      expect(result).toContain('z.lazy(');
    });

    it('[regression] union types must not generate invalid z.classRef() or z.object() calls', () => {
      // A union schema where members are proper ASTType objects ({kind}).
      // Previously the generator blindly did z.${t}() on raw kind strings,
      // producing z.classRef() or z.object() with no args (both invalid).
      // After the fix it must recurse and produce valid Zod for each member.
      const unionSchema: any = {
        type: 'union',
        unionTypes: ['string', 'number']
      };
      const wrappedSchema: any = {
        type: 'object',
        fields: { payload: unionSchema }
      };
      const result = zodGen.generate(wrappedSchema, 'Root');
      // Must output valid Zod — z.union with proper z.string() and z.number()
      expect(result).toContain('z.union([z.string(), z.number()])');
      // Must NOT contain invalid patterns like z.classRef()
      expect(result).not.toMatch(/z\.classRef\(/);
    });
  });

  describe('mockGen', () => {
    it('should generate 50 items for array schema', () => {
      const json = [{ id: 1, name: 'Alice', email: 'a@example.com' }];
      const schema = inferSchema(json);
      const result = mockGen.generate(schema);
      const parsed = JSON.parse(result);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBe(50);
    });

    it('should generate realistic email values', () => {
      const json = [{ email: 'test@example.com' }];
      const schema = inferSchema(json);
      const result = mockGen.generate(schema);
      const parsed = JSON.parse(result);
      expect(parsed[0].email).toContain('@');
    });

    it('should generate varied name values across items', () => {
      const json = [{ name: 'Alice' }];
      const schema = inferSchema(json);
      const result = mockGen.generate(schema);
      const parsed = JSON.parse(result);
      const names = new Set(parsed.map((item: any) => item.name));
      expect(names.size).toBeGreaterThan(1);
    });
  });

  describe('zodGen - name-based validation', () => {
    it('should add .int().min(0).max(150) for age field', () => {
      const json = { age: 25 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().int().min(0).max(150)');
    });

    it('should add .min(0) for price field', () => {
      const json = { price: 19.99 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().min(0)');
    });

    it('should add .email() for email field without format', () => {
      const json = { email: 'test@example.com' };
      const schema = inferSchema(json);
      if (schema.fields?.email) schema.fields.email.format = undefined;
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.string().email()');
    });

    it('should add .url() for url field', () => {
      const json = { website: 'https://example.com' };
      const schema = inferSchema(json);
      if (schema.fields?.website) schema.fields.website.format = undefined;
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.string().url()');
    });

    it('should add .min(0).max(5) for rating field', () => {
      const json = { rating: 4.5 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().min(0).max(5)');
    });

    it('should add .min(0).max(100) for score field', () => {
      const json = { score: 87 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().min(0).max(100)');
    });

    it('should add .min(0).max(100) for percentage field', () => {
      const json = { percentage: 75.5 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().min(0).max(100)');
    });

    it('should add .int().min(1900).max(2100) for year field', () => {
      const json = { year: 2024 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().int().min(1900).max(2100)');
    });

    it('should add .int().min(1).max(12) for month field', () => {
      const json = { month: 6 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().int().min(1).max(12)');
    });

    it('should add .int().min(0) for count field', () => {
      const json = { count: 10 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().int().min(0)');
    });

    it('should add .min(-90).max(90) for latitude field', () => {
      const json = { latitude: 35.6 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().min(-90).max(90)');
    });

    it('should add .min(-180).max(180) for longitude field', () => {
      const json = { longitude: 139.7 };
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.number().min(-180).max(180)');
    });

    it('should add .min(1).trim() for required name field', () => {
      const json = { name: 'Alice' };
      const schema = inferSchema(json);
      if (schema.fields?.name) schema.fields.name.format = undefined;
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.string().min(1).trim()');
    });

    it('should add .trim() (no .min) for optional title field', () => {
      const json = { title: 'Dr.' };
      const schema = inferSchema(json);
      if (schema.fields?.title) { schema.fields.title.format = undefined; schema.fields.title.optional = true; }
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.string().trim()');
      expect(result).not.toContain('z.string().min(1).trim()');
    });

    it('should add .min(1) for required non-semantic string field', () => {
      const json = { slug: 'my-post' };
      const schema = inferSchema(json);
      if (schema.fields?.slug) schema.fields.slug.format = undefined;
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('z.string().min(1)');
    });

    it('should NOT add .min(1) for long-text fields like description', () => {
      const json = { description: '' };
      const schema = inferSchema(json);
      if (schema.fields?.description) schema.fields.description.format = undefined;
      const result = zodGen.generate(schema, 'Root');
      expect(result).not.toContain('z.string().min(1)');
    });
  });

  describe('zodGen - ID field detection (BUG-02 regression)', () => {
    it('[bugfix] should NOT add .uuid() to fields whose names merely end in "id" as a substring (valid, grid, bid)', () => {
      // Previously `.endsWith('id')` matched "valid", "grid", "bid" etc. which are NOT ID fields.
      // Fixed by requiring camelCase /Id$/ or /ID$/ boundary.
      // Required strings now also get .min(1) — assert no .uuid(), not exact z.string()
      const schema = inferSchema({ valid: 'some-label', grid: 'layout-3x3', bid: 'auction-item' });
      const result = zodGen.generate(schema, 'Root');
      expect(result).not.toContain('valid: z.string().uuid()');
      expect(result).not.toContain('grid: z.string().uuid()');
      expect(result).not.toContain('bid: z.string().uuid()');
    });

    it('[bugfix] should still apply .uuid() to legitimate camelCase ID fields (userId, orderId, userID)', () => {
      // These are genuine ID fields and must keep .uuid() validation after the fix.
      const schema = inferSchema({ userId: 'not-a-uuid', orderId: 'not-a-uuid', userID: 'not-a-uuid' });
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('userId: z.string().uuid()');
      expect(result).toContain('orderId: z.string().uuid()');
      expect(result).toContain('userID: z.string().uuid()');
    });

    it('[bugfix] should still apply .uuid() to snake_case _id fields (user_id, order_id)', () => {
      const schema = inferSchema({ user_id: 'not-a-uuid', order_id: 'not-a-uuid' });
      const result = zodGen.generate(schema, 'Root');
      expect(result).toContain('user_id: z.string().uuid()');
      expect(result).toContain('order_id: z.string().uuid()');
    });
  });

  describe('customFieldNames', () => {
    const json = { user: { firstName: 'Alice', lastName: 'Smith' } };

    it('tsGen should apply customFieldNames', () => {
      const schema = inferSchema(json);
      const result = tsGen.generate(schema, 'Root', {
        customFieldNames: { 'RootUser.firstName': 'first_name' }
      });
      expect(result).toContain('first_name');
      expect(result).not.toContain('firstName');
    });

    it('zodGen should apply customFieldNames', () => {
      const schema = inferSchema(json);
      const result = zodGen.generate(schema, 'Root', {
        customFieldNames: { 'RootUser.firstName': 'first_name' }
      });
      expect(result).toContain('first_name');
      expect(result).not.toContain('firstName');
    });

    it('prismaGen should apply customFieldNames', () => {
      const schema = inferSchema(json);
      const result = prismaGen.generate(schema, 'Root', {
        customFieldNames: { 'RootUser.firstName': 'first_name' }
      });
      expect(result).toContain('first_name');
      expect(result).not.toContain('firstName');
    });
  });

  describe('javaGen', () => {
    it('基本的なオブジェクトをJava POJOに変換できる', () => {
      const input = JSON.stringify({ id: '1', name: 'Alice', age: 30 });
      const schema = inferSchema(JSON.parse(input));
      const result = javaGen.generate(schema, 'User');
      expect(result).toContain('public class User');
      expect(result).toContain('private String id');
      expect(result).toContain('private int age');
      expect(result).toContain('getId()');
    });

    it('optional フィールドに @Nullable がつく', () => {
      const samples = [{ id: '1', role: 'admin' }, { id: '2' }];
      const schema = inferSchema(samples);
      const result = javaGen.generate(schema, 'User');
      expect(result).toContain('@Nullable');
    });
  });

  describe('phpGen', () => {
    it('generates constructor with promoted properties and getters/setters', () => {
      const out = phpGen.generate(inferSchema({ id: 1, name: 'Alice' }), 'User');
      expect(out).toContain('public function __construct(');
      expect(out).toContain('        private int $id,');
      expect(out).toContain('        private string $name,');
      expect(out).toContain('public function getId(): int');
      expect(out).toContain('public function setId(int $id): void');
      expect(out).toContain('public function getName(): string');
    });

    it('optional fields have ? and = null default', () => {
      const rows = [{ id: 1, nickname: 'Alice' }, { id: 2 }];
      const out = phpGen.generate(inferSchema(rows), 'User');
      expect(out).toContain('        private ?string $nickname = null,');
      expect(out).toContain('public function getNickname(): ?string');
    });
  });

  describe('csharpGen', () => {
    it('required fields get [Required] attribute and using statement', () => {
      const schema = inferSchema({ id: 1, name: 'Alice' });
      const out = csharpGen.generate(schema, 'User');
      expect(out).toContain('using System.ComponentModel.DataAnnotations;');
      expect(out).toContain('    [Required]');
      expect(out).toContain('    public long Id { get; set; }');
      expect(out).toContain('    public string Name { get; set; }');
    });

    it('optional fields have ? and no [Required]', () => {
      const rows = [{ id: 1, nickname: 'Alice' }, { id: 2 }];
      const out = csharpGen.generate(inferSchema(rows), 'User');
      expect(out).toContain('    public string? Nickname { get; set; }');
      expect(out.match(/\[Required\]/g)?.length ?? 0).toBe(1);
    });
  });

  describe('uiGen', () => {
    it('renders all fields without the old 8-field cap', () => {
      const schema = inferSchema({
        id: '1', name: 'Alice', email: 'a@b.com', role: 'admin',
        status: 'active', age: 30, score: 99, phone: '123', address: 'NY', bio: 'hello',
      });
      const result = uiGen.generate(schema, 'User');
      // 10 fields — previously truncated at 8
      expect((result.match(/<div>/g) || []).length).toBe(10);
      expect(result).toContain('phone');
      expect(result).toContain('address');
      expect(result).toContain('bio');
    });

    it('renders a single-field schema without issue', () => {
      const schema = inferSchema({ name: 'Alice' });
      const result = uiGen.generate(schema, 'User');
      expect(result).toContain('UserCard');
      expect(result).toContain('name');
    });
  });

  describe('docGen', () => {
    it('classifies user_id as foreign key (not the generic id catch-all)', () => {
      const schema = inferSchema({ user_id: '550e8400-e29b-41d4-a716-000000000001' });
      const result = docGen.generate(schema, 'Post');
      expect(result).toContain('Foreign key reference to an external record.');
      expect(result).not.toContain('Unique identifier for the record.');
    });

    it('classifies bare id as unique identifier', () => {
      const schema = inferSchema({ id: '550e8400-e29b-41d4-a716-446655440000' });
      const result = docGen.generate(schema, 'Post');
      expect(result).toContain('Unique identifier for the record.');
    });

    it('classifies created_at and updated_at as their specific timestamp descriptions', () => {
      const schema = inferSchema({ created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-02T00:00:00Z' });
      const result = docGen.generate(schema, 'Post');
      expect(result).toContain('Timestamp representing record creation time.');
      expect(result).toContain('Timestamp representing the last update time.');
    });

    it('classifies generic _at suffix as ISO 8601 timestamp', () => {
      const schema = inferSchema({ deleted_at: '2024-06-01T00:00:00Z' });
      const result = docGen.generate(schema, 'Post');
      expect(result).toContain('ISO 8601 timestamp.');
    });

    it('classifies _count suffix as count', () => {
      const schema = inferSchema({ comment_count: 5 });
      const result = docGen.generate(schema, 'Post');
      expect(result).toContain('Integer count or quantity (non-negative).');
    });

    it('classifies _url suffix as URL', () => {
      const schema = inferSchema({ avatar_url: 'https://example.com/avatar.png' });
      if (schema.fields?.avatar_url) schema.fields.avatar_url.format = undefined;
      const result = docGen.generate(schema, 'User');
      expect(result).toContain('Fully-qualified URL (HTTP/HTTPS).');
    });

    it('classifies _code suffix as short code', () => {
      const schema = inferSchema({ status_code: 'OK' });
      const result = docGen.generate(schema, 'Response');
      expect(result).toContain('Short code or identifier string.');
    });

    it('classifies title as human-readable heading', () => {
      const schema = inferSchema({ title: 'Hello World' });
      const result = docGen.generate(schema, 'Post');
      expect(result).toContain('Human-readable title or heading.');
    });

    it('classifies price as monetary value', () => {
      const schema = inferSchema({ price: 99.9 });
      const result = docGen.generate(schema, 'Product');
      expect(result).toContain('Monetary value (non-negative).');
    });

    it('classifies slug as URL-safe identifier', () => {
      const schema = inferSchema({ slug: 'hello-world' });
      const result = docGen.generate(schema, 'Post');
      expect(result).toContain('URL-safe identifier slug.');
    });
  });

  describe('zodGen — TS union precision', () => {
    it('string | null → nullable (not z.any())', () => {
      const schema = parseTypeScriptToSchema(`interface T { value: string | null; }`)!;
      const result = zodGen.generate(schema, 'T');
      expect(result).toContain('.nullable()');
      expect(result).not.toContain('z.any()');
    });

    it('string | undefined → optional (not z.any())', () => {
      const schema = parseTypeScriptToSchema(`interface T { value: string | undefined; }`)!;
      const result = zodGen.generate(schema, 'T');
      expect(result).toContain('.optional()');
      expect(result).not.toContain('z.any()');
    });

    it('string | number → z.union([z.string(), z.number()])', () => {
      const schema = parseTypeScriptToSchema(`interface T { id: string | number; }`)!;
      const result = zodGen.generate(schema, 'T');
      expect(result).toContain('z.union([z.string(), z.number()])');
    });

    it('number | null | undefined → nullable + optional (not z.any())', () => {
      const schema = parseTypeScriptToSchema(`interface T { count: number | null | undefined; }`)!;
      const result = zodGen.generate(schema, 'T');
      expect(result).toContain('z.number()');
      expect(result).toContain('.nullable()');
      expect(result).toContain('.optional()');
      expect(result).not.toContain('z.any()');
    });

    it("'active' | 'inactive' | null → z.enum().nullable()", () => {
      const schema = parseTypeScriptToSchema(`interface T { status: 'active' | 'inactive' | null; }`)!;
      const result = zodGen.generate(schema, 'T');
      expect(result).toContain('z.enum(["active", "inactive"])');
      expect(result).toContain('.nullable()');
    });
  });
});
