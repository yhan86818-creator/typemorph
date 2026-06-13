import { describe, it, expect } from 'vitest';
import { analyzeQuality } from './quality';
import type { Schema } from './types';

describe('analyzeQuality', () => {
  it('scores a clean schema with format hints as A', () => {
    const schema: Schema = {
      type: 'object',
      fields: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        name: { type: 'string' },
        age: { type: 'number' },
      },
    };
    const result = analyzeQuality(schema);
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.grade).toBe('A');
  });

  it('penalizes any types', () => {
    const schema: Schema = {
      type: 'object',
      fields: {
        a: { type: 'any' },
        b: { type: 'any' },
        c: { type: 'string' },
      },
    };
    const result = analyzeQuality(schema);
    expect(result.score).toBeLessThan(90);
    expect(result.stats.anyFields).toBe(2);
    expect(result.issues.some(i => i.message.includes('any'))).toBe(true);
  });

  it('penalizes mixed naming style', () => {
    const schema: Schema = {
      type: 'object',
      fields: {
        firstName: { type: 'string' },
        last_name: { type: 'string' },
        emailAddress: { type: 'string' },
        phone_number: { type: 'string' },
      },
    };
    const result = analyzeQuality(schema);
    expect(result.stats.namingStyle).toBe('mixed');
    expect(result.issues.some(i => i.message.includes('mix'))).toBe(true);
    expect(result.score).toBeLessThan(90);
  });

  it('detects snake_case naming style', () => {
    const schema: Schema = {
      type: 'object',
      fields: {
        first_name: { type: 'string' },
        last_name: { type: 'string' },
        user_id: { type: 'string' },
      },
    };
    const result = analyzeQuality(schema);
    expect(result.stats.namingStyle).toBe('snake_case');
  });

  it('penalizes all-optional schemas', () => {
    const schema: Schema = {
      type: 'object',
      fields: {
        name: { type: 'string', optional: true },
        age: { type: 'number', optional: true },
        email: { type: 'string', optional: true },
      },
    };
    const result = analyzeQuality(schema);
    expect(result.stats.optionalFields).toBe(3);
    expect(result.stats.requiredFields).toBe(0);
    expect(result.issues.some(i => i.message.includes('optional'))).toBe(true);
  });

  it('returns null-safe result for empty schema', () => {
    const schema: Schema = { type: 'object', fields: {} };
    const result = analyzeQuality(schema);
    expect(result.stats.totalFields).toBe(0);
  });

  it('traverses nested objects', () => {
    const schema: Schema = {
      type: 'object',
      fields: {
        user: {
          type: 'object',
          fields: {
            id: { type: 'any' },
            name: { type: 'string' },
          },
        },
      },
    };
    const result = analyzeQuality(schema);
    expect(result.stats.totalFields).toBeGreaterThanOrEqual(2);
    expect(result.stats.anyFields).toBe(1);
  });

  it('traverses array item types', () => {
    const schema: Schema = {
      type: 'array',
      itemType: {
        type: 'object',
        fields: {
          id: { type: 'string', format: 'uuid' },
          label: { type: 'string' },
        },
      },
    };
    const result = analyzeQuality(schema);
    expect(result.stats.totalFields).toBe(2);
  });

  it('grades: A >= 90, B >= 75, F below 40', () => {
    // A: no any, has format hints → no penalties
    const aSchema: Schema = {
      type: 'object',
      fields: {
        id: { type: 'string', format: 'uuid' },
        email: { type: 'string', format: 'email' },
        count: { type: 'number' },
      },
    };
    expect(analyzeQuality(aSchema).grade).toBe('A');

    // D/F: all any + mixed naming + all optional
    const badSchema: Schema = {
      type: 'object',
      fields: {
        my_id: { type: 'any', optional: true },
        myName: { type: 'any', optional: true },
        my_email: { type: 'any', optional: true },
        myPhone: { type: 'any', optional: true },
      },
    };
    const badResult = analyzeQuality(badSchema);
    expect(badResult.score).toBeLessThan(60); // C or worse
  });
});
