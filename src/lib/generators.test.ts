import { describe, it, expect } from 'vitest';
import { swiftGen, kotlinGen, zodGen, protoGen, gqlGen, tsGen, goGen, rustGen, jsonSchemaGen } from './generators';
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
});
