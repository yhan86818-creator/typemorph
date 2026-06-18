import { describe, it, expect } from 'vitest';
import { parseYAML, parseXML, parseSQLToZod, parseCurl, curlToTypeScript, parseOpenAPI, parseTypeScriptToSchema, parseEnvFile } from './parsers';

describe('parsers', () => {
  describe('parseYAML', () => {
    it('should parse valid YAML', () => {
      const result = parseYAML('name: test\nage: 20');
      expect(result).toEqual({ name: 'test', age: 20 });
    });

    it('should return null for invalid YAML instead of an error object', () => {
      const result = parseYAML('name: test\n  invalid: indent');
      expect(result).toBeNull();
    });

    it('should wrap primitive results in an object', () => {
      const result = parseYAML('test string');
      expect(result).toEqual({ value: 'test string' });
    });
  });

  describe('parseXML', () => {
    it('should parse valid XML and strip @_ prefix from attributes', () => {
      const xml = '<user id="1"><name>Alice</name></user>';
      const result = parseXML(xml);
      expect(result).toEqual({ user: { id: 1, name: 'Alice' } });
    });

    it('should return null for invalid XML', () => {
      const xml = '<user><name>Alice</unclosed>';
      const result = parseXML(xml);
      expect(result).toBeNull();
    });
  });

  describe('parseSQLToZod', () => {
    it('should accurately parse column definitions without capturing SQL keywords', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          status ENUM('active', 'inactive')
        );
      `;
      const result = parseSQLToZod(sql);
      expect(result).toContain('id: z.number()');
      expect(result).toContain('name: z.string()');
      expect(result).toContain('email: z.string()');
      expect(result).toContain('created_at: z.string() /* datetime */');
      // Should not contain SQL keywords like PRIMARY, KEY, AUTO_INCREMENT, UNIQUE etc. as keys
      expect(result).not.toContain('PRIMARY:');
      expect(result).not.toContain('KEY:');
      expect(result).not.toContain('255:');
    });

    // Regression: non-greedy regex inside parseSQLToZod breaks when there are nested parentheses
    it('[regression] should correctly extract outer parentheses and handle nested parens', () => {
      const sql = `
        CREATE TABLE products (
          id INT,
          price DECIMAL(10,2),
          tags VARCHAR(255)[]
        );
      `;
      const result = parseSQLToZod(sql);
      expect(result).toContain('id: z.number()');
      // If nested parenthesis extraction is broken, price might not be parsed correctly
      expect(result).toContain('price: z.number()');
      expect(result).toContain('tags: z.string()');
    });
  });

  describe('parseCurl', () => {
    it('should handle single quotes with escaped quotes in body', () => {
      // In bash, you escape single quotes inside single quotes like '"'"' or '\\''
      // We will test standard escaping \\' to see if our regex handles it.
      const curl = `curl -X POST https://api.example.com -d '{"name": "it\\'s a test"}'`;
      const result = parseCurl(curl);
      expect(result.method).toBe('POST');
      expect(result.url).toBe('https://api.example.com');
      expect(result.bodyJson).toEqual({ name: "it's a test" });
    });

    it('should handle double quoted body', () => {
      const curl = `curl -X POST https://api.example.com -d "{\\"name\\": \\"test\\"}"`;
      const result = parseCurl(curl);
      expect(result.bodyJson).toEqual({ name: 'test' });
    });
  });

  describe('curlToTypeScript', () => {
    it('should inject Content-Type header if body is JSON and header is missing', () => {
      const parsed = {
        method: 'POST',
        url: 'https://api.example.com',
        headers: { Authorization: 'Bearer token' },
        body: '{"name": "test"}',
        bodyJson: { name: 'test' }
      };
      const result = curlToTypeScript(parsed);
      expect(result).toContain('"Content-Type": "application/json"');
    });

    it('should not override existing Content-Type header', () => {
      const parsed = {
        method: 'POST',
        url: 'https://api.example.com',
        headers: { 'Content-Type': 'application/custom+json' },
        body: '{"name": "test"}',
        bodyJson: { name: 'test' }
      };
      const result = curlToTypeScript(parsed);
      expect(result).toContain('"Content-Type": "application/custom+json"');
      expect(result).not.toContain('"application/json"');
    });
  });

  describe('parseSQLToZod [regression]', () => {
    it('should not break when DEFAULT value contains parentheses inside a string literal', () => {
      const sql = `
        CREATE TABLE orders (
          id INT PRIMARY KEY,
          label VARCHAR(100) DEFAULT 'str(ing)',
          status VARCHAR(20) NOT NULL
        );
      `;
      const result = parseSQLToZod(sql);
      expect(result).toContain('label');
      expect(result).toContain('status');
      expect(result).not.toContain('ing)');
    });

    it('[regression] should not split on commas inside SQL string literals (DEFAULT a,b,c)', () => {
      // Previously body.split(/,\s*(?![^()]*\))/) would split on commas inside 'a,b,c'
      // producing garbage field names like "b" and "c'" instead of treating them as one token.
      const sql = `
        CREATE TABLE items (
          id INT PRIMARY KEY,
          note VARCHAR(200) DEFAULT 'a,b,c',
          price DECIMAL(10,2) DEFAULT 0.0,
          status VARCHAR(20) NOT NULL
        );
      `;
      const result = parseSQLToZod(sql);
      // Real columns must appear
      expect(result).toContain('note');
      expect(result).toContain('price');
      expect(result).toContain('status');
      // Garbage splits from inside the string literal must NOT appear as field names
      expect(result).not.toMatch(/^\s+b:/m);
      expect(result).not.toMatch(/^\s+c':/m);
    });

    it('should correctly parse ENUM to z.enum', () => {
      const sql = `
        CREATE TABLE users (
          id INT PRIMARY KEY,
          role ENUM('admin', 'member', 'guest') NOT NULL
        );
      `;
      const result = parseSQLToZod(sql);
      expect(result).toContain("role: z.enum(['admin', 'member', 'guest'])");
    });
  });

  describe('parseCurl [regression]', () => {
    it('should preserve JSON body whitespace and not collapse it', () => {
      const curl = `curl -X POST https://api.example.com/users \
        -H 'Content-Type: application/json' \
        -d '{"name": "test", "age": 42}'`;
      const result = parseCurl(curl);
      // bodyJson must be correctly parsed (not mangled by whitespace collapse)
      expect(result.bodyJson).toEqual({ name: 'test', age: 42 });
      expect(result.url).toBe('https://api.example.com/users');
    });

    it('[regression] curlToTypeScript should escape single quotes in raw bodies to avoid syntax errors', () => {
      const curl = `curl -X POST https://api.example.com/text -d "hello 'world' and \\slash"`;
      const parsed = parseCurl(curl);
      const tsCode = curlToTypeScript(parsed);
      // body string must be properly escaped inside the single quotes generated by the template
      expect(tsCode).toContain("body: 'hello \\'world\\' and \\\\slash'");
    });
  });

  describe('parseOpenAPI', () => {
    it('should parse OpenAPI 3.0 YAML spec', () => {
      const yaml = `
openapi: 3.0.0
components:
  schemas:
    User:
      type: object
      required:
        - id
        - username
      properties:
        id:
          type: string
          format: uuid
        username:
          type: string
        age:
          type: integer
          format: int32
        isActive:
          type: boolean
        role:
          type: string
          enum: [admin, user, guest]
`;
      const result = parseOpenAPI(yaml);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('object');
      expect(result?.fields?.id.format).toBe('uuid');
      expect(result?.fields?.id.optional).toBeFalsy();
      expect(result?.fields?.age.format).toBe('int');
      expect(result?.fields?.isActive.type).toBe('boolean');
      expect(result?.fields?.role.enumValues).toEqual(['admin', 'user', 'guest']);
    });

    it('should parse Swagger 2.0 JSON spec', () => {
      const json = JSON.stringify({
        swagger: "2.0",
        definitions: {
          Product: {
            type: "object",
            properties: {
              name: { type: "string" },
              price: { type: "number", format: "double" }
            }
          }
        }
      });
      const result = parseOpenAPI(json);
      expect(result).not.toBeNull();
      expect(result?.type).toBe('object');
      expect(result?.fields?.name.type).toBe('string');
      expect(result?.fields?.price.format).toBe('float');
    });

    it('should resolve $ref references', () => {
      const yaml = `
openapi: 3.0.0
components:
  schemas:
    Order:
      type: object
      properties:
        user:
          $ref: '#/components/schemas/User'
    User:
      type: object
      properties:
        id:
          type: string
          format: uuid
`;
      const result = parseOpenAPI(yaml);
      expect(result).not.toBeNull();
      expect(result?.fields?.user.type).toBe('object');
      expect(result?.fields?.user.fields?.id.format).toBe('uuid');
    });
  });

  describe('parseTypeScriptToSchema', () => {
    it('should parse basic TypeScript interfaces', () => {
      const ts = `
        interface User {
          id: string;
          age: number;
          isActive: boolean;
        }
      `;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema).toBeDefined();
      expect(schema?.type).toBe('object');
      expect((schema as any)._isTypeMorphSchema).toBe(true);
      expect(schema?.fields?.id?.type).toBe('string');
      expect(schema?.fields?.age?.type).toBe('number');
      expect(schema?.fields?.isActive?.type).toBe('boolean');
    });

    it('should parse optional fields and Date types', () => {
      const ts = `
        export type Post = {
          title: string;
          content?: string;
          createdAt: Date;
        }
      `;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.content?.type).toBe('string');
      expect(schema?.fields?.content?.optional).toBe(true);
      expect(schema?.fields?.createdAt?.type).toBe('string');
      expect(schema?.fields?.createdAt?.format).toBe('datetime');
    });

    it('should parse arrays and literal unions', () => {
      const ts = `
        interface Config {
          tags: string[];
          role: 'admin' | 'user' | 'guest';
        }
      `;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.tags?.type).toBe('array');
      expect(schema?.fields?.tags?.itemType?.type).toBe('string');
      expect(schema?.fields?.role?.type).toBe('string');
      expect(schema?.fields?.role?.enumValues).toEqual(['admin', 'user', 'guest']);
    });

    it('string | null → nullable string, not any', () => {
      const ts = `interface T { name: string | null; }`;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.name?.type).toBe('string');
      expect(schema?.fields?.name?.nullable).toBe(true);
      expect(schema?.fields?.name?.optional).toBeFalsy();
    });

    it('string | undefined → optional string', () => {
      const ts = `interface T { name: string | undefined; }`;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.name?.type).toBe('string');
      expect(schema?.fields?.name?.optional).toBe(true);
    });

    it('number | null | undefined → nullable optional number', () => {
      const ts = `interface T { count: number | null | undefined; }`;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.count?.type).toBe('number');
      expect(schema?.fields?.count?.nullable).toBe(true);
      expect(schema?.fields?.count?.optional).toBe(true);
    });

    it('string | number → union with unionTypes', () => {
      const ts = `interface T { id: string | number; }`;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.id?.type).toBe('union');
      expect(schema?.fields?.id?.unionTypes).toEqual(['string', 'number']);
    });

    it("'active' | 'inactive' | null → nullable enum", () => {
      const ts = `interface T { status: 'active' | 'inactive' | null; }`;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.status?.type).toBe('string');
      expect(schema?.fields?.status?.enumValues).toEqual(['active', 'inactive']);
      expect(schema?.fields?.status?.nullable).toBe(true);
    });

    it('inline nested object → fields.address.type is object, no field leakage', () => {
      const ts = `interface Order { id: string; address: { city: string; zip: string }; }`;
      const schema = parseTypeScriptToSchema(ts);
      // address must be an object, not 'any'
      expect(schema?.fields?.address?.type).toBe('object');
      expect(schema?.fields?.address?.fields?.city?.type).toBe('string');
      expect(schema?.fields?.address?.fields?.zip?.type).toBe('string');
      // zip must NOT leak to top level
      expect(schema?.fields?.zip).toBeUndefined();
      expect(schema?.fields?.city).toBeUndefined();
    });

    it('deeply nested objects parse recursively', () => {
      const ts = `interface A { outer: { inner: { value: number } } }`;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.outer?.type).toBe('object');
      expect(schema?.fields?.outer?.fields?.inner?.type).toBe('object');
      expect(schema?.fields?.outer?.fields?.inner?.fields?.value?.type).toBe('number');
    });

    it('readonly fields are parsed correctly', () => {
      const ts = `interface User { readonly id: string; name: string; }`;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.id?.type).toBe('string');
      expect(schema?.fields?.name?.type).toBe('string');
    });

    it('optional nested object', () => {
      const ts = `interface User { id: string; address?: { city: string }; }`;
      const schema = parseTypeScriptToSchema(ts);
      expect(schema?.fields?.address?.type).toBe('object');
      expect(schema?.fields?.address?.optional).toBe(true);
      expect(schema?.fields?.address?.fields?.city?.type).toBe('string');
    });
  });

  describe('parseEnvFile', () => {
    it('parses basic key=value pairs', () => {
      const result = parseEnvFile('PORT=3000\nDEBUG=true\nNAME=myapp');
      expect(result).not.toBeNull();
      expect(result?.fields?.PORT?.type).toBe('number');
      expect(result?.fields?.DEBUG?.type).toBe('boolean');
      expect(result?.fields?.NAME?.type).toBe('string');
    });

    it('skips comment lines and blank lines', () => {
      const result = parseEnvFile('# comment\n\nFOO=bar\n# another');
      expect(Object.keys(result?.fields ?? {})).toEqual(['FOO']);
    });

    it('detects https:// URLs', () => {
      const result = parseEnvFile('API_URL=https://api.example.com');
      expect(result?.fields?.API_URL?.format).toBe('url');
    });

    it('detects database URLs like postgresql://', () => {
      const result = parseEnvFile('DATABASE_URL=postgresql://user:pass@localhost/db');
      expect(result?.fields?.DATABASE_URL?.format).toBe('url');
    });

    it('detects redis:// URLs', () => {
      const result = parseEnvFile('REDIS_URL=redis://localhost:6379');
      expect(result?.fields?.REDIS_URL?.format).toBe('url');
    });

    it('detects email format', () => {
      const result = parseEnvFile('ADMIN_EMAIL=admin@example.com');
      expect(result?.fields?.ADMIN_EMAIL?.format).toBe('email');
    });

    it('marks empty values as optional', () => {
      const result = parseEnvFile('SECRET=');
      expect(result?.fields?.SECRET?.optional).toBe(true);
    });

    it('strips surrounding quotes from values', () => {
      const result = parseEnvFile('FOO="hello"\nBAR=\'world\'');
      expect(result?.fields?.FOO?.type).toBe('string');
      expect(result?.fields?.BAR?.type).toBe('string');
    });

    it('returns null for empty input', () => {
      expect(parseEnvFile('')).toBeNull();
      expect(parseEnvFile('# only comments\n\n')).toBeNull();
    });

    it('sets _isTypeMorphSchema flag', () => {
      const result = parseEnvFile('KEY=value') as any;
      expect(result?._isTypeMorphSchema).toBe(true);
    });
  });

  describe('env diff logic (via parseEnvFile)', () => {
    function diffEnv(a: string, b: string) {
      const schemaA = parseEnvFile(a);
      const schemaB = parseEnvFile(b);
      if (!schemaA || !schemaB) return null;
      const fa: Record<string, any> = schemaA.fields ?? {};
      const fb: Record<string, any> = schemaB.fields ?? {};
      const allKeys = Array.from(new Set([...Object.keys(fa), ...Object.keys(fb)]));
      return allKeys.map(key => {
        const a = fa[key] ?? null;
        const b = fb[key] ?? null;
        const ta = a ? `${a.type}:${a.format ?? ''}:${a.optional ?? false}` : '';
        const tb = b ? `${b.type}:${b.format ?? ''}:${b.optional ?? false}` : '';
        let status: string;
        if (!a) status = 'added';
        else if (!b) status = 'removed';
        else if (ta !== tb) status = 'changed';
        else status = 'same';
        return { key, status };
      });
    }

    it('identical env files produce all same', () => {
      const env = 'PORT=3000\nDEBUG=true\nNAME=myapp';
      const result = diffEnv(env, env)!;
      expect(result.every(e => e.status === 'same')).toBe(true);
    });

    it('detects added key in second file', () => {
      const a = 'PORT=3000';
      const b = 'PORT=3000\nNEW_KEY=hello';
      const result = diffEnv(a, b)!;
      expect(result.find(e => e.key === 'NEW_KEY')?.status).toBe('added');
      expect(result.find(e => e.key === 'PORT')?.status).toBe('same');
    });

    it('detects removed key in second file', () => {
      const a = 'PORT=3000\nOLD_KEY=hello';
      const b = 'PORT=3000';
      const result = diffEnv(a, b)!;
      expect(result.find(e => e.key === 'OLD_KEY')?.status).toBe('removed');
    });

    it('detects type change (string → number)', () => {
      const a = 'PORT=development';
      const b = 'PORT=3000';
      const result = diffEnv(a, b)!;
      expect(result.find(e => e.key === 'PORT')?.status).toBe('changed');
    });

    it('detects format change (url → plain string)', () => {
      const a = 'API=https://api.example.com';
      const b = 'API=my-api-key';
      const result = diffEnv(a, b)!;
      expect(result.find(e => e.key === 'API')?.status).toBe('changed');
    });

    it('detects optional change (empty → value)', () => {
      const a = 'SECRET=';
      const b = 'SECRET=abc123';
      const result = diffEnv(a, b)!;
      expect(result.find(e => e.key === 'SECRET')?.status).toBe('changed');
    });
  });
});


