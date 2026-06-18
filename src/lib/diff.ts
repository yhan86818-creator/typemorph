export interface SchemaDiff {
  path: string;
  type: 'added' | 'removed' | 'renamed' | 'type_changed' | 'required_changed' | 'enum_changed' | 'format_changed' | 'nullable_changed';
  oldType?: string;
  newType?: string;
  severity: 'info' | 'warning' | 'error';
  description: string;
}

function normalizeFieldName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function renameSimilarity(a: string, b: string): number {
  const na = normalizeFieldName(a);
  const nb = normalizeFieldName(b);
  if (na === nb) return 3;
  if (na.includes(nb) || nb.includes(na)) return 2;
  const minLen = Math.min(na.length, nb.length);
  if (minLen >= 4) {
    let i = 0;
    while (i < minLen && na[i] === nb[i]) i++;
    if (i >= 4) return 1;
  }
  return 0;
}

function detectRenames(
  oldFields: Record<string, import('./types').Schema>,
  newFields: Record<string, import('./types').Schema>,
): Map<string, string> {
  const removedKeys = Object.keys(oldFields).filter(k => !(k in newFields));
  const addedKeys = Object.keys(newFields).filter(k => !(k in oldFields));
  const renames = new Map<string, string>();
  const matched = new Set<string>();

  // Two passes: prefer same-type matches, then allow cross-type
  for (const sameTypeOnly of [true, false]) {
    for (const oldKey of removedKeys) {
      if (renames.has(oldKey)) continue;
      const candidates = addedKeys.filter(nk => {
        if (matched.has(nk)) return false;
        if (sameTypeOnly && oldFields[oldKey].type !== newFields[nk].type) return false;
        return renameSimilarity(oldKey, nk) > 0;
      });
      if (candidates.length === 0) continue;
      // Among candidates, take the best score; only match if unambiguous at that score
      const bestScore = Math.max(...candidates.map(nk => renameSimilarity(oldKey, nk)));
      const best = candidates.filter(nk => renameSimilarity(oldKey, nk) === bestScore);
      if (best.length === 1) {
        renames.set(oldKey, best[0]);
        matched.add(best[0]);
      }
    }
  }

  return renames;
}

// ---------------------------------------------------------------------------
// Schema-level semantic comparison (uses inferred Schema objects)
// ---------------------------------------------------------------------------
import type { Schema } from './types';

