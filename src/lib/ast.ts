import { Schema, SchemaType, ASTClass, ASTField, ASTType, ASTTypeKind } from './types';

const toPascalCase = (str: string) => str.replace(/(^\w|_\w)/g, m => m.replace(/_/, '').toUpperCase());

// ASTType が特定のクラス名を参照しているか（配列要素も再帰的に確認）
const astTypeRefersTo = (type: ASTType | undefined, name: string): boolean => {
  if (!type) return false;
  if (type.kind === 'classRef') return type.classRefName === name;
  if (type.kind === 'array') return astTypeRefersTo(type.itemType, name);
  return false;
};

/**
 * トップレベルが配列の場合に生成される「要素クラス」の最終的な PascalCase 名を返す。
 * schemaToAST の traverse() / resolveNameCollisions() と同じ命名規則を用いるため、
 * 生成済みクラス名と確実に一致する。配列でない場合は null。
 */
export const rootArrayItemClassName = (schema: Schema, rootName: string): string | null => {
  if (schema.type !== 'array' || !schema.itemType) return null;
  let childItemName = schema.itemType._sharedTypeName;
  if (!childItemName) {
    if (rootName.endsWith('ies')) childItemName = rootName.slice(0, -3) + 'y';
    else if (rootName.endsWith('s')) childItemName = rootName.slice(0, -1);
    else if (rootName.endsWith('List')) childItemName = rootName.slice(0, -4);
    else childItemName = rootName + 'Item';
  }
  // resolveNameCollisions と同じ PascalCase 化
  return childItemName.includes('_')
    ? childItemName.split('_').map(part => toPascalCase(part)).join('')
    : toPascalCase(childItemName);
};

// Schema の個別の型表現から ASTType へのコンバーター
export const convertToASTType = (v: Schema, parentClassPrefix: string, fieldKey: string): ASTType => {
  if (v.type === 'union' && v.unionTypes) {
    return {
      kind: 'union',
      unionTypes: v.unionTypes as ASTTypeKind[]
    };
  }
  
  if (v.type === 'string') {
    if (v.enumValues) {
      return { kind: 'enum', enumValues: v.enumValues };
    }
    if (v.format === 'date') return { kind: 'date', format: 'date' };
    if (v.format === 'datetime') return { kind: 'datetime', format: 'datetime' };
    return { kind: 'string', format: v.format };
  }
  
  if (v.type === 'object') {
    const className = v._sharedTypeName ?? (parentClassPrefix + "_" + fieldKey);
    return { kind: 'classRef', classRefName: className };
  }
  
  if (v.type === 'array' && v.itemType) {
    const childPrefix = parentClassPrefix + "_" + fieldKey;

    // For object array items, compute the classRefName using the SAME singularization
    // logic as schemaToAST's traverse() to prevent name mismatch bugs.
    if (v.itemType.type === 'object') {
      let childItemName = v.itemType._sharedTypeName;
      if (!childItemName) {
        if (childPrefix.endsWith('ies')) {
          childItemName = childPrefix.slice(0, -3) + 'y';
        } else if (childPrefix.endsWith('s')) {
          childItemName = childPrefix.slice(0, -1);
        } else if (childPrefix.endsWith('List')) {
          childItemName = childPrefix.slice(0, -4);
        } else {
          childItemName = childPrefix + '_Item';
        }
      }
      return {
        kind: 'array',
        itemType: { kind: 'classRef', classRefName: childItemName }
      };
    }

    return {
      kind: 'array',
      itemType: convertToASTType(v.itemType, childPrefix, 'Item')
    };
  }
  
  // safe mapping for primitives to ASTTypeKind
  // At this point v.type is one of: 'number' | 'boolean' | 'any' | 'union' (others handled above)
  const primitiveMap: Partial<Record<SchemaType, ASTTypeKind>> = {
    number: 'number',
    boolean: 'boolean',
    any: 'any',
    union: 'union',
  };
  const kind: ASTTypeKind = primitiveMap[v.type] ?? 'any';
  return { kind, format: v.format };
};

