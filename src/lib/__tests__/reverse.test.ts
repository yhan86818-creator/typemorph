/**
 * TypeScript → JSON sample (reverse mode) tests for reverse.ts.
 * Covers Rv1: inline nested object literals and `type X = {...}` aliases,
 * which previously produced `null` / "No interfaces found".
 */

import { describe, it, expect } from 'vitest';
import { generateSampleJson } from '../reverse';

function parse(ts: string) {
  const { json, error } = generateSampleJson(ts);
  expect(error).toBeUndefined();
  return JSON.parse(json);
}

describe('generateSampleJson — Rv1 inline objects', () => {
  it('expands inline object literal fields (no longer null)', () => {
    const out = parse(`interface User {
      id: string;
      address: { city: string; zip: number };
    }`);
    expect(out.address).not.toBeNull();
    expect(typeof out.address).toBe('object');
    expect(typeof out.address.city).toBe('string');
    expect(typeof out.address.zip).toBe('number');
  });

  it('expands arrays of inline objects (no longer [null])', () => {
    const out = parse(`interface Order {
      items: { sku: string; qty: number }[];
    }`);
    expect(Array.isArray(out.items)).toBe(true);
    expect(out.items[0]).not.toBeNull();
    expect(typeof out.items[0].sku).toBe('string');
    expect(typeof out.items[0].qty).toBe('number');
  });

  it('handles inline objects nested inside inline objects', () => {
    const out = parse(`interface Company {
      ceo: { name: string; contact: { email: string } };
    }`);
    expect(out.ceo.contact.email).toContain('@');
  });
});

describe('generateSampleJson — Rv1 type aliases', () => {
  it('builds a sample from a standalone object type alias', () => {
    const out = parse(`type User = { id: string; name: string };`);
    expect(typeof out.id).toBe('string');
    expect(typeof out.name).toBe('string');
  });

  it('resolves a type alias referenced by an interface and picks the interface as root', () => {
    const out = parse(`type Address = { city: string; zip: number };
      interface User {
        id: string;
        address: Address;
      }`);
    // User is the root (Address is referenced), so the top-level object has id + address
    expect(out.id).toBeDefined();
    expect(out.address.city).toBeDefined();
    expect(typeof out.address.zip).toBe('number');
  });
});
