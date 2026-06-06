export interface SchemaDiff {
  path: string;
  type: 'added' | 'removed' | 'type_changed';
  oldType?: string;
  newType?: string;
  severity: 'info' | 'warning' | 'error';
  description: string;
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
        flattenSchema(mergedObj, `${path}[]`, registry, seen);
      } else {
        const nonObjectElements = obj.filter(x => x === null || typeof x !== 'object' || Array.isArray(x));
        if (nonObjectElements.length > 0) {
          registry.set(`${path}[]`, getTypeSignature(nonObjectElements[0]));
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
