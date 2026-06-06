import { describe, it, expect } from 'vitest';
import { parseYAML, parseXML, parseSQLToZod, parseCurl, curlToTypeScript } from './parsers';

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
});

