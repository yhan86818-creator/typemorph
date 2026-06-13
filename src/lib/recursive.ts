import { Schema } from './types';

function objectFieldNames(s: Schema): string[] | null {
  if (s.type !== 'object' || !s.fields) return null;
  return Object.keys(s.fields).sort();
}

// Jaccard similarity between two sorted field-name arrays
function similarity(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const intersection = b.filter(k => setA.has(k)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Detects self-referential schemas and marks nested copies as named stubs.
 *
 * After inferSchema, a tree like:
 *   Root { id, children: Root[] }
 * appears as two separate object schemas with identical field sets.
 * This function detects that pattern and replaces the inner schema with
 *   { type: 'object', _sharedTypeName: 'Root' }   (no fields)
 * so that schemaToAST emits a classRef instead of a duplicate class.
 *
 * Threshold 0.65 — at least 65% of field names must overlap for a match.
 * Requires at least 2 fields to avoid false positives on tiny schemas.
 */
export function detectRecursiveTypes(schema: Schema, rootName: string): void {
  // For array roots, the recursive type is the item type (named `${rootName}Item`)
  const [anchor, anchorName] =
    schema.type === 'array' && schema.itemType?.type === 'object'
      ? [schema.itemType, `${rootName}Item`]
      : schema.type === 'object'
      ? [schema, rootName]
      : [null, ''];

  if (!anchor || anchor.type !== 'object' || !anchor.fields) return;

  const anchorFields: string[] | null = objectFieldNames(anchor);
  if (!anchorFields || anchorFields.length < 2) return;
  const fields = anchorFields; // narrowed to string[] for closure

  function visit(s: Schema, depth: number): void {
    if (depth > 20 || !s) return;
    // Skip already-named stubs (OpenAPI/JSON Schema components)
    if ((s as any)._sharedTypeName || (s as any)._isTypeMorphSchema) return;

    if (s.type === 'object' && s.fields && s !== anchor) {
      const candidateFields = objectFieldNames(s);
      if (candidateFields && candidateFields.length >= 1 && similarity(fields, candidateFields) >= 0.65) {
        // Replace with named stub — schemaToAST will emit a classRef
        (s as any)._sharedTypeName = anchorName;
        delete (s as any).fields;
        return;
      }
      for (const v of Object.values(s.fields)) visit(v, depth + 1);
    } else if (s.type === 'array' && s.itemType) {
      visit(s.itemType, depth + 1);
    }
  }

  for (const v of Object.values(anchor.fields)) {
    visit(v, 1);
  }
}
