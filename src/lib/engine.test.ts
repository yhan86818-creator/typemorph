import { describe, it, expect } from 'vitest';
import { inferSchema, runEngine } from './engine';

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
    it('should generate valid typescript', () => {
      const json = { id: 1, title: "Post" };
      const result = runEngine(json, 'typescript');
      expect(result).toContain('interface Root');
      expect(result).toContain('id: number');
      expect(result).toContain('title: string');
    });

    it('should generate valid zod schema', () => {
      const json = { age: 25 };
      const result = runEngine(json, 'zod');
      expect(result).toContain('z.object');
      expect(result).toContain('age: z.number()');
    });
  });
});
