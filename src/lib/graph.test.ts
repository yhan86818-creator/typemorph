import { describe, it, expect } from 'vitest';
import { extractTypeGraph } from './graph';

describe('extractTypeGraph', () => {
  it('should extract basic interface fields and detect edges', () => {
    const ts = `
      export interface User {
        id: string;
        address: Address;
      }
      export interface Address {
        city: string;
        zip: string;
      }
    `;
    const graph = extractTypeGraph(ts);
    expect(graph.nodes).toHaveLength(2);
    const user = graph.nodes.find(n => n.id === 'User');
    expect(user).toBeDefined();
    expect(user!.fields.map(f => f.name)).toContain('id');
    expect(user!.fields.map(f => f.name)).toContain('address');
    const edge = graph.edges.find(e => e.from === 'User' && e.to === 'Address');
    expect(edge).toBeDefined();
    expect(edge!.label).toBe('address');
  });

  it('[bugfix BUG-04] should correctly parse interfaces containing inline nested object type literals', () => {
    // The old regex `{([^}]*)}` stopped at the FIRST `}`, so the body was truncated
    // when a field type contained an inline object literal like `{ key: string; value: any }`.
    // The balanced-brace scanner now correctly captures the full interface body.
    const ts = `export interface Config {
  id: string;
  meta: { key: string; value: any };
  status: string;
}`;
    const graph = extractTypeGraph(ts);
    const config = graph.nodes.find(n => n.id === 'Config');
    expect(config).toBeDefined();
    const fieldNames = config!.fields.map(f => f.name);
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('meta');
    expect(fieldNames).toContain('status');
  });

  it('[bugfix BUG-04] should correctly parse multiple interfaces where a later one starts after a nested brace', () => {
    // If the regex stopped at the first `}` inside Config, it would consume the
    // opening of Settings too, causing Settings to be missed entirely.
    const ts = `
      export interface Config {
        options: { timeout: number; retries: number };
        name: string;
      }
      export interface Settings {
        theme: string;
        config: Config;
      }
    `;
    const graph = extractTypeGraph(ts);
    expect(graph.nodes).toHaveLength(2);
    const settings = graph.nodes.find(n => n.id === 'Settings');
    expect(settings).toBeDefined();
    expect(settings!.fields.map(f => f.name)).toContain('theme');
    expect(settings!.fields.map(f => f.name)).toContain('config');
    const edge = graph.edges.find(e => e.from === 'Settings' && e.to === 'Config');
    expect(edge).toBeDefined();
  });

  it('should mark nodes not referenced by any other node as root', () => {
    const ts = `
      export interface Root {
        child: Child;
      }
      export interface Child {
        value: string;
      }
    `;
    const graph = extractTypeGraph(ts);
    const root = graph.nodes.find(n => n.id === 'Root');
    const child = graph.nodes.find(n => n.id === 'Child');
    expect(root!.isRoot).toBe(true);
    expect(child!.isRoot).toBe(false);
  });
});