// スキーマ・リファクタリングエンジン (AST 最適化)
export const optimizeAST = (
  classes: ASTClass[],
  options: { flattenWrappers?: boolean; extractTimestamps?: boolean } = {}
): ASTClass[] => {
  let optimized: ASTClass[] = classes.map(cls => ({ 
    ...cls, 
    fields: [...cls.fields], 
    annotations: cls.annotations ? [...cls.annotations] : undefined 
  }));
  
  const flattenWrappers = options.flattenWrappers !== false;
  const extractTimestamps = options.extractTimestamps !== false;

  // 1. ボイラープレートの削減（TimestampModel の自動切り出し・継承）
  if (extractTimestamps) {
    const timestampFields = ['createdAt', 'updatedAt', 'deletedAt', 'created_at', 'updated_at', 'deleted_at'];
    let hasTimestampBase = false;
    let baseFields: ASTField[] = [];

    // まずベースとなるタイムスタンプフィールドを収集
    for (const cls of optimized) {
      const foundTimestamps = cls.fields.filter(f => timestampFields.includes(f.name));
      if (foundTimestamps.length >= 2 && baseFields.length === 0) {
        baseFields = foundTimestamps.map(f => ({ ...f, docComment: "Audit timestamp metadata" }));
        break;
      }
    }

    if (baseFields.length >= 2) {
      for (const cls of optimized) {
        if (cls.name === 'TimestampModel') continue;
        const foundTimestamps = cls.fields.filter(f => timestampFields.includes(f.name));
        
        const isExactMatch = foundTimestamps.length === baseFields.length && 
          foundTimestamps.every(f => baseFields.some(b => b.name === f.name));

        if (foundTimestamps.length >= 2 && isExactMatch) {
          if (!hasTimestampBase) {
            optimized.push({
              name: 'TimestampModel',
              fields: baseFields,
              isShared: true,
              docComment: "Base audit trail timestamp fields"
            });
            hasTimestampBase = true;
          }
          // 重複フィールドを除外し、継承アノテーションを追加
          cls.fields = cls.fields.filter(f => !timestampFields.includes(f.name));
          if (!cls.annotations) cls.annotations = [];
          cls.annotations.push('extends TimestampModel');
        }
      }
    }
  }

  // 2. 不必要なネストの排除（Flattening）
  if (flattenWrappers) {
    let changed = true;
    const flattenedNames = new Set<string>(); // Prevent cycle deletion
    while (changed) {
      changed = false;
      for (let i = 0; i < optimized.length; i++) {
        const cls = optimized[i];
        if (cls.name === 'Root') continue; // ルートはフラット化しない
        
        if (cls.fields.length === 1) {
          const singleField = cls.fields[0];
          if (singleField.fieldType.kind === 'classRef') {
            const targetClassName = singleField.fieldType.classRefName;
            if (!targetClassName) continue;
            
            // Cycle prevention
            if (targetClassName === cls.name || flattenedNames.has(targetClassName)) continue;
            
            const targetClass = optimized.find(c => c.name === targetClassName);

            // Only flatten when the target has multiple fields OR has annotations (e.g. extends TimestampModel).
            // This prevents cascading collapse of deeply-nested single-field objects.
            if (targetClass && (targetClass.fields.length > 1 || (targetClass.annotations?.length ?? 0) > 0)) {
              // 親クラスのフィールドをターゲットクラスの内容で展開
              cls.fields = targetClass.fields.map(f => ({
                ...f,
                docComment: `[Flattened from ${targetClassName}] ${f.docComment ?? ""}`
              }));
              
              // マージ元のアノテーション（extendsなど）を引き継ぐ！
              if (targetClass.annotations && targetClass.annotations.length > 0) {
                if (!cls.annotations) cls.annotations = [];
                for (const ann of targetClass.annotations) {
                  if (!cls.annotations.includes(ann)) {
                    cls.annotations.push(ann);
                  }
                }
              }

              // ターゲットがこのラッパー以外のクラスからも参照されている場合は削除しない。
              // 削除すると残った参照が宙に浮き、未定義型（ダングリング参照）を生成してしまう。
              const stillReferenced = optimized.some(c =>
                c !== cls && c.name !== targetClassName && (
                  c.fields.some(f => astTypeRefersTo(f.fieldType, targetClassName)) ||
                  (c.annotations?.includes(`extends ${targetClassName}`) ?? false)
                )
              );
              if (!stillReferenced) {
                // 不要になったターゲットクラスを除外
                optimized = optimized.filter(c => c.name !== targetClassName);
              }
              flattenedNames.add(targetClassName);
              changed = true;
              break;
            }
          }
        }
      }
    }
  }

  return optimized;
};

