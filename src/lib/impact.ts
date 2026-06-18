import type { ASTClass, ASTType } from './types';
import type { SchemaDiff } from './diff';
import { runEngine } from './engine';

export type ImpactKind = 'changed' | 'impacted' | 'safe';

export interface ImpactResult {
  classImpact: Map<string, ImpactKind>;
  changedFields: Map<string, SchemaDiff[]>;
  totalChanged: number;
  totalImpacted: number;
  totalSafe: number;
}

export interface LanguageImpact {
  target: string;
  label: string;
  affected: boolean;
}

function getClassRefs(type: ASTType): string[] {
  if (type.kind === 'classRef' && type.classRefName) return [type.classRefName];
  if (type.kind === 'array' && type.itemType) return getClassRefs(type.itemType);
  return [];
}

// Maps path prefixes (e.g. "", "items[]", "shipping_address") → ASTClass name
export function buildPathToClass(classes: ASTClass[], rootClassName: string): Map<string, string> {
  const map = new Map<string, string>();
  const classMap = new Map(classes.map(c => [c.name, c]));

  function visit(className: string, pathPrefix: string) {
    if (map.has(pathPrefix)) return;
    map.set(pathPrefix, className);
    const cls = classMap.get(className);
    if (!cls) return;
    for (const field of cls.fields) {
      const ft = field.fieldType;
      if (ft.kind === 'classRef' && ft.classRefName) {
        const next = pathPrefix ? `${pathPrefix}.${field.name}` : field.name;
        visit(ft.classRefName, next);
      } else if (ft.kind === 'array' && ft.itemType?.kind === 'classRef' && ft.itemType.classRefName) {
        const next = pathPrefix ? `${pathPrefix}.${field.name}[]` : `${field.name}[]`;
        visit(ft.itemType.classRefName, next);
      }
    }
  }

  visit(rootClassName, '');
  return map;
}

// Resolves a SchemaDiff path like "items[].price" to its owning ASTClass name
function getOwningClass(diffPath: string, pathToClass: Map<string, string>, rootClassName: string): string {
  const lastDot = diffPath.lastIndexOf('.');
  const parentPath = lastDot === -1 ? '' : diffPath.slice(0, lastDot);
  return pathToClass.get(parentPath) ?? rootClassName;
}

export function analyzeImpact(
  diffs: SchemaDiff[],
  classes: ASTClass[],
  rootClassName: string
): ImpactResult {
  const allSafe: ImpactResult = {
    classImpact: new Map(classes.map(c => [c.name, 'safe'])),
    changedFields: new Map(),
    totalChanged: 0,
    totalImpacted: 0,
    totalSafe: classes.length,
  };

  if (classes.length === 0 || diffs.length === 0) return allSafe;

  const pathToClass = buildPathToClass(classes, rootClassName);
  const classNames = new Set(classes.map(c => c.name));

  const changedClasses = new Set<string>();
  const changedFields = new Map<string, SchemaDiff[]>();

  for (const diff of diffs) {
    const owner = getOwningClass(diff.path, pathToClass, rootClassName);
    if (classNames.has(owner)) {
      changedClasses.add(owner);
      const arr = changedFields.get(owner) ?? [];
      arr.push(diff);
      changedFields.set(owner, arr);
    }
  }

  // Reverse adjacency: classRefName → Set<classes that reference it>
  const referencedBy = new Map<string, Set<string>>();
  for (const cls of classes) {
    for (const field of cls.fields) {
      for (const ref of getClassRefs(field.fieldType)) {
        if (!referencedBy.has(ref)) referencedBy.set(ref, new Set());
        referencedBy.get(ref)!.add(cls.name);
      }
    }
  }

  // BFS upward: find all classes that transitively reference a changed class
  const impactedClasses = new Set<string>();
  const queue = [...changedClasses];
  const visited = new Set(changedClasses);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const parent of referencedBy.get(current) ?? []) {
      if (!visited.has(parent)) {
        visited.add(parent);
        impactedClasses.add(parent);
        queue.push(parent);
      }
    }
  }

  const classImpact = new Map<string, ImpactKind>();
  for (const cls of classes) {
    if (changedClasses.has(cls.name)) classImpact.set(cls.name, 'changed');
    else if (impactedClasses.has(cls.name)) classImpact.set(cls.name, 'impacted');
    else classImpact.set(cls.name, 'safe');
  }

  return {
    classImpact,
    changedFields,
    totalChanged: changedClasses.size,
    totalImpacted: impactedClasses.size,
    totalSafe: classes.length - changedClasses.size - impactedClasses.size,
  };
}

export const LANG_TARGETS: { id: string; label: string }[] = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'zod', label: 'Zod' },
  { id: 'go', label: 'Go' },
  { id: 'rust', label: 'Rust' },
  { id: 'python', label: 'Python' },
  { id: 'java', label: 'Java' },
  { id: 'kotlin', label: 'Kotlin' },
  { id: 'swift', label: 'Swift' },
  { id: 'csharp', label: 'C#' },
  { id: 'dart', label: 'Dart' },
  { id: 'php', label: 'PHP' },
  { id: 'graphql', label: 'GraphQL' },
  { id: 'protobuf', label: 'Protobuf' },
  { id: 'jsonschema', label: 'JSON Schema' },
  { id: 'sql', label: 'Prisma/SQL' },
];

export function analyzeLanguageImpact(beforeJson: unknown, afterJson: unknown): LanguageImpact[] {
  return LANG_TARGETS.map(({ id, label }) => {
    try {
      const before = runEngine(beforeJson, id, '', {});
      const after = runEngine(afterJson, id, '', {});
      return { target: id, label, affected: before !== after };
    } catch {
      return { target: id, label, affected: false };
    }
  });
}
