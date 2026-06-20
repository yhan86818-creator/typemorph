import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { inferSchema, runEngine, getDecisions } from './engine';
import { parseCurl, parseSQLToZod } from './parsers';

describe('TypeMorph Engine', () => {
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

    it('[bug] should NOT infer string values as number based on key name alone (floatKeyPattern bug)', () => {
      // price is a floatKeyPattern match, but the value is a string → should be string, not number
      const schema = inferSchema({ price: "19.99" });
      expect(schema.fields?.price.type).toBe('string');
      // format is no longer 'float' because format:'float' is semantically invalid on type:'string'
      expect(schema.fields?.price.format).toBeUndefined();

      // amount is also a floatKeyPattern match, but value is a non-numeric string
      const schema2 = inferSchema({ amount: "free" });
      expect(schema2.fields?.amount.type).toBe('string');

      // cost with string value
      const schema3 = inferSchema({ cost: "to be determined" });
      expect(schema3.fields?.cost.type).toBe('string');

      // Actual number values should still be inferred as number
      const schema4 = inferSchema({ price: 19.99 });
      expect(schema4.fields?.price.type).toBe('number');
      expect(schema4.fields?.price.format).toBe('float');
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

    it('[regression] should correctly dispatch to extended generators and not fallback to JSON', () => {
      const json = { id: 1, name: "Alice" };
      
      const formats = ['drizzle', 'kysely', 'react-query', 'mermaid', 'postman', 'clojure'];
      for (const format of formats) {
        const result = runEngine(json, format);
        // If it failed to dispatch, it would return the raw JSON stringified
        expect(result).not.toEqual(JSON.stringify(json, null, 2));
      }
    });

    it('should emit unsupported output telemetry and message for unknown target', () => {
      const gtagMock = vi.fn();
      vi.stubGlobal('window', { gtag: gtagMock });

      const json = { id: 1 };
      const result = runEngine(json, 'unknown-output-target');

      expect(result).toContain('// Unsupported output target: "unknown-output-target"');
      expect(gtagMock).toHaveBeenCalledWith('event', 'infer_unsupported_output', {
        target: 'unknown-output-target',
        requested: 'unknown-output-target'
      });
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

    it('should infer pure YYYY-MM-DD date format and map to Date/z.iso.date()', () => {
      const json = {
        joinedAt: "2026-05-18",
        history: ["2026-05-19", "2026-05-20"],
        mixed: ["2026-05-21", "invalid-date-string"]
      };

      const tsResult = runEngine(json, 'typescript');
      expect(tsResult).toContain('joinedAt: Date;');
      expect(tsResult).toContain('history: Date[];');
      expect(tsResult).toContain('mixed: string[];');

      // v4 default: z.iso.date() for YYYY-MM-DD strings
      const zodResult = runEngine(json, 'zod');
      expect(zodResult).toContain('joinedAt: z.iso.date()');
      expect(zodResult).toContain('history: z.array(z.iso.date())');
      expect(zodResult).toContain('mixed: z.array(z.string())');

      // v3: z.coerce.date()
      const zodV3Result = runEngine(json, 'zod', '', { zodVersion: 'v3' });
      expect(zodV3Result).toContain('joinedAt: z.coerce.date()');
      expect(zodV3Result).toContain('history: z.array(z.coerce.date())');
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
        articleTitle: "Introduction to Advanced TypeMorph Engineering Engine",
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
      expect(phpResult).toContain('class RootUser extends TimestampModel');
      expect(phpResult).toContain('private string $userName,');

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

    // -----------------------------------------------------------------------
    // Bug-fix regression tests
    // -----------------------------------------------------------------------

    it('[bugfix] DEPENDENCY_COMMENTS should use exact match, not includes()', () => {
      const json = { id: 1 };
      // sql-insert should NOT get the Prisma comment (which is for 'sql')
      const result = runEngine(json, 'sql-insert');
      expect(result).not.toContain('Prisma schema format');
      expect(result).not.toContain('npx prisma generate');
      // 'sql' (prisma) should still get its own comment
      const prismaResult = runEngine(json, 'sql');
      expect(prismaResult).toContain('Prisma schema format');
    });

    it('[bugfix] parseCurl should handle -d with no space before quote', () => {
      const parsed = parseCurl(`curl -d'{"name":"test"}' https://api.example.com`);
      expect(parsed.method).toBe('POST');
      expect(parsed.bodyJson).toEqual({ name: 'test' });
    });

    it('[bugfix] parseCurl should handle -d with no space before double-quote', () => {
      const parsed = parseCurl(`curl -d"{\\"name\\":\\"test\\"}" https://api.example.com`);
      expect(parsed.method).toBe('POST');
      expect(parsed.bodyJson).toEqual({ name: 'test' });
    });

    it('[bugfix] parseCurl should extract unquoted JSON body', () => {
      const parsed = parseCurl(`curl -X POST https://api.example.com -d {"name":"test"}`);
      expect(parsed.method).toBe('POST');
      expect(parsed.bodyJson).toEqual({ name: 'test' });
    });

    it('[bugfix] parseCurl should auto-detect POST when -d has no space before quote', () => {
      const parsed = parseCurl(`curl -d'{"x":1}' https://api.example.com`);
      expect(parsed.method).toBe('POST');
    });

    // -----------------------------------------------------------------------
    // Bug-fix regression tests for 2026-06-12 fixes
    // -----------------------------------------------------------------------

    it('[bugfix] mergeSchemas should only keep format when BOTH sides agree (not just s1)', () => {
      // Fix: L109 changed from (s1.format && s2.format) ? s1.format : undefined
      //                        to (s1.format === s2.format) ? s1.format : undefined
      const json = {
        events: [
          { date: "2024-01-01" },           // inferSchema → format: 'date'
          { date: "2024-01-01T00:00:00Z" }, // inferSchema → format: 'datetime'
        ]
      };
      const result = runEngine(json, 'typescript');
      // date + datetime differ → format should be dropped → plain string
      expect(result).toContain('date: string;');
      expect(result).not.toContain('date: Date;');
    });

    it('[bugfix] mergeIsomorphicObjects should cap enumValues at 6', () => {
      // Fix: L598-600 now has merged.length <= 6 guard
      const json = {
        items: [
          { status: "active" },
          { status: "pending" },
          { status: "success" },
          { status: "error" },
          { status: "failed" },
          { status: "cancelled" },
          { status: "expired" },  // 7th unique value → should drop enum, become plain string
        ]
      };
      const result = runEngine(json, 'typescript');
      // 7 unique values exceeds cap → should be string, not a union literal
      expect(result).toContain('status: string;');
      expect(result).not.toMatch(/status:\s*"/); // no union literal like "active" | "pending" | ...
    });

    it('[bugfix] DEPENDENCY_COMMENTS should be emitted for previously missing targets', () => {
      // Fix: added 14 entries to DEPENDENCY_COMMENTS + matchedKey normalization for r-lang
      const json = { id: 1 };

      // mongodb → mongoose dispatch, now has DEPENDENCY_COMMENTS entry
      const mongoResult = runEngine(json, 'mongodb');
      expect(mongoResult).toContain('npm install mongoose');

      // dynamodb / bigquery は純 JSON 出力 → コメントは付けない（付けると JSON.parse が壊れる）。
      // 以前はコメントを出していたが、それが JSON を不正にするバグだった。
      expect(() => JSON.parse(runEngine(json, 'dynamodb'))).not.toThrow();
      expect(() => JSON.parse(runEngine(json, 'bigquery'))).not.toThrow();

      // r-lang → matchedKey normalized to 'r-lang', now has DEPENDENCY_COMMENTS entry
      const rResult = runEngine(json, 'r');
      expect(rResult).toContain('R dataframe scaffold');

      // solidity → now has DEPENDENCY_COMMENTS entry
      const solResult = runEngine(json, 'solidity');
      expect(solResult).toContain('SPDX-License-Identifier: MIT');
    });

    it('[bugfix BUG-01] floatKeyPattern should not suppress statistical enum detection on high-confidence float-named fields', () => {
      // Previously floatKeyPattern fired BEFORE allowedEnumKeys check.
      // "rate" matches floatKeyPattern but when it appears with only 2 distinct string
      // values across 12+ items, statistical enum detection should win.
      const json = Array.from({ length: 12 }, (_, i) => ({
        rate: i % 2 === 0 ? 'annual' : 'monthly',
        count: i + 1,
      }));
      const schema = inferSchema(json);
      const rateField = schema.itemType!.fields!.rate;
      expect(rateField.type).toBe('string');
      expect(rateField.enumValues).toBeDefined();
      expect(rateField.enumValues).toContain('annual');
      expect(rateField.enumValues).toContain('monthly');
    });

    it('[bugfix BUG-03] mergeSchemas should drop format when two string schema formats differ', () => {
      // Previously a dead ternary `(s1.format === s2.format) ? s1.format : undefined`
      // always fell to `undefined` but the return statement also included `format: mergedFormat`
      // which could pass `undefined` through and confuse downstream generators.
      // After the fix the return simply omits `format` when formats differ.
      const json = [
        { contact: 'alice@example.com' },
        { contact: '550e8400-e29b-41d4-a716-000000000001' },
      ];
      const schema = inferSchema(json);
      const contactField = schema.itemType!.fields!.contact;
      expect(contactField.type).toBe('string');
      expect(contactField.format).toBeUndefined();
    });

    it('[bugfix BUG-06] mergeIsomorphicObjects should merge primitive array itemType across unified types (int vs float → float)', () => {
      // Previously same-type primitives inside arrays of unified objects were NOT merged;
      // `scores: []int64` (from admin) would override `scores: []float64` (from user) or vice versa.
      // After the fix, mergeSchemas is called on matching primitive itemTypes.
      const json = {
        user:  { scores: [1.5, 2.7], name: 'Alice' },
        admin: { scores: [10, 20],   name: 'Bob' },
      };
      const goResult = runEngine(json, 'go');
      expect(goResult).toContain('Scores []float64');
      expect(goResult).not.toContain('Scores []int64');
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

    it('should merge enumValues when only one side has them', () => {
      const json = {
        users: [
          { id: 1, role: "member", status: "active" },
          { id: 2, role: "member", status: "active" }
        ],
        admins: [
          { id: 3, role: "admin", status: "active" }
        ]
      };
      const result = runEngine(json, 'typescript');
      expect(result).toContain('"member" | "admin"');
    });

    it('[regression] fields absent in some objects in a unified type must be optional', () => {
      // Owner has contact.phone, but one team member does not.
      // After unification, SharedContact.phone must be optional.
      const json = {
        owner: {
          details: { first_name: 'Kouki', contact: { email: 'k@example.com', phone: '+81-00' } }
        },
        team_members: [
          { info: { first_name: 'Alex', contact: { email: 'a@example.com', phone: '+1-555' } } },
          { info: { first_name: 'Sara', contact: { email: 's@example.com' } } } // phone missing
        ]
      };
      const result = runEngine(json, 'zod');
      // phone must be rendered as optional
      expect(result).toMatch(/phone:.*\.optional\(\)/);
    });

    it('[semantic dict] key-name patterns infer correct formats without needing value patterns', () => {
      const json = {
        avatar: 'not-a-url-looking-string',
        price: 'not-a-number-looking-string',
        user_email: 'not@formatted',
      };
      const schema = inferSchema(json);
      // キー名だけで format を推論できるべき
      expect(schema.fields!.avatar.format).toBe('url');
      expect(schema.fields!.price.format).toBeUndefined();
      expect(schema.fields!.user_email.format).toBe('email');
    });

    it('[semantic dict] expanded enum keywords detected (tier, plan, severity)', () => {
      const json = { plan: 'pro', tier: 'gold', severity: 'critical' };
      const schema = inferSchema(json);
      expect(schema.fields!.plan.enumValues).toBeDefined();
      expect(schema.fields!.tier.enumValues).toBeDefined();
      expect(schema.fields!.severity.enumValues).toBeDefined();
    });
  });

  describe('Generator Quality Improvements (P0-P3)', () => {
    // Flat JSON with nested object field (profile) and array field (tags)
    const flatJson = {
      name: "Alice",
      profile: {
        bio: "Hello",
        avatar: "https://example.com/avatar.png"
      },
      tags: ["typescript", "rust"]
    };

    it('[P0] csv should expand nested objects and use proper sample values', () => {
      const result = runEngine(flatJson, 'csv');
      expect(result).toContain('name,profile,tags');
      // nested object should be expanded as JSON string, not [object Object]
      expect(result).toContain('"sample"');
      expect(result).not.toContain('[object Object]');
    });

    it('[P0] sql-insert should expand nested objects and use proper sample values', () => {
      const result = runEngine(flatJson, 'sql-insert');
      expect(result).toContain('INSERT INTO');
      expect(result).toContain('"sample"');
      expect(result).not.toContain('[object Object]');
    });

    it('[P0] markdown should expand nested objects and use proper sample values', () => {
      const result = runEngine(flatJson, 'markdown');
      expect(result).toContain('|');
      expect(result).toContain('sample');
      expect(result).not.toContain('[object Object]');
    });

    it('[P0] latex should expand nested objects and use proper sample values', () => {
      const result = runEngine(flatJson, 'latex');
      expect(result).toContain('\\begin{tabular}');
      expect(result).toContain('\\end{tabular}');
      expect(result).not.toContain('[object Object]');
    });

    it('[P1] env should flatten nested objects and use proper sample values', () => {
      const result = runEngine(flatJson, 'env');
      expect(result).toContain('PROFILE_BIO=your_value_here');
      expect(result).toContain('PROFILE_AVATAR=https://example.com');
      expect(result).toContain('TAGS=');
      expect(result).not.toContain('[object Object]');
    });

    it('[P1] properties should flatten nested objects and use proper sample values', () => {
      const result = runEngine(flatJson, 'properties');
      expect(result).toContain('profile.bio=sample_value');
      expect(result).toContain('profile.avatar=sample_value');
      expect(result).not.toContain('[object Object]');
    });

    it('[P1] curl should expand nested objects and use proper sample values', () => {
      const result = runEngine(flatJson, 'curl');
      expect(result).toContain('curl -X POST');
      expect(result).toContain('"sample"');
      expect(result).not.toContain('[object Object]');
    });

    it('[P2] solidity should generate nested structs for object fields', () => {
      const result = runEngine(flatJson, 'solidity');
      expect(result).toContain('struct Profile');
      expect(result).toContain('pragma solidity');
      expect(result).toContain('contract RootStore');
    });

    it('[P2] cobol should expand nested objects with sub-levels', () => {
      const result = runEngine(flatJson, 'cobol');
      expect(result).toContain('PIC');
      expect(result).toContain('05');
      expect(result).toContain('10');
    });

    it('[P2] clojure should handle arrays and nested objects', () => {
      const result = runEngine(flatJson, 'clojure');
      expect(result).toContain('(ns com.example.');
      expect(result).toContain('(s/def');
      expect(result).toContain('s/coll-of');
    });

    it('[P2] r should handle object/array types and format-specific values', () => {
      const result = runEngine(flatJson, 'r');
      expect(result).toContain('data.frame');
      expect(result).toContain('list()');
      expect(result).toContain('sample_value');
    });

    it('[P3] toml should use itemType sample for arrays and fixed datetime', () => {
      const json = { items: [1, 2, 3], created: "2024-01-01T00:00:00Z" };
      const result = runEngine(json, 'toml');
      expect(result).toContain('items = [0]');
      expect(result).toContain('2024-01-01T00:00:00Z');
    });

    it('[P3] yaml should use fixed datetime instead of dynamic Date', () => {
      const json = { created: "2024-01-01T00:00:00Z" };
      const result = runEngine(json, 'yaml');
      expect(result).toContain('2024-01-01T00:00:00Z');
      // should NOT contain a dynamic ISO timestamp (which would vary per run)
      expect(result).not.toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/);
    });
  });

  describe('End-to-End Feature Integration', () => {
    it('should generate Java POJO when lang is java', () => {
      const json = { id: 1, name: "Alice" };
      const out = runEngine(json, 'java', 'json-to-java-class');
      expect(out).toContain('public class Root');
      expect(out).toContain('private int id');
      expect(out).toContain('private String name');
      expect(out).toContain('@Data'); // Lombok generates getters/setters
    });

    it('should bypass inferSchema when input is already an OpenAPI Schema', () => {
      const schemaFromOpenAPI = {
        _isTypeMorphSchema: true,
        type: 'object',
        fields: {
          isActive: { type: 'boolean' }
        }
      };
      const out = runEngine(schemaFromOpenAPI, 'typescript', 'json-to-typescript');
      expect(out).toContain('isActive: boolean;');
    });
  });

  describe('samplesMode (F-8: treat array as N samples of one schema)', () => {
    const samples = [
      { id: 1, status: 'active', role: 'admin' },
      { id: 2, status: 'pending', role: 'user' },
      { id: 3, status: 'cancelled', role: 'user' },
    ];

    it('default (off): a root array is an array of items → z.array wrapper', () => {
      const out = runEngine(samples, 'zod', '', { rootName: 'User' });
      expect(out).toContain('z.array(userItemSchema)');
    });

    it('on: emits the merged object as the root, no z.array wrapper', () => {
      const out = runEngine(samples, 'zod', '', { rootName: 'User', samplesMode: true });
      expect(out).toContain('export const userSchema = z.object({');
      expect(out).not.toContain('z.array(');
      expect(out).not.toContain('ItemSchema');
    });

    it('aggregates across samples: enums widen, missing fields become optional', () => {
      const out = runEngine(
        [{ status: 'active', nickname: 'a' }, { status: 'pending' }, { status: 'cancelled' }],
        'zod', '', { rootName: 'User', samplesMode: true },
      );
      expect(out).toContain('z.enum(["active", "pending", "cancelled"])');
      expect(out).toMatch(/nickname:.*\.optional\(\)/);
    });

    it('is a no-op for a single (non-array) object', () => {
      const out = runEngine({ id: 1 }, 'zod', '', { rootName: 'User', samplesMode: true });
      expect(out).toContain('export const userSchema = z.object({');
    });
  });
});

