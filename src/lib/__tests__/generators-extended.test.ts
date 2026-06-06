import { describe, it, expect } from 'vitest';
import { avroGen, mongooseGen, openApiGen, valibotGen, yupGen, typeormGen, drizzleGen } from '../generators-extended';
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
  });
});