// スキーマ全体から ASTClass の平坦な配列を生成するメインビルダー
export const schemaToAST = (
  schema: Schema,
  rootName: string = 'Root',
  options: { flattenWrappers?: boolean; extractTimestamps?: boolean } = {}
): ASTClass[] => {
  const classes: ASTClass[] = [];
  const seenSchemas = new Set<Schema>();
  const seenClasses = new Set<string>();

  const traverse = (s: Schema, name: string) => {
    if (seenSchemas.has(s)) return;
    seenSchemas.add(s);

    if (s.type === 'array' && s.itemType) {
      let childItemName = s.itemType._sharedTypeName;
      if (!childItemName) {
        if (name.endsWith('ies')) childItemName = name.slice(0, -3) + 'y';
        else if (name.endsWith('s')) childItemName = name.slice(0, -1);
        else if (name.endsWith('List')) childItemName = name.slice(0, -4);
        else childItemName = name + 'Item';
      }
      traverse(s.itemType, childItemName);
      return;
    }

    if (s.type !== 'object' || !s.fields) return;

    // 1. 共通型名が指定されている場合、すでに処理済みなら早期リターンして重複排除！
    if (s._sharedTypeName && seenClasses.has(s._sharedTypeName)) return;

    const className = s._sharedTypeName ?? name;
    seenClasses.add(className);

    const fields: ASTField[] = [];

    for (const [k, v] of Object.entries(s.fields)) {
      const fieldType = convertToASTType(v, className, k);
      fields.push({
        name: k,
        fieldType,
        isOptional: !!v.optional,
        isNullable: !!v.nullable,
        // ここで将来アノテーションやメタデータを自動付与可能に！（拡張性◎）
        annotations: [],
        docComment: ""
      });
    }

    classes.push({
      name: className,
      fields,
      annotations: [],
      isShared: !!s._sharedTypeName
    });

    // 子オブジェクトの再帰収集 (アンダースコア _ パスで一意性を完全担保)
    for (const [k, v] of Object.entries(s.fields)) {
      const childName = v._sharedTypeName ?? (className + "_" + k);
      if (v.type === 'object') {
        traverse(v, childName);
      }
      if (v.type === 'array' && v.itemType?.type === 'object') {
        let childItemName = v.itemType._sharedTypeName;
        if (!childItemName) {
          if (k.endsWith('ies')) {
            childItemName = childName.slice(0, -3) + 'y';
          } else if (k.endsWith('s')) {
            childItemName = childName.slice(0, -1);
          } else if (k.endsWith('List')) {
            childItemName = childName.slice(0, -4);
          } else {
            childItemName = childName + "_Item";
          }
        }
        traverse(v.itemType, childItemName);
      }
    }
  };

  traverse(schema, rootName);
  return resolveNameCollisions(optimizeAST(classes, options));
};

// 名前衝突レゾルバー (AST 名前空間の衝突をインテリジェントに回避)
export const resolveNameCollisions = (classes: ASTClass[]): ASTClass[] => {
  const nameCounts = new Map<string, number>();
  const classToNewName = new Map<ASTClass, string>();
  const oldNameToNewName = new Map<string, string>();

  // 1. 各クラスに PascalCase 名を適用して一意な衝突解消
  for (const cls of classes) {
    const oldName = cls.name;
    
    // アンダースコア区切りの一時パスを美しい PascalCase にフォーマット！
    let pascalName = oldName.includes('_')
      ? oldName.split('_').map(part => toPascalCase(part)).join('')
      : toPascalCase(oldName);

    // 特殊ガード: TimestampModel はそのまま
    if (oldName === 'TimestampModel') {
      pascalName = 'TimestampModel';
    }

    if (nameCounts.has(pascalName)) {
      const count = nameCounts.get(pascalName)! + 1;
      nameCounts.set(pascalName, count);
      
      const newName = `${pascalName}_v${count}`;
      classToNewName.set(cls, newName);
      oldNameToNewName.set(oldName, newName);
    } else {
      nameCounts.set(pascalName, 1);
      classToNewName.set(cls, pascalName);
      oldNameToNewName.set(oldName, pascalName);
    }
  }

  // 2. 実際にクラス名をリネーム適用
  for (const [cls, newName] of classToNewName.entries()) {
    cls.name = newName;
  }

  // 3. 全フィールドの型参照（classRefName）を走査し、一意な古い一時名から新しい美しい PascalCase 名へ同期置換！
  const updateType = (type: any) => {
    if (!type) return;
    if (type.kind === 'classRef' && type.classRefName) {
      if (oldNameToNewName.has(type.classRefName)) {
        type.classRefName = oldNameToNewName.get(type.classRefName);
      }
    }
    if (type.kind === 'array' && type.itemType) {
      updateType(type.itemType);
    }
    if (type.kind === 'union' && type.unionTypes) {
      for (const ut of type.unionTypes) updateType(ut);
    }
  };

  for (const cls of classes) {
    for (const field of cls.fields) {
      updateType(field.fieldType);
    }
  }

  // 4. 依存関係グラフを構築してトポロジカルソートする。
  // 各クラスのannotationsから "extends XxxClass" を解析し、
  // 依存先が必ず前に来るように並び替える。
  // TimestampModelは常に先頭に来るようにする。
  const sorted: ASTClass[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const nameToClass = new Map<string, ASTClass>(classes.map(c => [c.name, c]));

  const visit = (cls: ASTClass) => {
    if (visited.has(cls.name)) return;
    if (visiting.has(cls.name)) return;
    visiting.add(cls.name);

    // 継承元の解析
    const baseAnn = cls.annotations?.find(a => a.startsWith('extends '));
    if (baseAnn) {
      const baseName = baseAnn.slice('extends '.length);
      const baseCls = nameToClass.get(baseName);
      if (baseCls) visit(baseCls);
    }

    visiting.delete(cls.name);
    visited.add(cls.name);
    sorted.push(cls);
  };

  // TimestampModel を最優先で配置
  const tsModel = classes.find(c => c.name === 'TimestampModel');
  if (tsModel) visit(tsModel);

  for (const cls of classes) visit(cls);
  
  classes.length = 0;
  classes.push(...sorted);

  return classes;
};
