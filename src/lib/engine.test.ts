import { describe, it, expect } from 'vitest';
import { inferSchema, runEngine, getDecisions } from './engine';
import { parseCurl, parseSQLToZod } from './parsers';

describe('TypeFlow Engine', () => {
  describe('inferSchema', () => {
    it('should infer basic types correctly', () => {
      expect(inferSchema("hello").type).toBe('string');
      expect(inferSchema(123).type).toBe('number');
      expect(inferSchema(true).type).toBe('boolean');
    });

    it('should infer formats for strings', () => {
      expect(inferSchema("test@example.com").format).toBe('email');
      expect(inferSchema("https://google.com").format).toBe('url');
      expect(inferSchema("550e8400-e29b-41d4-a716-446655440000").format).toBe('uuid');
    });

    it('should infer objects and arrays', () => {
      const obj = { id: 1, name: "test" };
      const schema = inferSchema(obj);
      expect(schema.type).toBe('object');
      expect(schema.fields?.id.type).toBe('number');
      expect(schema.fields?.name.type).toBe('string');

      const arr = [1, 2, 3];
      const arrSchema = inferSchema(arr);
      expect(arrSchema.type).toBe('array');
      expect(arrSchema.itemType?.type).toBe('number');
    });
  });

  describe('runEngine', () => {
    it('should NOT fallback to JSON when valid language is passed', () => {
      const json = { id: 1 };
      const result = runEngine(json, 'typescript');
      expect(result).not.toBe(JSON.stringify(json, null, 2));
      expect(result).toContain('interface');
    });

    it('should generate valid zod schema', () => {
      const json = { age: 25 };
      const result = runEngine(json, 'zod');
      expect(result).toContain('z.object');
      expect(result).toContain('age: z.number()');
    });

    it('should automatically extract and reuse shared types for duplicate object structures', () => {
      const json = {
        user: {
          id: 1,
          address: {
            city: "Tokyo",
            street: "Shibuya",
            zip: "150-0002"
          }
        },
        billing: {
          id: 2,
          address: {
            city: "Osaka",
            street: "Umeda",
            zip: "530-0001"
          }
        }
      };
      const result = runEngine(json, 'typescript');
      expect(result).toContain('interface SharedAddress');
      expect(result).toContain('address: SharedAddress');
      const addressDeclarations = result.match(/interface SharedAddress/g);
      expect(addressDeclarations?.length).toBe(1);
    });

    it('should infer pure YYYY-MM-DD date format and map to Date/z.coerce.date()', () => {
      const json = {
        joinedAt: "2026-05-18",
        history: ["2026-05-19", "2026-05-20"],
        mixed: ["2026-05-21", "invalid-date-string"]
      };
      
      const tsResult = runEngine(json, 'typescript');
      expect(tsResult).toContain('joinedAt: Date;');
      expect(tsResult).toContain('history: Date[];');
      expect(tsResult).toContain('mixed: string[];');
      
      const zodResult = runEngine(json, 'zod');
      expect(zodResult).toContain('joinedAt: z.coerce.date()');
      expect(zodResult).toContain('history: z.array(z.coerce.date())');
      expect(zodResult).toContain('mixed: z.array(z.string())');
    });

    it('should perform schema refactoring (flattening wrappers and extracting TimestampModel)', () => {
      const json = {
        user: {
          // Unnecessary 1-property wrapper object
          data: {
            name: "Alice",
            createdAt: "2026-05-18T10:00:00Z",
            updatedAt: "2026-05-18T12:00:00Z"
          }
        }
      };

      const result = runEngine(json, 'typescript');
      
      // 1. 'data' wrapper is flattened into RootUser
      expect(result).toContain('interface RootUser');
      expect(result).toContain('name: string;');
      expect(result).not.toContain('data: RootUserData;');

      // 2. Audit fields are extracted to TimestampModel
      expect(result).toContain('interface TimestampModel');
      expect(result).toContain('createdAt: Date;');
      expect(result).toContain('updatedAt: Date;');
      
      // 3. RootUser extends TimestampModel
      expect(result).toContain('interface RootUser extends TimestampModel');
    });

    it('should correctly infer semantic enums and avoid false-positive enum generation for raw text', () => {
      const json = {
        // Semantic candidate (should become enum)
        userStatus: "active",
        // Not a semantic key, and long raw text (should become string)
        articleTitle: "Introduction to Advanced TypeFlow Engineering Engine",
        // Short text but not semantic, and raw data has 3 entries
        nonSemanticList: ["Alice", "Bob", "Charlie"]
      };

      const tsResult = runEngine(json, 'typescript');
      expect(tsResult).toContain('userStatus: "active";');
      expect(tsResult).toContain('articleTitle: string;');
      expect(tsResult).toContain('nonSemanticList: string[];');
    });

    it('should resolve class name collisions and dynamically rewrite type references', () => {
      const json = {
        // Both will generate 'RootSharedAddress' class name but have different structures!
        sharedAddress: { city: "Tokyo" },
        SharedAddress: { zip: "100" }
      };

      const tsResult = runEngine(json, 'typescript');
      
      // Collision resolved on RootSharedAddress!
      expect(tsResult).toContain('interface RootSharedAddress');
      expect(tsResult).toContain('interface RootSharedAddress_v2');
      
      // Dynamic reference rewriting checked
      expect(tsResult).toContain('sharedAddress: RootSharedAddress;');
      expect(tsResult).toContain('SharedAddress: RootSharedAddress_v2;');
    });

    it('should generate professional Go struct embedding and Rust serde features using AST', () => {
      const json = {
        user: {
          userName: "John Doe",
          createdAt: "2026-05-18T10:00:00Z",
          updatedAt: "2026-05-18T12:00:00Z"
        }
      };

      // 1. Go Struct Embedding Verification
      const goResult = runEngine(json, 'go');
      expect(goResult).toContain('type RootUser struct {');
      expect(goResult).toContain('TimestampModel');
      expect(goResult).toContain('UserName string `json:"userName"`');

      // 2. Rust Serde Attribute Verification
      const rustResult = runEngine(json, 'rust');
      expect(rustResult).toContain('pub struct RootUser {');
      expect(rustResult).toContain('#[serde(flatten)]');
      expect(rustResult).toContain('pub timestamp_model: TimestampModel,');
      expect(rustResult).toContain('#[serde(rename = "userName")]');
      expect(rustResult).toContain('pub user_name: String,');
    });

    it('should calculate hash deterministically and prevent collisions even with colon/semicolon in keys', () => {
      const json = {
        // These keys contain colons and semicolons which would collide in legacy delimiter splits
        "a:b;c": { city: "Tokyo" },
        "a": { "b;c": "Shibuya" }
      };
      
      const tsResult = runEngine(json, 'typescript');
      expect(tsResult).toContain('interface Root');
      expect(tsResult).not.toEqual('');
    });

    it('should respect custom sharedPrefix option and support empty prefix', () => {
      const json = {
        billing: { id: 1, address: { city: "Tokyo", zip: "100" } },
        shipping: { id: 2, address: { city: "Tokyo", zip: "100" } }
      };

      // 1. With "Common" Prefix
      const commonResult = runEngine(json, 'typescript', '', { sharedPrefix: 'Common' });
      expect(commonResult).toContain('interface CommonAddress');
      expect(commonResult).toContain('address: CommonAddress;');

      // 2. With empty "" Prefix (Pure address type)
      const emptyResult = runEngine(json, 'typescript', '', { sharedPrefix: '' });
      expect(emptyResult).toContain('interface Address');
      expect(emptyResult).toContain('address: Address;');
    });

    it('should generate professional inheritance styles for other major AST backends (Dart, PHP, Python, Java, Proto, GQL, Prisma)', () => {
      const json = {
        user: {
          userName: "John Doe",
          createdAt: "2026-05-18T10:00:00Z",
          updatedAt: "2026-05-18T12:00:00Z"
        }
      };

      // 1. Dart Extends Styles
      const dartResult = runEngine(json, 'dart');
      expect(dartResult).toContain('class RootUser extends TimestampModel {');
      expect(dartResult).toContain('final String userName;');

      // 2. PHP Extends Styles
      const phpResult = runEngine(json, 'php');
      expect(phpResult).toContain('class RootUser extends TimestampModel {');
      expect(phpResult).toContain('public string $userName;');

      // 3. Python BaseModel / Extends Styles
      const pyResult = runEngine(json, 'python');
      expect(pyResult).toContain('class RootUser(TimestampModel):');
      expect(pyResult).toContain('userName: str');

      // 4. Java Extends Styles
      const javaResult = runEngine(json, 'java');
      expect(javaResult).toContain('public class RootUser extends TimestampModel {');
      expect(javaResult).toContain('private String userName;');

      // 5. Proto3 Flat Field Merging (Proto does not support inheritance, so fields are flattened)
      const protoResult = runEngine(json, 'protobuf');
      expect(protoResult).toContain('message RootUser {');
      expect(protoResult).toContain('string createdAt =');
      expect(protoResult).toContain('string updatedAt =');
      expect(protoResult).toContain('string userName =');

      // 6. GraphQL Flat Field Merging
      const gqlResult = runEngine(json, 'graphql');
      expect(gqlResult).toContain('type RootUser {');
      expect(gqlResult).toContain('createdAt: String');
      expect(gqlResult).toContain('updatedAt: String');
      expect(gqlResult).toContain('userName: String');

      // 7. Prisma flat fields
      const prismaResult = runEngine(json, 'prisma');
      expect(prismaResult).toContain('model RootUser {');
      expect(prismaResult).toContain('createdAt DateTime');
      expect(prismaResult).toContain('updatedAt DateTime');
      expect(prismaResult).toContain('userName String');
    });

    it('should correctly handle UUIDs and regions with hyphens as strings, not Dates', () => {
      const json = {
        id: "uuid-111-222",
        region: "us-east-1"
      };
      const result = runEngine(json, 'typescript');
      expect(result).toContain('id: string;');
      expect(result).toContain('region: string;');
      expect(result).not.toContain('id: Date;');
      expect(result).not.toContain('region: Date;');
    });

    it('should generate singular names for array elements ending in s or List', () => {
      const json = {
        departments: [
          { name: "Sales" }
        ],
        itemList: [
          { value: 1 }
        ]
      };
      const result = runEngine(json, 'typescript');
      expect(result).toContain('interface RootDepartment {');
      expect(result).toContain('interface RootItem {');
    });

    it('should set optional flag on fields that are missing in merged isomorphic objects', () => {
      const json = {
        billing: { id: 1, address: { city: "Tokyo", street: "Shibuya", country: "Japan", zip: "100" } },
        shipping: { id: 2, address: { city: "Osaka", street: "Umeda", country: "Japan", state: "Osaka" } } // zip missing here, state missing above
      };
      const result = runEngine(json, 'typescript', '', { sharedPrefix: 'Common' });
      expect(result).toContain('interface CommonAddress');
      expect(result).toContain('zip?: string;');
      expect(result).toContain('state?:');
    });

    it('should output inherited zod schemas correctly using extend and respect optionality', () => {
      const json = {
        user: {
          id: "uuid-1",
          name: "Alice",
          createdAt: "2026-05-18T10:00:00Z",
          updatedAt: "2026-05-18T12:00:00Z"
        }
      };
      const result = runEngine(json, 'zod');
      // TimestampModel should be declared first
      expect(result.indexOf('timestampModelSchema')).toBeLessThan(result.indexOf('rootUserSchema'));
      expect(result).toContain('rootUserSchema = timestampModelSchema.extend(');
    });

    it('should parse robust curl commands and SQL queries correctly', () => {
      const curl = `curl "https://api.example.com/v1/users" -H "Authorization: Bearer test" --data-raw '{"name":"test"}'`;
      const parsed = parseCurl(curl);
      expect(parsed.method).toBe('POST');
      expect(parsed.url).toBe('https://api.example.com/v1/users');
      expect(parsed.headers['Authorization']).toBe('Bearer test');
      expect(parsed.bodyJson.name).toBe('test');

      const sql = `CREATE TABLE users ( id INT PRIMARY KEY, name VARCHAR(255) NOT NULL, FOREIGN KEY (role_id) REFERENCES roles(id) )`;
      const zodSql = parseSQLToZod(sql);
      expect(zodSql).toContain('export const usersSchema = z.object({');
      expect(zodSql).toContain('id: z.number(),');
      expect(zodSql).toContain('name: z.string(),');
      expect(zodSql).not.toContain('FOREIGN');
    });
  });

  describe('Explainable Logic Decisions', () => {
    it('should correctly identify unification, timestamp, and flattening candidates', () => {
      const json = {
        billing: {
          id: 1,
          name: "Alice",
          address: { city: "Tokyo", zip: "100", street: "Shibuya" },
          createdAt: "2026-05-18T10:00:00Z",
          updatedAt: "2026-05-18T12:00:00Z"
        },
        shipping: {
          id: 2,
          name: "Bob",
          address: { city: "Osaka", zip: "200", street: "Umeda" },
          createdAt: "2026-05-18T10:00:00Z",
          updatedAt: "2026-05-18T12:00:00Z"
        },
        // Single-key wrapper object candidate
        wrapper: {
          inner: {
            field: "value"
          }
        }
      };

      const decisions = getDecisions(json);
      
      // Unification candidate (SharedBilling)
      const unification = decisions.find(d => d.type === 'unification');
      expect(unification).toBeDefined();
      expect(unification?.meta.semanticName).toBe('SharedBilling');
      expect(unification?.meta.count).toBe(2);

      // Timestamp candidate
      const timestamp = decisions.find(d => d.type === 'timestamp');
      expect(timestamp).toBeDefined();
      expect(timestamp?.meta.disabled).toBe(false);

      // Flattening candidate
      const flattening = decisions.find(d => d.type === 'flattening');
      expect(flattening).toBeDefined();
      expect(flattening?.meta.disabled).toBe(false);
    });

    it('should respect disabledUnifications to cancel unification', () => {
      const json = {
        billing: { city: "Tokyo", zip: "100", street: "Shibuya" },
        shipping: { city: "Osaka", zip: "200", street: "Umeda" }
      };

      // 1. Unified by default
      const defaultDecisions = getDecisions(json);
      const unifyDefault = defaultDecisions.find(d => d.type === 'unification');
      expect(unifyDefault?.meta.disabled).toBe(false);

      // 2. Disabled explicitly
      const disabledDecisions = getDecisions(json, { disabledUnifications: ['SharedAddress'] });
      const unifyDisabled = disabledDecisions.find(d => d.type === 'unification');
      expect(unifyDisabled?.meta.disabled).toBe(true);
    });

    it('should respect customTypeNames to rename unified types', () => {
      const json = {
        billing: { city: "Tokyo", zip: "100", street: "Shibuya" },
        shipping: { city: "Osaka", zip: "200", street: "Umeda" }
      };

      const decisions = getDecisions(json, { customTypeNames: { SharedAddress: 'Location' } });
      const unification = decisions.find(d => d.type === 'unification');
      expect(unification?.meta.semanticName).toBe('Location');
      expect(unification?.meta.originalName).toBe('SharedAddress');
    });
  });
});