export function compareSchemaTypes(
  oldSchema: Schema,
  newSchema: Schema,
  rootPath = 'root',
): SchemaDiff[] {
  const diffs: SchemaDiff[] = [];

  function compare(old: Schema, next: Schema, p: string) {
    const display = p.replace(/^root\.?/, '') || 'root';

    // Type changed — most severe, skip field-level recursion
    if (old.type !== next.type) {
      diffs.push({
        path: display,
        type: 'type_changed',
        oldType: old.type,
        newType: next.type,
        severity: 'error',
        description: `'${display}' changed type from '${old.type}' to '${next.type}'.`,
      });
      return;
    }

    // Required → Optional (loosening — WARNING)
    if (!old.optional && next.optional) {
      diffs.push({
        path: display,
        type: 'required_changed',
        severity: 'warning',
        description: `'${display}' changed from required to optional. Consumers must handle undefined.`,
      });
    }

    // Optional → Required (tightening — BREAKING)
    if (old.optional && !next.optional) {
      diffs.push({
        path: display,
        type: 'required_changed',
        severity: 'error',
        description: `'${display}' changed from optional to required. Existing payloads missing this field will be invalid.`,
      });
    }

    // Nullable added (safe) / removed (breaking)
    if (!old.nullable && next.nullable) {
      diffs.push({
        path: display,
        type: 'nullable_changed',
        severity: 'info',
        description: `'${display}' became nullable. Add null-checks if needed.`,
      });
    }
    if (old.nullable && !next.nullable) {
      diffs.push({
        path: display,
        type: 'nullable_changed',
        severity: 'warning',
        description: `'${display}' is no longer nullable. Existing null values will be invalid.`,
      });
    }

    // Format changed
    if ((old.format ?? '') !== (next.format ?? '')) {
      diffs.push({
        path: display,
        type: 'format_changed',
        oldType: old.format ?? 'none',
        newType: next.format ?? 'none',
        severity: old.format && !next.format ? 'warning' : 'info',
        description: `'${display}' format changed from '${old.format ?? 'none'}' to '${next.format ?? 'none'}'.`,
      });
    }

    // Enum changes
    const oldEnums = old.enumValues ?? [];
    const newEnums = next.enumValues ?? [];
    if (oldEnums.length > 0 || newEnums.length > 0) {
      const removed = oldEnums.filter(v => !newEnums.includes(v));
      const added = newEnums.filter(v => !oldEnums.includes(v));
      if (removed.length > 0) {
        diffs.push({
          path: display,
          type: 'enum_changed',
          severity: 'error',
          description: `Enum values removed from '${display}': ${removed.map(v => `"${v}"`).join(', ')}. Existing data with these values will be invalid.`,
        });
      }
      if (added.length > 0) {
        diffs.push({
          path: display,
          type: 'enum_changed',
          severity: 'info',
          description: `New enum values added to '${display}': ${added.map(v => `"${v}"`).join(', ')}.`,
        });
      }
    }

    // Object fields
    if (old.type === 'object' && next.type === 'object') {
      const oldFields = old.fields ?? {};
      const newFields = next.fields ?? {};
      const renames = detectRenames(oldFields, newFields);
      const renamedToKeys = new Set(renames.values());

      for (const oldKey of Object.keys(oldFields)) {
        const prefix = display === 'root' ? '' : display + '.';
        if (oldKey in newFields) continue; // handled below
        if (renames.has(oldKey)) {
          const newKey = renames.get(oldKey)!;
          const typeChanged = oldFields[oldKey].type !== newFields[newKey].type;
          diffs.push({
            path: `${prefix}${oldKey}`,
            type: 'renamed',
            oldType: oldKey,
            newType: newKey,
            severity: 'error',
            description: typeChanged
              ? `'${oldKey}' renamed to '${newKey}' (type: ${oldFields[oldKey].type} → ${newFields[newKey].type}). Clients using the old name will break.`
              : `'${oldKey}' renamed to '${newKey}'. Clients using the old name will break.`,
          });
          if (!typeChanged && oldFields[oldKey].type === 'object') {
            compare(oldFields[oldKey], newFields[newKey], `${p}.${newKey}`);
          }
        } else {
          const wasRequired = !oldFields[oldKey].optional;
          diffs.push({
            path: `${prefix}${oldKey}`,
            type: 'removed',
            oldType: oldFields[oldKey].type,
            severity: wasRequired ? 'error' : 'warning',
            description: wasRequired
              ? `Required field '${oldKey}' was removed. This is a breaking change.`
              : `Optional field '${oldKey}' was removed.`,
          });
        }
      }

      for (const newKey of Object.keys(newFields)) {
        const prefix = display === 'root' ? '' : display + '.';
        if (newKey in oldFields) continue; // handled below
        if (renamedToKeys.has(newKey)) continue; // already handled as rename target
        const isRequired = !newFields[newKey].optional;
        diffs.push({
          path: `${prefix}${newKey}`,
          type: 'added',
          newType: newFields[newKey].type,
          severity: isRequired ? 'error' : 'info',
          description: isRequired
            ? `New required field '${newKey}' added. Existing payloads missing this field will be invalid.`
            : `New optional field '${newKey}' added.`,
        });
      }

      for (const key of Object.keys(oldFields)) {
        if (key in newFields) {
          compare(oldFields[key], newFields[key], `${p}.${key}`);
        }
      }
    }

    // Array item type
    if (old.type === 'array' && next.type === 'array' && old.itemType && next.itemType) {
      compare(old.itemType, next.itemType, `${p}[]`);
    }
  }

  compare(oldSchema, newSchema, rootPath);
  return diffs;
}

