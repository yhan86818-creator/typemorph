import { describe, it, expect } from 'vitest';
import { swiftGen, kotlinGen, zodGen, protoGen, gqlGen } from './generators';
import { inferSchema } from './engine';

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
    it('should format types correctly (Int, Float)', () => {
      const json = { id: 42, total: 129.99 };
      const schema = inferSchema(json);
      const result = gqlGen.generate(schema, 'Root');
      expect(result).toContain('id: Int');
      expect(result).toContain('total: Float');
    });
  });
});
