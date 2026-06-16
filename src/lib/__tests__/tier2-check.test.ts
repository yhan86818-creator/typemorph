import { describe, it, expect } from 'vitest';
import { runEngine } from '../engine';

const JSON_INPUT = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Alice',
  email: 'alice@example.com',
  age: 28,
  is_active: true,
  created_at: '2024-01-01T10:00:00Z',
  tags: ['ts', 'node'],
  address: { city: 'Tokyo', zip: '100-0001' },
};

const check = (lang: string) => runEngine(JSON_INPUT, lang, '', { rootName: 'User' });

describe('Tier 2 generator smoke check', () => {
  it('valibot', () => { const o = check('valibot'); console.log('\n[valibot]\n' + o.slice(0, 400)); expect(o.length).toBeGreaterThan(50); });
  it('yup', () => { const o = check('yup'); console.log('\n[yup]\n' + o.slice(0, 400)); expect(o.length).toBeGreaterThan(50); });
  it('mongoose', () => { const o = check('mongoose'); console.log('\n[mongoose]\n' + o.slice(0, 400)); expect(o.length).toBeGreaterThan(50); });
  it('typeorm', () => { const o = check('typeorm'); console.log('\n[typeorm]\n' + o.slice(0, 400)); expect(o.length).toBeGreaterThan(50); });
  it('drizzle', () => { const o = check('drizzle'); console.log('\n[drizzle]\n' + o.slice(0, 400)); expect(o.length).toBeGreaterThan(50); });
  it('react-props', () => { const o = check('react-props'); console.log('\n[react-props]\n' + o.slice(0, 400)); expect(o.length).toBeGreaterThan(50); });
  it('openapi', () => { const o = check('openapi'); console.log('\n[openapi]\n' + o.slice(0, 400)); expect(o.length).toBeGreaterThan(50); });
});