export function compareSchemas(oldObj: any, newObj: any): SchemaDiff[] {
  const diffs: SchemaDiff[] = [];

  // Helper to extract primitive types or structural descriptions
  function getTypeSignature(val: any): string {
    if (val === null) return 'null';
    if (Array.isArray(val)) {
      if (val.length === 0) return 'any[]';
      const types = Array.from(new Set(val.map(item => getTypeSignature(item))));
      return `(${types.join(' | ')})[]`;
    }
    if (typeof val === 'object') return 'object';
    return typeof val; // string, number, boolean
  }

  // Helper to flatten object keys into paths with type signatures
  function flattenSchema(obj: any, path: string = 'root', registry: Map<string, string> = new Map(), seen: Set<any> = new Set()) {
    if (obj === null || obj === undefined) {
      registry.set(path, 'null');
      return registry;
    }

    if (typeof obj === 'object') {
      if (seen.has(obj)) return registry;
      seen.add(obj);
    }

    const currentType = getTypeSignature(obj);
    registry.set(path, currentType);

    if (Array.isArray(obj)) {
      const objectElements = obj.filter(x => x !== null && typeof x === 'object' && !Array.isArray(x));
      if (objectElements.length > 0) {
        const mergedObj: any = {};
        for (const element of objectElements) {
          for (const key of Object.keys(element)) {
            if (!(key in mergedObj)) {
              mergedObj[key] = element[key];
            }
          }
        }
        seen.add(mergedObj);
        flattenSchema(mergedObj, `${path}[]`, registry, seen);
      } else {
        const nonObjectElements = obj.filter(x => x === null || typeof x !== 'object' || Array.isArray(x));
        if (nonObjectElements.length > 0) {
          const elementTypes = Array.from(new Set(nonObjectElements.map(x => getTypeSignature(x)))).sort();
          const elementTypeSig = elementTypes.length === 1 ? elementTypes[0] : `(${elementTypes.join(' | ')})`;
          registry.set(`${path}[]`, elementTypeSig);
        }
      }
    } else if (typeof obj === 'object') {
      for (const key of Object.keys(obj)) {
        flattenSchema(obj[key], `${path}.${key}`, registry, seen);
      }
    }

    return registry;
  }

  const oldFlat = flattenSchema(oldObj);
  const newFlat = flattenSchema(newObj);

  // Compare old paths against new paths
  for (const [path, oldType] of oldFlat.entries()) {
    // We ignore general 'object' matches if subfields cover them
    if (oldType === 'object') continue;
    if (path.endsWith('[]')) {
      const hasSubfields = Array.from(oldFlat.keys()).some(k => k.startsWith(path + '.'));
      if (hasSubfields) continue; // subfields cover this array entry in detail
    }

    const displayPath = path.replace(/^root\./, '');

    if (!newFlat.has(path)) {
      diffs.push({
        path: displayPath,
        type: 'removed',
        oldType,
        severity: 'error',
        description: `Field '${displayPath}' was removed. Frontend code referencing this property will break.`
      });
    } else {
      const newType = newFlat.get(path)!;
      if (newType === 'object') continue;

      if (oldType !== newType) {
        let severity: 'info' | 'warning' | 'error' = 'error';
        let desc = `Type changed from '${oldType}' to '${newType}'.`;

        if (newType === 'null' || oldType + ' | null' === newType || newType.includes('null')) {
          severity = 'warning';
          desc = `Field '${displayPath}' became optional or nullable. Update frontend to use optional chaining (\`?.\`).`;
        } else if (oldType === 'any[]' && newType !== 'any[]') {
          severity = 'info';
          desc = `Array '${displayPath}' resolved from empty array to type '${newType}'.`;
        } else {
          desc = `Field '${displayPath}' changed type from '${oldType}' to '${newType}'. Might break existing logic.`;
        }

        diffs.push({
          path: displayPath,
          type: 'type_changed',
          oldType,
          newType,
          severity,
          description: desc
        });
      }
    }
  }

  // Compare new paths for additions
  for (const [path, newType] of newFlat.entries()) {
    if (newType === 'object') continue;
    if (path.endsWith('[]')) {
      const hasSubfields = Array.from(newFlat.keys()).some(k => k.startsWith(path + '.'));
      if (hasSubfields) continue; // subfields cover this array entry in detail

      // If the parent array path existed in the old flat map (e.g. root.tags),
      // and that parent was an empty array placeholder (e.g. 'any[]'), then
      // a separate added entry for 'root.tags[]' is redundant because the
      // transition is already reported as a type change on the parent path.
      const parentPath = path.replace(/\[\]$/, '');
      if (oldFlat.has(parentPath)) continue;
    }

    const displayPath = path.replace(/^root\./, '');

    if (!oldFlat.has(path)) {
      diffs.push({
        path: displayPath,
        type: 'added',
        newType,
        severity: 'info',
        description: `New field '${displayPath}' of type '${newType}' added.`
      });
    }
  }

  return diffs;
}
