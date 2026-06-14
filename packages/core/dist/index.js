var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// ../../src/lib/ast.ts
var toPascalCase = (str2) => str2.replace(/(^\w|_\w)/g, (m) => m.replace(/_/, "").toUpperCase());
var astTypeRefersTo = (type2, name) => {
  if (!type2) return false;
  if (type2.kind === "classRef") return type2.classRefName === name;
  if (type2.kind === "array") return astTypeRefersTo(type2.itemType, name);
  return false;
};
var rootArrayItemClassName = (schema2, rootName) => {
  if (schema2.type !== "array" || !schema2.itemType) return null;
  let childItemName = schema2.itemType._sharedTypeName;
  if (!childItemName) {
    if (rootName.endsWith("ies")) childItemName = rootName.slice(0, -3) + "y";
    else if (rootName.endsWith("s")) childItemName = rootName.slice(0, -1);
    else if (rootName.endsWith("List")) childItemName = rootName.slice(0, -4);
    else childItemName = rootName + "Item";
  }
  return childItemName.includes("_") ? childItemName.split("_").map((part) => toPascalCase(part)).join("") : toPascalCase(childItemName);
};
var convertToASTType = (v, parentClassPrefix, fieldKey) => {
  if (v.type === "union" && v.unionTypes) {
    return {
      kind: "union",
      unionTypes: v.unionTypes
    };
  }
  if (v.type === "string") {
    if (v.enumValues) {
      return { kind: "enum", enumValues: v.enumValues };
    }
    if (v.format === "date") return { kind: "date", format: "date" };
    if (v.format === "datetime") return { kind: "datetime", format: "datetime" };
    return { kind: "string", format: v.format };
  }
  if (v.type === "object") {
    const className = v._sharedTypeName ?? parentClassPrefix + "_" + fieldKey;
    return { kind: "classRef", classRefName: className };
  }
  if (v.type === "array" && v.itemType) {
    const childPrefix = parentClassPrefix + "_" + fieldKey;
    if (v.itemType.type === "object") {
      let childItemName = v.itemType._sharedTypeName;
      if (!childItemName) {
        if (childPrefix.endsWith("ies")) {
          childItemName = childPrefix.slice(0, -3) + "y";
        } else if (childPrefix.endsWith("s")) {
          childItemName = childPrefix.slice(0, -1);
        } else if (childPrefix.endsWith("List")) {
          childItemName = childPrefix.slice(0, -4);
        } else {
          childItemName = childPrefix + "_Item";
        }
      }
      return {
        kind: "array",
        itemType: { kind: "classRef", classRefName: childItemName }
      };
    }
    return {
      kind: "array",
      itemType: convertToASTType(v.itemType, childPrefix, "Item")
    };
  }
  const primitiveMap = {
    number: "number",
    boolean: "boolean",
    any: "any",
    union: "union"
  };
  const kind = primitiveMap[v.type] ?? "any";
  return { kind, format: v.format };
};
var optimizeAST = (classes, options = {}) => {
  let optimized = classes.map((cls) => ({
    ...cls,
    fields: [...cls.fields],
    annotations: cls.annotations ? [...cls.annotations] : void 0
  }));
  const flattenWrappers = options.flattenWrappers !== false;
  const extractTimestamps = options.extractTimestamps !== false;
  if (extractTimestamps) {
    const timestampFields = ["createdAt", "updatedAt", "deletedAt", "created_at", "updated_at", "deleted_at"];
    let hasTimestampBase = false;
    let baseFields = [];
    for (const cls of optimized) {
      const foundTimestamps = cls.fields.filter((f) => timestampFields.includes(f.name));
      if (foundTimestamps.length >= 2 && baseFields.length === 0) {
        baseFields = foundTimestamps.map((f) => ({ ...f, docComment: "Audit timestamp metadata" }));
        break;
      }
    }
    if (baseFields.length >= 2) {
      for (const cls of optimized) {
        if (cls.name === "TimestampModel") continue;
        const foundTimestamps = cls.fields.filter((f) => timestampFields.includes(f.name));
        const isExactMatch = foundTimestamps.length === baseFields.length && foundTimestamps.every((f) => baseFields.some((b) => b.name === f.name));
        if (foundTimestamps.length >= 2 && isExactMatch) {
          if (!hasTimestampBase) {
            optimized.push({
              name: "TimestampModel",
              fields: baseFields,
              isShared: true,
              docComment: "Base audit trail timestamp fields"
            });
            hasTimestampBase = true;
          }
          cls.fields = cls.fields.filter((f) => !timestampFields.includes(f.name));
          if (!cls.annotations) cls.annotations = [];
          cls.annotations.push("extends TimestampModel");
        }
      }
    }
  }
  if (flattenWrappers) {
    let changed = true;
    const flattenedNames = /* @__PURE__ */ new Set();
    while (changed) {
      changed = false;
      for (let i = 0; i < optimized.length; i++) {
        const cls = optimized[i];
        if (cls.name === "Root") continue;
        if (cls.fields.length === 1) {
          const singleField = cls.fields[0];
          if (singleField.fieldType.kind === "classRef") {
            const targetClassName = singleField.fieldType.classRefName;
            if (!targetClassName) continue;
            if (targetClassName === cls.name || flattenedNames.has(targetClassName)) continue;
            const targetClass = optimized.find((c) => c.name === targetClassName);
            if (targetClass) {
              cls.fields = targetClass.fields.map((f) => ({
                ...f,
                docComment: `[Flattened from ${targetClassName}] ${f.docComment ?? ""}`
              }));
              if (targetClass.annotations && targetClass.annotations.length > 0) {
                if (!cls.annotations) cls.annotations = [];
                for (const ann of targetClass.annotations) {
                  if (!cls.annotations.includes(ann)) {
                    cls.annotations.push(ann);
                  }
                }
              }
              const stillReferenced = optimized.some(
                (c) => c !== cls && c.name !== targetClassName && (c.fields.some((f) => astTypeRefersTo(f.fieldType, targetClassName)) || (c.annotations?.includes(`extends ${targetClassName}`) ?? false))
              );
              if (!stillReferenced) {
                optimized = optimized.filter((c) => c.name !== targetClassName);
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
var schemaToAST = (schema2, rootName = "Root", options = {}) => {
  const classes = [];
  const seenSchemas = /* @__PURE__ */ new Set();
  const seenClasses = /* @__PURE__ */ new Set();
  const traverse = (s, name) => {
    if (seenSchemas.has(s)) return;
    seenSchemas.add(s);
    if (s.type === "array" && s.itemType) {
      let childItemName = s.itemType._sharedTypeName;
      if (!childItemName) {
        if (name.endsWith("ies")) childItemName = name.slice(0, -3) + "y";
        else if (name.endsWith("s")) childItemName = name.slice(0, -1);
        else if (name.endsWith("List")) childItemName = name.slice(0, -4);
        else childItemName = name + "Item";
      }
      traverse(s.itemType, childItemName);
      return;
    }
    if (s.type !== "object" || !s.fields) return;
    if (s._sharedTypeName && seenClasses.has(s._sharedTypeName)) return;
    const className = s._sharedTypeName ?? name;
    seenClasses.add(className);
    const fields = [];
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
    for (const [k, v] of Object.entries(s.fields)) {
      const childName = v._sharedTypeName ?? className + "_" + k;
      if (v.type === "object") {
        traverse(v, childName);
      }
      if (v.type === "array" && v.itemType?.type === "object") {
        let childItemName = v.itemType._sharedTypeName;
        if (!childItemName) {
          if (k.endsWith("ies")) {
            childItemName = childName.slice(0, -3) + "y";
          } else if (k.endsWith("s")) {
            childItemName = childName.slice(0, -1);
          } else if (k.endsWith("List")) {
            childItemName = childName.slice(0, -4);
          } else {
            childItemName = childName + "_Item";
          }
        }
        traverse(v.itemType, childItemName);
      }
    }
  };
  traverse(schema2, rootName);
  return resolveNameCollisions(optimizeAST(classes, options));
};
var resolveNameCollisions = (classes) => {
  const nameCounts = /* @__PURE__ */ new Map();
  const classToNewName = /* @__PURE__ */ new Map();
  const oldNameToNewName = /* @__PURE__ */ new Map();
  for (const cls of classes) {
    const oldName = cls.name;
    let pascalName = oldName.includes("_") ? oldName.split("_").map((part) => toPascalCase(part)).join("") : toPascalCase(oldName);
    if (oldName === "TimestampModel") {
      pascalName = "TimestampModel";
    }
    if (nameCounts.has(pascalName)) {
      const count = nameCounts.get(pascalName) + 1;
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
  for (const [cls, newName] of classToNewName.entries()) {
    cls.name = newName;
  }
  const updateType = (type2) => {
    if (!type2) return;
    if (type2.kind === "classRef" && type2.classRefName) {
      if (oldNameToNewName.has(type2.classRefName)) {
        type2.classRefName = oldNameToNewName.get(type2.classRefName);
      }
    }
    if (type2.kind === "array" && type2.itemType) {
      updateType(type2.itemType);
    }
    if (type2.kind === "union" && type2.unionTypes) {
      for (const ut of type2.unionTypes) updateType(ut);
    }
  };
  for (const cls of classes) {
    for (const field of cls.fields) {
      updateType(field.fieldType);
    }
  }
  const sorted = [];
  const visited = /* @__PURE__ */ new Set();
  const visiting = /* @__PURE__ */ new Set();
  const nameToClass = new Map(classes.map((c) => [c.name, c]));
  const visit = (cls) => {
    if (visited.has(cls.name)) return;
    if (visiting.has(cls.name)) return;
    visiting.add(cls.name);
    const baseAnn = cls.annotations?.find((a) => a.startsWith("extends "));
    if (baseAnn) {
      const baseName = baseAnn.slice("extends ".length);
      const baseCls = nameToClass.get(baseName);
      if (baseCls) visit(baseCls);
    }
    visiting.delete(cls.name);
    visited.add(cls.name);
    sorted.push(cls);
  };
  const tsModel = classes.find((c) => c.name === "TimestampModel");
  if (tsModel) visit(tsModel);
  for (const cls of classes) visit(cls);
  classes.length = 0;
  classes.push(...sorted);
  return classes;
};

// ../../src/lib/generators.ts
var toPascalCase2 = (str2) => str2.replace(/(^\w|_\w)/g, (m) => m.replace(/_/, "").toUpperCase());
var getBaseClass = (cls) => {
  const ann = cls.annotations?.find((a) => a.startsWith("extends "));
  return ann ? ann.slice("extends ".length) : null;
};
var toCamelCase = (str2) => {
  const pascal = toPascalCase2(str2);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};
var computeItemName = (arraySchema, parentName) => {
  const shared = arraySchema.itemType?._sharedTypeName;
  if (shared) return toPascalCase2(shared);
  if (parentName.endsWith("ies")) return toPascalCase2(parentName.slice(0, -3) + "y");
  if (parentName.endsWith("s")) return toPascalCase2(parentName.slice(0, -1));
  if (parentName.endsWith("List")) return toPascalCase2(parentName.slice(0, -4));
  return toPascalCase2(parentName + "Item");
};
var findDiscriminatedSchemas = (schema2, rootName) => {
  const result = /* @__PURE__ */ new Map();
  const pascalRoot = toPascalCase2(rootName);
  const register = (arraySchema, parentName) => {
    const it = arraySchema.itemType;
    if (it?.discriminatorField && it?.discriminatedVariants) {
      result.set(computeItemName(arraySchema, parentName), {
        discriminatorField: it.discriminatorField,
        variants: it.discriminatedVariants
      });
    }
  };
  if (schema2.type === "array") {
    register(schema2, pascalRoot);
  }
  if (schema2.type === "object" && schema2.fields) {
    for (const [k, v] of Object.entries(schema2.fields)) {
      if (v.type === "array") {
        const parentCls = v._sharedTypeName ? toPascalCase2(v._sharedTypeName) : toPascalCase2(pascalRoot + "_" + k);
        register(v, parentCls);
      }
    }
  }
  return result;
};
var printASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return type2.unionTypes ? type2.unionTypes.join(" | ") : "any";
    case "enum":
      return type2.enumValues ? type2.enumValues.map((ev) => `"${ev}"`).join(" | ") : "string";
    case "date":
    case "datetime":
      return "Date";
    case "classRef":
      return type2.classRefName ?? "any";
    case "array":
      if (type2.itemType) {
        const sub = printASTType(type2.itemType);
        if (type2.itemType.kind === "union" || type2.itemType.kind === "enum") {
          return `(${sub})[]`;
        }
        return `${sub}[]`;
      }
      return "any[]";
    default:
      return type2.kind;
  }
};
var tsGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const discriminatedMap = findDiscriminatedSchemas(schema2, name);
    const astClasses = schemaToAST(schema2, name, options);
    let res = "";
    {
      const itemName = rootArrayItemClassName(schema2, name);
      if (itemName && astClasses.some((c) => c.name === itemName)) {
        res += `export type ${toPascalCase2(name)} = ${itemName}[];

`;
      }
    }
    for (const cls of astClasses) {
      const du = discriminatedMap.get(cls.name);
      if (du) {
        for (const [value, variantSchema] of Object.entries(du.variants)) {
          const suffix = toPascalCase2(value);
          const variantInterfaceName = `${cls.name}${suffix}`;
          res += `export interface ${variantInterfaceName} {
`;
          for (const [fk, fv] of Object.entries(variantSchema.fields ?? {})) {
            if (fk === du.discriminatorField) {
              res += `  ${fk}: "${value}";
`;
            } else {
              const fvAst = convertToASTType(fv, variantInterfaceName, fk);
              const tsType = printASTType(fvAst);
              const optMark = fv.optional ? "?" : "";
              const nullSuffix = fv.nullable ? " | null" : "";
              res += `  ${fk}${optMark}: ${tsType}${nullSuffix};
`;
            }
          }
          res += `}

`;
        }
        const variantNames = Object.keys(du.variants).map((v) => `${cls.name}${toPascalCase2(v)}`);
        res += `export type ${cls.name} = ${variantNames.join(" | ")};

`;
        continue;
      }
      const baseClass = getBaseClass(cls);
      const extendsStr = baseClass ? ` extends ${baseClass}` : "";
      const exportKeyword = options.exportDefault && cls.name === "Root" ? `export default interface ${cls.name}${extendsStr}` : `export interface ${cls.name}${extendsStr}`;
      res += `${exportKeyword} {
`;
      const forceOptional = options.optionalFields;
      for (const field of cls.fields) {
        const optMark = forceOptional || field.isOptional ? "?" : "";
        const customKey = `${cls.name}.${field.name}`;
        const displayName = options.customFieldNames?.[customKey] ?? field.name;
        let tsType = printASTType(field.fieldType);
        if (field.isNullable) {
          tsType = `(${tsType}) | null`;
        }
        res += `  ${displayName}${optMark}: ${tsType};
`;
      }
      res += `}

`;
    }
    return res;
  }
};
var topoSortForZod = (classes) => {
  const nameToClass = new Map(classes.map((c) => [c.name, c]));
  const visited = /* @__PURE__ */ new Set();
  const visiting = /* @__PURE__ */ new Set();
  const sorted = [];
  const cyclicClassRefs = /* @__PURE__ */ new Set();
  const getClassRefs = (type2) => {
    if (type2.kind === "classRef" && type2.classRefName) return [type2.classRefName];
    if (type2.kind === "array" && type2.itemType) return getClassRefs(type2.itemType);
    if (type2.kind === "union" && type2.unionTypes) {
      return [];
    }
    return [];
  };
  const visit = (cls) => {
    if (visited.has(cls.name)) return;
    if (visiting.has(cls.name)) return;
    visiting.add(cls.name);
    const baseName = getBaseClass(cls);
    if (baseName) {
      const dep = nameToClass.get(baseName);
      if (dep) {
        if (!visiting.has(baseName)) visit(dep);
      }
    }
    for (const field of cls.fields) {
      for (const ref of getClassRefs(field.fieldType)) {
        if (visiting.has(ref)) {
          cyclicClassRefs.add(ref);
        } else {
          const dep = nameToClass.get(ref);
          if (dep) visit(dep);
        }
      }
    }
    visiting.delete(cls.name);
    visited.add(cls.name);
    sorted.push(cls);
  };
  for (const cls of classes) visit(cls);
  return { sorted, cyclicClassRefs };
};
var printZodASTType = (type2, cyclicClassRefs, options = {}) => {
  switch (type2.kind) {
    case "union": {
      if (!type2.unionTypes || type2.unionTypes.length === 0) return "z.any()";
      const parts = type2.unionTypes.map((t) => {
        return printZodASTType({ kind: t }, cyclicClassRefs, options);
      });
      if (parts.length === 1) return parts[0];
      return `z.union([${parts.join(", ")}])`;
    }
    case "enum":
      return type2.enumValues ? `z.enum([${type2.enumValues.map((ev) => `"${ev}"`).join(", ")}])` : "z.string()";
    case "date":
      return "z.coerce.date()";
    case "datetime":
      return "z.string().datetime()";
    case "classRef": {
      if (!type2.classRefName) return "z.any()";
      const core2 = `${toCamelCase(type2.classRefName)}Schema`;
      return cyclicClassRefs.has(type2.classRefName) ? `z.lazy(() => ${core2})` : core2;
    }
    case "array":
      if (type2.itemType) {
        const sub = printZodASTType(type2.itemType, cyclicClassRefs, options);
        return `z.array(${sub})`;
      }
      return "z.array(z.any())";
    case "string":
      if (type2.format === "email") return "z.string().email()";
      if (type2.format === "url") return "z.string().url()";
      if (type2.format === "uuid") return "z.string().uuid()";
      return "z.string()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    default:
      return "z.any()";
  }
};
var zodGen = {
  generate: (schema2, name = "root", options = {}) => {
    const discriminatedMap = findDiscriminatedSchemas(schema2, toPascalCase2(name));
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    const { sorted: sortedClasses, cyclicClassRefs } = topoSortForZod(astClasses);
    for (const cls of sortedClasses) {
      const du = discriminatedMap.get(cls.name);
      if (du) {
        const variantSchemaVarNames = [];
        for (const [value, variantSchema] of Object.entries(du.variants)) {
          const suffix = toPascalCase2(value);
          const variantCamel = toCamelCase(cls.name) + suffix;
          const variantPascal = cls.name + suffix;
          variantSchemaVarNames.push(`${variantCamel}Schema`);
          res += `export const ${variantCamel}Schema = z.object({
`;
          for (const [fk, fv] of Object.entries(variantSchema.fields ?? {})) {
            if (fk === du.discriminatorField) {
              res += `  ${fk}: z.literal("${value}"),
`;
            } else {
              const fvAst = convertToASTType(fv, variantPascal, fk);
              let zType = printZodASTType(fvAst, cyclicClassRefs, options);
              if (fv.nullable) zType += ".nullable()";
              if (fv.optional) zType += ".optional()";
              res += `  ${fk}: ${zType},
`;
            }
          }
          res += `});
`;
          res += `export type ${variantPascal} = z.infer<typeof ${variantCamel}Schema>;

`;
        }
        const clsCamel = toCamelCase(cls.name);
        res += `export const ${clsCamel}Schema = z.discriminatedUnion("${du.discriminatorField}", [
`;
        for (const vn of variantSchemaVarNames) {
          res += `  ${vn},
`;
        }
        res += `]);
`;
        res += `export type ${cls.name} = z.infer<typeof ${clsCamel}Schema>;

`;
        continue;
      }
      const camelName = toCamelCase(cls.name);
      const baseClass = getBaseClass(cls);
      const baseCamel = baseClass ? toCamelCase(baseClass) : null;
      if (baseCamel) {
        res += `export const ${camelName}Schema = ${baseCamel}Schema.extend({
`;
      } else {
        res += `export const ${camelName}Schema = z.object({
`;
      }
      for (const field of cls.fields) {
        const isOpt = options.optionalFields || field.isOptional ? ".optional()" : "";
        const isNull2 = field.isNullable ? ".nullable()" : "";
        let zType = printZodASTType(field.fieldType, cyclicClassRefs, options);
        const customKey = `${cls.name}.${field.name}`;
        const displayName = options.customFieldNames?.[customKey] ?? field.name;
        const k = displayName.toLowerCase();
        if (field.fieldType.kind === "number") {
          if (k.includes("percent")) {
            zType += ".min(0).max(100)";
          } else if (k.includes("latitude") || k === "lat" || k.endsWith("_lat")) {
            zType += ".min(-90).max(90)";
          } else if (k.includes("longitude") || k === "lng" || k === "lon" || k.endsWith("_lng") || k.endsWith("_lon")) {
            zType += ".min(-180).max(180)";
          } else if (k.includes("rating")) {
            zType += ".min(0).max(5)";
          } else if (k.includes("score")) {
            zType += ".min(0).max(100)";
          } else if (k.includes("age")) {
            zType += ".int().min(0).max(150)";
          } else if (k.includes("year")) {
            zType += ".int().min(1900).max(2100)";
          } else if (k.includes("month") && !k.includes("monthly")) {
            zType += ".int().min(1).max(12)";
          } else if (k === "day" || k.endsWith("_day") || k.startsWith("day_")) {
            zType += ".int().min(1).max(31)";
          } else if (k.includes("hour")) {
            zType += ".int().min(0).max(23)";
          } else if (k.includes("minute") || k.includes("second")) {
            zType += ".int().min(0).max(59)";
          } else if (k.includes("count") || k.includes("quantity")) {
            zType += ".int().min(0)";
          } else if (["price", "amount", "cost", "fee", "rank"].some((w) => k.includes(w))) {
            zType += ".min(0)";
          }
        }
        if (field.fieldType.kind === "string" && !field.fieldType.format) {
          if (k.includes("email")) zType = "z.string().email()";
          else if (k.includes("url") || k.includes("link") || k.includes("website")) zType = "z.string().url()";
          else if (k.includes("uuid") || k === "id" || k.endsWith("_id") || /Id$/.test(displayName) || /ID$/.test(displayName)) zType = "z.string().uuid()";
          else if (k.includes("phone") || k.includes("tel")) zType = "z.string().regex(/^\\+?[\\d\\s\\-\\.\\(\\)]{7,15}$/)";
          else {
            const hasTrim = k.includes("name") || k.includes("label") || k.includes("title");
            const isRequired = !field.isOptional && !options.optionalFields;
            const longText = ["description", "note", "bio", "comment", "content", "body", "text", "message", "summary", "detail", "info", "about", "remark"].some((w) => k.includes(w));
            if (hasTrim) zType = isRequired ? "z.string().min(1).trim()" : "z.string().trim()";
            else if (isRequired && !longText) zType = "z.string().min(1)";
          }
        }
        res += `  ${displayName}: ${zType}${isNull2}${isOpt},
`;
      }
      res += `});
`;
      res += `export type ${cls.name} = z.infer<typeof ${camelName}Schema>;

`;
    }
    const itemName = rootArrayItemClassName(schema2, toPascalCase2(name));
    if (itemName && astClasses.some((c) => c.name === itemName)) {
      const rootPascal = toPascalCase2(name);
      const rootCamel = toCamelCase(rootPascal);
      res += `export const ${rootCamel}Schema = z.array(${toCamelCase(itemName)}Schema);
`;
      res += `export type ${rootPascal} = z.infer<typeof ${rootCamel}Schema>;

`;
    }
    return res;
  }
};
var printDartASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "dynamic";
    case "enum":
      return "String";
    case "date":
    case "datetime":
      return "DateTime";
    case "classRef":
      return type2.classRefName ?? "dynamic";
    case "array":
      if (type2.itemType) {
        return `List<${printDartASTType(type2.itemType)}>`;
      }
      return "List<dynamic>";
    case "string":
      return "String";
    case "number":
      return type2.format === "int" ? "int" : "double";
    case "boolean":
      return "bool";
    default:
      return "dynamic";
  }
};
var dartGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` extends ${baseClass}` : "";
      res += `class ${cls.name}${inheritance} {
`;
      for (const field of cls.fields) {
        const dartType = printDartASTType(field.fieldType);
        res += `  final ${dartType} ${field.name};
`;
      }
      res += `
  ${cls.name}({
`;
      for (const field of cls.fields) {
        res += `    required this.${field.name},
`;
      }
      res += `  });
`;
      res += `}

`;
    }
    return res;
  }
};
var printPhpASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "mixed";
    case "enum":
      return "string";
    case "date":
    case "datetime":
      return "DateTime";
    case "classRef":
      return type2.classRefName ?? "mixed";
    case "array":
      return "array";
    case "string":
      return "string";
    case "number":
      return type2.format === "int" ? "int" : "float";
    case "boolean":
      return "bool";
    default:
      return "mixed";
  }
};
var phpGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` extends ${baseClass}` : "";
      res += `class ${cls.name}${inheritance} {
`;
      for (const field of cls.fields) {
        const phpType = printPhpASTType(field.fieldType);
        res += `    public ${phpType} $${field.name};
`;
      }
      res += `}

`;
    }
    return res;
  }
};
var printPythonASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "Any";
    case "enum":
      return "str";
    case "date":
    case "datetime":
      return "datetime";
    case "classRef":
      return type2.classRefName ?? "Any";
    case "array":
      if (type2.itemType) {
        return `List[${printPythonASTType(type2.itemType)}]`;
      }
      return "List[Any]";
    case "string":
      return "str";
    case "number":
      return type2.format === "int" ? "int" : "float";
    case "boolean":
      return "bool";
    default:
      return "Any";
  }
};
var pythonGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls) ?? "BaseModel";
      res += `class ${cls.name}(${baseClass}):
`;
      if (cls.fields.length === 0) {
        res += `    pass

`;
        continue;
      }
      for (const field of cls.fields) {
        let pyType = printPythonASTType(field.fieldType);
        if (field.isOptional || field.isNullable) {
          pyType = `Optional[${pyType}] = None`;
        }
        res += `    ${field.name}: ${pyType}
`;
      }
      res += `
`;
    }
    return res;
  }
};
var printProtoASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "string";
    case "enum":
      return "string";
    case "date":
    case "datetime":
      return "string";
    case "classRef":
      return type2.classRefName ?? "string";
    case "array":
      if (type2.itemType) {
        return `repeated ${printProtoASTType(type2.itemType)}`;
      }
      return "repeated string";
    case "string":
      return "string";
    case "number":
      return type2.format === "int" ? "int32" : "double";
    case "boolean":
      return "bool";
    default:
      return "string";
  }
};
var protoGen = {
  generate: (schema2, name = "Message", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    for (const cls of astClasses) {
      res += `message ${cls.name} {
`;
      let i = 1;
      const baseClass = getBaseClass(cls);
      if (baseClass) {
        const baseCls = astClasses.find((c) => c.name === baseClass);
        if (baseCls) {
          for (const f of baseCls.fields) {
            const protoType = printProtoASTType(f.fieldType);
            res += `  ${protoType} ${f.name} = ${i++};
`;
          }
        }
      }
      for (const field of cls.fields) {
        const protoType = printProtoASTType(field.fieldType);
        res += `  ${protoType} ${field.name} = ${i++};
`;
      }
      res += `}

`;
    }
    return res;
  }
};
var printGqlASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "String";
    case "enum":
      return "String";
    case "date":
    case "datetime":
      return "String";
    case "classRef":
      return type2.classRefName ?? "String";
    case "array":
      if (type2.itemType) {
        return `[${printGqlASTType(type2.itemType)}]`;
      }
      return "[String]";
    case "string":
      return "String";
    case "number":
      return type2.format === "int" ? "Int" : "Float";
    case "boolean":
      return "Boolean";
    default:
      return "String";
  }
};
var gqlGen = {
  generate: (schema2, name = "Type", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    for (const cls of astClasses) {
      res += `type ${cls.name} {
`;
      const baseClass = getBaseClass(cls);
      if (baseClass) {
        const baseCls = astClasses.find((c) => c.name === baseClass);
        if (baseCls) {
          for (const f of baseCls.fields) {
            const gqlType = printGqlASTType(f.fieldType);
            res += `  ${f.name}: ${gqlType}
`;
          }
        }
      }
      for (const field of cls.fields) {
        const gqlType = printGqlASTType(field.fieldType);
        res += `  ${field.name}: ${gqlType}
`;
      }
      res += `}

`;
    }
    return res;
  }
};
var toSnakeCase = (str2) => {
  return str2.replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2").replace(/([a-z\d])([A-Z])/g, "$1_$2").toLowerCase();
};
var RUST_RESERVED = /* @__PURE__ */ new Set(["type", "struct", "enum", "match", "use", "mod", "fn", "let", "pub", "impl", "trait", "for", "loop", "while", "if", "else", "return", "break", "continue", "as", "async", "await", "const", "crate", "dyn", "extern", "false", "true", "in", "move", "mut", "ref", "self", "Self", "static", "super", "unsafe", "where"]);
var escapeRust = (s) => RUST_RESERVED.has(s) ? `r#${s}` : s;
var printRustASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "serde_json::Value";
    case "enum":
      return "String";
    case "date":
    case "datetime":
      return "chrono::DateTime<chrono::Utc>";
    case "classRef":
      return type2.classRefName ?? "serde_json::Value";
    case "array":
      if (type2.itemType) {
        return `Vec<${printRustASTType(type2.itemType)}>`;
      }
      return "Vec<serde_json::Value>";
    case "string":
      return "String";
    case "number":
      return type2.format === "int" ? "i64" : "f64";
    case "boolean":
      return "bool";
    default:
      return "serde_json::Value";
  }
};
var rustGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "use serde::{Serialize, Deserialize};\n\n";
    const rustItemName = rootArrayItemClassName(schema2, toPascalCase2(name));
    if (rustItemName && astClasses.some((c) => c.name === rustItemName)) {
      res += `pub type ${toPascalCase2(name)} = Vec<${rustItemName}>;

`;
    }
    for (const cls of astClasses) {
      const baseStruct = getBaseClass(cls);
      res += `#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct ${cls.name} {
`;
      if (baseStruct) {
        const fieldName = toSnakeCase(baseStruct);
        res += `  #[serde(flatten)]
  pub ${fieldName}: ${baseStruct},
`;
      }
      for (const field of cls.fields) {
        let rustType = printRustASTType(field.fieldType);
        if (field.isOptional || field.isNullable) {
          rustType = `Option<${rustType}>`;
        }
        const snakeFieldName = escapeRust(toSnakeCase(field.name));
        if (snakeFieldName !== field.name) {
          res += `  #[serde(rename = "${field.name}")]
`;
        }
        res += `  pub ${snakeFieldName}: ${rustType},
`;
      }
      res += `}

`;
    }
    return res;
  }
};
var printGoASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "interface{}";
    case "enum":
      return "string";
    case "date":
    case "datetime":
      return "time.Time";
    case "classRef":
      return type2.classRefName ?? "interface{}";
    case "array":
      if (type2.itemType) {
        return `[]${printGoASTType(type2.itemType)}`;
      }
      return "[]interface{}";
    case "string":
      return "string";
    case "number":
      return type2.format === "int" ? "int64" : "float64";
    case "boolean":
      return "bool";
    default:
      return "interface{}";
  }
};
var goGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    const usesTime = astClasses.some(
      (cls) => cls.fields.some((f) => f.fieldType.kind === "date" || f.fieldType.kind === "datetime")
    );
    let res = usesTime ? 'package main\n\nimport "time"\n\n' : "package main\n\n";
    const goItemName = rootArrayItemClassName(schema2, toPascalCase2(name));
    if (goItemName && astClasses.some((c) => c.name === goItemName)) {
      res += `type ${toPascalCase2(name)} []${goItemName}

`;
    }
    for (const cls of astClasses) {
      const baseStruct = getBaseClass(cls);
      res += `type ${cls.name} struct {
`;
      if (baseStruct) {
        res += `  ${baseStruct}
`;
      }
      for (const field of cls.fields) {
        let goType = printGoASTType(field.fieldType);
        if (field.isNullable || field.isOptional) goType = `*${goType}`;
        const pascalFieldName = toPascalCase2(field.name);
        const omitEmpty = field.isOptional ? ",omitempty" : "";
        res += `  ${pascalFieldName} ${goType} \`json:"${field.name}${omitEmpty}"\`
`;
      }
      res += `}

`;
    }
    return res;
  }
};
var printJavaASTType = (type2, isNullable) => {
  switch (type2.kind) {
    case "union":
      return "Object";
    case "enum":
      return "String";
    case "date":
      return "LocalDate";
    case "datetime":
      return "LocalDateTime";
    case "classRef":
      return type2.classRefName ?? "Object";
    case "array":
      if (type2.itemType) {
        return `List<${printJavaASTType(type2.itemType, true)}>`;
      }
      return "List<Object>";
    case "string":
      return "String";
    case "number":
      return type2.format === "int" ? isNullable ? "Integer" : "int" : isNullable ? "Double" : "double";
    case "boolean":
      return isNullable ? "Boolean" : "boolean";
    default:
      return "Object";
  }
};
var javaGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    let needsList = false;
    let needsLocalDate = false;
    let needsLocalDateTime = false;
    let needsNullable = false;
    for (const cls of astClasses) {
      for (const field of cls.fields) {
        if (field.fieldType.kind === "array") needsList = true;
        if (field.fieldType.kind === "date") needsLocalDate = true;
        if (field.fieldType.kind === "datetime") needsLocalDateTime = true;
        if (field.isOptional) needsNullable = true;
      }
    }
    if (needsList) res += "import java.util.List;\n";
    if (needsLocalDate) res += "import java.time.LocalDate;\n";
    if (needsLocalDateTime) res += "import java.time.LocalDateTime;\n";
    if (needsNullable) res += "import javax.annotation.Nullable;\n";
    if (res !== "") res += "\n";
    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` extends ${baseClass}` : "";
      res += `public class ${cls.name}${inheritance} {
`;
      for (const field of cls.fields) {
        const isNullable = field.isOptional || field.isNullable;
        const javaType = printJavaASTType(field.fieldType, isNullable);
        if (field.isOptional) {
          res += `  @Nullable
`;
        }
        let comment = "";
        if (field.fieldType.kind === "enum" && field.fieldType.enumValues && field.fieldType.enumValues.length > 0) {
          comment = ` // enum: ${field.fieldType.enumValues.map((v) => `"${v}"`).join(" | ")}`;
        }
        res += `  private ${javaType} ${field.name};${comment}
`;
      }
      if (cls.fields.length > 0) res += "\n";
      for (const field of cls.fields) {
        const isNullable = field.isOptional || field.isNullable;
        const javaType = printJavaASTType(field.fieldType, isNullable);
        const capitalizedName = field.name.charAt(0).toUpperCase() + field.name.slice(1);
        res += `  public ${javaType} get${capitalizedName}() { return ${field.name}; }
`;
        res += `  public void set${capitalizedName}(${javaType} ${field.name}) { this.${field.name} = ${field.name}; }
`;
      }
      res += `}

`;
    }
    return res.trim() + "\n";
  }
};
var printPrismaASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "String";
    case "enum":
      return "String";
    case "string":
      return "String";
    case "number":
      return type2.format === "int" ? "Int" : "Float";
    case "boolean":
      return "Boolean";
    case "date":
    case "datetime":
      return "DateTime";
    case "classRef":
      return type2.classRefName ?? "String";
    case "array":
      return type2.itemType ? `${printPrismaASTType(type2.itemType)}[]` : "String[]";
    default:
      return "String";
  }
};
var prismaGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    for (const cls of astClasses) {
      res += `model ${cls.name} {
`;
      const hasExplicitId = cls.fields.some((f) => f.name === "id");
      if (!hasExplicitId) {
        res += `  id String @id @default(uuid())
`;
      }
      const baseClass = getBaseClass(cls);
      if (baseClass) {
        const baseCls = astClasses.find((c) => c.name === baseClass);
        if (baseCls) {
          for (const f of baseCls.fields) {
            const prismaType = printPrismaASTType(f.fieldType);
            const idTag = f.name === "id" ? " @id" : "";
            res += `  ${f.name} ${prismaType}${idTag}
`;
          }
        }
      }
      for (const field of cls.fields) {
        const prismaType = printPrismaASTType(field.fieldType);
        const isArray = field.fieldType.kind === "array";
        const opt = field.isOptional && !isArray ? "?" : "";
        const customKey2 = `${cls.name}.${field.name}`;
        const displayName2 = options.customFieldNames?.[customKey2] ?? field.name;
        const idTag = displayName2 === "id" ? " @id" : "";
        if (field.fieldType.kind === "classRef") {
          const targetName = field.fieldType.classRefName;
          const relationField = `${field.name}Id`;
          const targetCls = astClasses.find((c) => c.name === targetName);
          const targetIdField = targetCls?.fields.find((f) => f.name === "id");
          const targetIdType = targetIdField ? printPrismaASTType(targetIdField.fieldType) : "String";
          res += `  ${displayName2} ${targetName}${opt} @relation(fields: [${displayName2}Id], references: [id])
`;
          res += `  ${displayName2}Id ${targetIdType}${opt}
`;
        } else {
          res += `  ${displayName2} ${prismaType}${opt}${idTag}
`;
          if (!isArray && displayName2.length > 2 && displayName2.endsWith("Id") && field.fieldType.format === "uuid") {
            const relName = displayName2.slice(0, -2);
            const refClass = relName.charAt(0).toUpperCase() + relName.slice(1);
            const relAlreadyDeclared = cls.fields.some((f) => f.name === relName);
            if (!relAlreadyDeclared) {
              const exactModel = astClasses.find((c) => c.name === refClass);
              const suffixMatches = astClasses.filter((c) => c.name !== cls.name && c.name.endsWith(refClass));
              const refModel = exactModel ?? (suffixMatches.length === 1 ? suffixMatches[0] : null);
              if (refModel) {
                res += `  ${relName} ${refModel.name}? @relation(fields: [${displayName2}], references: [id])
`;
              }
            }
          }
        }
      }
      res += `}

`;
    }
    return res;
  }
};
var uiGen = {
  generate: (schema2, name = "Component") => {
    const fields = schema2.fields || {};
    const keys = Object.keys(fields);
    let res = `import React from 'react';

`;
    res += `export const ${name}Card = ({ data }: { data: any }) => (
`;
    res += `  <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800">
`;
    res += `    <h3 className="text-lg font-black mb-4 dark:text-white">${name}</h3>
`;
    res += `    <div className="grid grid-cols-2 gap-4">
`;
    keys.forEach((k) => {
      res += `      <div>
        <p className="text-[10px] text-slate-400 uppercase">${k}</p>
        <p className="text-sm font-bold dark:text-slate-200">{typeof data?.${k} === 'object' ? JSON.stringify(data?.${k}) : String(data?.${k} ?? '-')}</p>
      </div>
`;
    });
    res += `    </div>
  </div>
);
`;
    return res;
  }
};
var mockGen = {
  generate: (schema2) => {
    let _arrayIndex = 0;
    const generateMock = (s, key = "", parentKey = "") => {
      if (s.type === "object" && s.fields) {
        const obj = {};
        for (const [k, v] of Object.entries(s.fields)) {
          obj[k] = generateMock(v, k, key);
        }
        return obj;
      }
      if (s.type === "array") {
        const itemSchema = s.itemType || { type: "string" };
        const prevIndex = _arrayIndex;
        _arrayIndex = 0;
        const arr = Array.from({ length: 50 }, (_, i) => {
          _arrayIndex = i + 1;
          return generateMock(itemSchema, key, parentKey);
        });
        _arrayIndex = prevIndex;
        return arr;
      }
      if (s.type === "number") {
        if (key.toLowerCase().includes("id") || key.toLowerCase().includes("price") || key.toLowerCase().includes("amount")) {
          return _arrayIndex > 0 ? _arrayIndex : 1;
        }
        if (key.toLowerCase().includes("age")) return 28;
        return 42;
      }
      if (s.type === "boolean") return true;
      if (s.type === "string") {
        if (s.format === "uuid") return `550e8400-e29b-41d4-a716-${String(_arrayIndex || 1).padStart(12, "0")}`;
        if (s.format === "email") return "test@example.com";
        if (s.format === "url") return "https://example.com/api";
        if (s.format === "datetime") return (/* @__PURE__ */ new Date()).toISOString();
        const k = key.toLowerCase();
        const pk = parentKey.toLowerCase();
        const isItemContext = pk === "items" || pk === "products" || pk === "entries" || pk === "records";
        if (k.includes("name")) {
          if (isItemContext) return `Item ${String.fromCharCode(64 + (_arrayIndex || 1))}`;
          const names = ["Alice Johnson", "Bob Smith", "Carol White", "David Brown", "Emma Davis", "Frank Wilson", "Grace Lee", "Henry Taylor"];
          return names[((_arrayIndex || 1) - 1) % names.length];
        }
        if (k.includes("email")) {
          const domains = ["example.com", "test.org", "demo.io", "sample.net"];
          return `user${_arrayIndex || 1}@${domains[((_arrayIndex || 1) - 1) % domains.length]}`;
        }
        if (k.includes("url") || k.includes("link") || k.includes("avatar") || k.includes("image")) return "https://example.com/sample.png";
        if (k.includes("id")) return `550e8400-e29b-41d4-a716-${String(_arrayIndex || 1).padStart(12, "0")}`;
        if (k.includes("date") || k.includes("time") || k.includes("created") || k.includes("updated")) return (/* @__PURE__ */ new Date()).toISOString();
        if (k.includes("city")) {
          const cities = ["Tokyo", "New York", "London", "Paris", "Sydney", "Berlin", "Singapore", "Toronto"];
          return cities[((_arrayIndex || 1) - 1) % cities.length];
        }
        if (k.includes("street") || k.includes("address")) return "123 Main Street";
        if (k.includes("zip") || k.includes("postal")) return "100-0001";
        if (k.includes("phone") || k.includes("tel")) return "+81-90-1234-5678";
        if (k.includes("role") || k.includes("type") || k.includes("status") || k.includes("category")) {
          const roles = ["admin", "user", "guest", "moderator"];
          return roles[((_arrayIndex || 1) - 1) % roles.length];
        }
        if (k.includes("desc") || k.includes("memo") || k.includes("text") || k.includes("bio") || k.includes("note")) return "This is a sample generated text to simulate a realistic description or content block.";
        if (k.includes("title")) return "Sample Title";
        if (k.includes("price") || k.includes("cost")) return (19.99 + (_arrayIndex || 0) * 10).toFixed(2);
        if (k.includes("color")) return "#3366ff";
        if (k.includes("country")) return "Japan";
        if (k.includes("lang") || k.includes("locale")) return "en-US";
        return "sample_" + key;
      }
      return null;
    };
    return JSON.stringify(generateMock(schema2), null, 2);
  }
};
var printCsharpASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "object";
    case "enum":
      return "string";
    case "date":
    case "datetime":
      return "DateTime";
    case "classRef":
      return type2.classRefName ?? "object";
    case "array":
      return type2.itemType ? `List<${printCsharpASTType(type2.itemType)}>` : "List<object>";
    case "string":
      return "string";
    case "number":
      return type2.format === "int" ? "long" : "double";
    case "boolean":
      return "bool";
    default:
      return "object";
  }
};
var csharpGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` : ${baseClass}` : "";
      res += `public class ${cls.name}${inheritance}
{
`;
      for (const field of cls.fields) {
        const csType = printCsharpASTType(field.fieldType);
        const nullable = field.isOptional || field.isNullable ? "?" : "";
        res += `    public ${csType}${nullable} ${toPascalCase2(field.name)} { get; set; }
`;
      }
      res += `}

`;
    }
    return res;
  }
};
var printSwiftASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "AnyCodable";
    case "enum":
      return "String";
    case "date":
    case "datetime":
      return "Date";
    case "classRef":
      return type2.classRefName ?? "AnyCodable";
    case "array":
      return type2.itemType ? `[${printSwiftASTType(type2.itemType)}]` : "[AnyCodable]";
    case "string":
      return "String";
    case "number":
      return type2.format === "int" ? "Int" : "Double";
    case "boolean":
      return "Bool";
    default:
      return "AnyCodable";
  }
};
var swiftGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? `: ${baseClass}` : ": Codable";
      res += `struct ${cls.name} ${inheritance} {
`;
      for (const field of cls.fields) {
        let swiftType = printSwiftASTType(field.fieldType);
        if (field.isOptional || field.isNullable) swiftType += "?";
        res += `    let ${field.name}: ${swiftType}
`;
      }
      res += `}

`;
    }
    return res;
  }
};
var printKotlinASTType = (type2) => {
  switch (type2.kind) {
    case "union":
      return "Any";
    case "enum":
      return "String";
    case "date":
    case "datetime":
      return "String // ISO 8601";
    case "classRef":
      return type2.classRefName ?? "Any";
    case "array":
      return type2.itemType ? `List<${printKotlinASTType(type2.itemType)}>` : "List<Any>";
    case "string":
      return "String";
    case "number":
      return type2.format === "int" ? "Int" : "Double";
    case "boolean":
      return "Boolean";
    default:
      return "Any";
  }
};
var kotlinGen = {
  generate: (schema2, name = "Root", options = {}) => {
    const astClasses = schemaToAST(schema2, toPascalCase2(name), options);
    let res = "";
    for (const cls of astClasses) {
      const baseClass = getBaseClass(cls);
      const inheritance = baseClass ? ` : ${baseClass}` : "";
      res += `data class ${cls.name}(
`;
      const fields = cls.fields.map((field) => {
        let ktType = printKotlinASTType(field.fieldType);
        if (field.isOptional || field.isNullable) ktType += "?";
        return `    val ${field.name}: ${ktType}`;
      });
      res += fields.join(",\n");
      res += `
)${inheritance}

`;
    }
    return res;
  }
};
var jsonSchemaGen = {
  generate: (schema2) => {
    const build = (s) => {
      if (s.type === "object" && s.fields) {
        const required = Object.keys(s.fields).filter((k) => !s.fields[k].optional);
        const res = {
          type: "object",
          properties: Object.keys(s.fields).reduce((acc, k) => ({ ...acc, [k]: build(s.fields[k]) }), {})
        };
        if (required.length > 0) res.required = required;
        if (s.nullable) res.nullable = true;
        return res;
      }
      if (s.type === "array") {
        const res = { type: "array", items: build(s.itemType) };
        if (s.nullable) res.nullable = true;
        return res;
      }
      if (s.type === "union" && s.unionTypes) {
        const res = { anyOf: s.unionTypes.map((t) => ({ type: t })) };
        if (s.nullable) res.nullable = true;
        return res;
      }
      const leaf = { type: s.type };
      if (s.format) leaf.format = s.format;
      if (s.enumValues && s.enumValues.length > 0) leaf.enum = s.enumValues;
      if (s.nullable) leaf.nullable = true;
      return leaf;
    };
    return JSON.stringify({
      $schema: "http://json-schema.org/draft-07/schema#",
      ...build(schema2)
    }, null, 2);
  }
};
var docGen = {
  generate: (schema2, name = "Root") => {
    if (schema2.type === "object" && schema2.fields) {
      let res = `# API Field Specifications: ${name}

`;
      res += `| Field | Type | Required | Description |
`;
      res += `| :--- | :--- | :--- | :--- |
`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        let typeStr = v.type === "object" ? "Object" : v.type === "array" ? `${v.itemType?.type || "any"}[]` : v.type;
        if (v.type === "union" && v.unionTypes) {
          typeStr = v.unionTypes.join(" \\| ");
        }
        if (v.nullable) typeStr += " (nullable)";
        const required = v.optional ? "No" : "Yes";
        let desc = "No description provided.";
        const keyLower = k.toLowerCase();
        if (keyLower.endsWith("_id") && keyLower !== "id") desc = "Foreign key reference to an external record.";
        else if (keyLower === "id" || keyLower.endsWith("id")) desc = "Unique identifier for the record.";
        else if (keyLower === "username") desc = "User's unique display name.";
        else if (keyLower === "name" || keyLower === "fullname") desc = "Full name of the user or entity.";
        else if (keyLower === "email") desc = "Primary email address.";
        else if (keyLower === "status") desc = "Operational or lifecycle state.";
        else if (keyLower === "role") desc = "User privilege role or system role.";
        else if (keyLower === "avatarurl" || keyLower === "avatar") desc = "Public URL to the user's avatar image.";
        else if (keyLower === "stats") desc = "Statistical metrics and counters.";
        else if (keyLower === "preferences") desc = "User preference flags and custom configurations.";
        else if (keyLower.startsWith("is") || keyLower.startsWith("has")) desc = "Boolean flag representing status.";
        else if (keyLower === "createdat" || keyLower === "created_at") desc = "Timestamp representing record creation time.";
        else if (keyLower === "updatedat" || keyLower === "updated_at") desc = "Timestamp representing the last update time.";
        else if (keyLower === "lastlogin" || keyLower === "last_login") desc = "Timestamp of the user's most recent session activity.";
        else if (keyLower === "title") desc = "Human-readable title or heading.";
        else if (keyLower.includes("description") || keyLower === "desc") desc = "Free-text description or summary.";
        else if (keyLower.includes("phone") || keyLower.includes("mobile")) desc = "Contact phone number.";
        else if (keyLower.includes("address")) desc = "Physical or mailing address.";
        else if (keyLower.includes("price") || keyLower.includes("amount") || keyLower.includes("cost") || keyLower.includes("fee")) desc = "Monetary value (non-negative).";
        else if (keyLower === "age") desc = "Age in years (0\u2013150).";
        else if (keyLower.includes("age") && v.type === "number") desc = "Numeric age value.";
        else if (keyLower === "type" || keyLower.endsWith("_type") || keyLower.endsWith("type")) desc = "Discriminator or category type.";
        else if (keyLower === "slug" || keyLower.endsWith("_slug")) desc = "URL-safe identifier slug.";
        else if (keyLower.endsWith("_count") || keyLower === "count") desc = "Integer count or quantity (non-negative).";
        else if (keyLower.endsWith("_at")) desc = "ISO 8601 timestamp.";
        else if (keyLower.endsWith("_url") || keyLower.endsWith("_link")) desc = "Fully-qualified URL (HTTP/HTTPS).";
        else if (keyLower.endsWith("_code") || keyLower === "code") desc = "Short code or identifier string.";
        else if (v.format === "uuid") desc = "Universally Unique Identifier (UUID) format string.";
        else if (v.format === "email") desc = "Validated email format string.";
        else if (v.format === "url") desc = "Fully-qualified web URL (HTTP/HTTPS).";
        else if (v.format === "datetime") desc = "ISO 8601 compliant UTC date-time string.";
        res += `| \`${k}\` | \`${typeStr}\` | ${required} | ${desc} |
`;
      }
      res += `
`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        if (v.type === "object") {
          res += `
---

`;
          res += docGen.generate(v, k.charAt(0).toUpperCase() + k.slice(1));
        }
        if (v.type === "array" && v.itemType?.type === "object") {
          res += `
---

`;
          res += docGen.generate(v.itemType, k.charAt(0).toUpperCase() + k.slice(1) + "Item");
        }
      }
      return res;
    }
    return "";
  }
};

// ../../node_modules/js-yaml/dist/js-yaml.mjs
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source) {
  var index, length, key, sourceKeys;
  if (source) {
    sourceKeys = Object.keys(source);
    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key = sourceKeys[index];
      target[key] = source[key];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject;
var toArray_1 = toArray;
var repeat_1 = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1 = extend;
var common = {
  isNothing: isNothing_1,
  isObject: isObject_1,
  toArray: toArray_1,
  repeat: repeat_1,
  isNegativeZero: isNegativeZero_1,
  extend: extend_1
};
function formatError(exception2, compact) {
  var where = "", message = exception2.reason || "(unknown reason)";
  if (!exception2.mark) return message;
  if (exception2.mark.name) {
    where += 'in "' + exception2.mark.name + '" ';
  }
  where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
  if (!compact && exception2.mark.snippet) {
    where += "\n\n" + exception2.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
  return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
    // relative position
  };
}
function padStart(string, max) {
  return common.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options) {
  options = Object.create(options || null);
  if (!mark.buffer) return null;
  if (!options.maxLength) options.maxLength = 79;
  if (typeof options.indent !== "number") options.indent = 1;
  if (typeof options.linesBefore !== "number") options.linesBefore = 3;
  if (typeof options.linesAfter !== "number") options.linesAfter = 2;
  var re = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match;
  var foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  var result = "", i, line;
  var lineNoLength = Math.min(mark.line + options.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options.maxLength - (options.indent + lineNoLength + 3);
  for (i = 1; i <= options.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo - i],
      lineEnds[foundLineNo - i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
      maxLineLength
    );
    result = common.repeat(" ", options.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line.str + "\n" + result;
  }
  line = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common.repeat(" ", options.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  result += common.repeat("-", options.indent + lineNoLength + 3 + line.pos) + "^\n";
  for (i = 1; i <= options.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    line = getLine(
      mark.buffer,
      lineStarts[foundLineNo + i],
      lineEnds[foundLineNo + i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
      maxLineLength
    );
    result += common.repeat(" ", options.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line.str + "\n";
  }
  return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options) {
  options = options || {};
  Object.keys(options).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options;
  this.tag = tag;
  this.kind = options["kind"] || null;
  this.resolve = options["resolve"] || function() {
    return true;
  };
  this.construct = options["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options["instanceOf"] || null;
  this.predicate = options["predicate"] || null;
  this.represent = options["represent"] || null;
  this.representName = options["representName"] || null;
  this.defaultStyle = options["defaultStyle"] || null;
  this.multi = options["multi"] || false;
  this.styleAliases = compileStyleAliases(options["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$1;
function compileList(schema2, name) {
  var result = [];
  schema2[name].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
Schema$1.prototype.extend = function extend2(definition) {
  var implicit = [];
  var explicit = [];
  if (definition instanceof type) {
    explicit.push(definition);
  } else if (Array.isArray(definition)) {
    explicit = explicit.concat(definition);
  } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
    if (definition.implicit) implicit = implicit.concat(definition.implicit);
    if (definition.explicit) explicit = explicit.concat(definition.explicit);
  } else {
    throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  }
  implicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
    if (type$1.loadKind && type$1.loadKind !== "scalar") {
      throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
    if (type$1.multi) {
      throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }
  });
  explicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
  });
  var result = Object.create(Schema$1.prototype);
  result.implicit = (this.implicit || []).concat(implicit);
  result.explicit = (this.explicit || []).concat(explicit);
  result.compiledImplicit = compileList(result, "implicit");
  result.compiledExplicit = compileList(result, "explicit");
  result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
  return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var seq = new type("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var map = new type("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});
function resolveYamlNull(data) {
  if (data === null) return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
  if (data === null) return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? "true" : "false";
    },
    uppercase: function(object) {
      return object ? "TRUE" : "FALSE";
    },
    camelcase: function(object) {
      return object ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
function isHexCode(c) {
  return 48 <= c && c <= 57 || 65 <= c && c <= 70 || 97 <= c && c <= 102;
}
function isOctCode(c) {
  return 48 <= c && c <= 55;
}
function isDecCode(c) {
  return 48 <= c && c <= 57;
}
function resolveYamlInteger(data) {
  if (data === null) return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max) return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isOctCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_") return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign * parseInt(value.slice(2), 16);
    if (value[1] === "o") return sign * parseInt(value.slice(2), 8);
  }
  return sign * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
}
var int = new type("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null) return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign;
  value = data.replace(/_/g, "").toLowerCase();
  sign = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var json = failsafe.extend({
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var core = json;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null) throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match[9] === "-") delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new type("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null) return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]") return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }
    if (!pairHasKey) return false;
    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null) return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys = Object.keys(pair);
    if (keys.length !== 1) return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null) return true;
  var key, object = data;
  for (key in object) {
    if (_hasOwnProperty$2.call(object, key)) {
      if (object[key] !== null) return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var _default = core.extend({
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c) {
  return c === 10 || c === 13;
}
function is_WHITE_SPACE(c) {
  return c === 9 || c === 32;
}
function is_WS_OR_EOL(c) {
  return c === 9 || c === 32 || c === 10 || c === 13;
}
function is_FLOW_INDICATOR(c) {
  return c === 44 || c === 91 || c === 93 || c === 123 || c === 125;
}
function fromHexCode(c) {
  var lc;
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  lc = c | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c) {
  if (c === 120) {
    return 2;
  }
  if (c === 117) {
    return 4;
  }
  if (c === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c) {
  if (48 <= c && c <= 57) {
    return c - 48;
  }
  return -1;
}
function simpleEscapeSequence(c) {
  return c === 48 ? "\0" : c === 97 ? "\x07" : c === 98 ? "\b" : c === 116 ? "	" : c === 9 ? "	" : c === 110 ? "\n" : c === 118 ? "\v" : c === 102 ? "\f" : c === 114 ? "\r" : c === 101 ? "\x1B" : c === 32 ? " " : c === 34 ? '"' : c === 47 ? "/" : c === 92 ? "\\" : c === 78 ? "\x85" : c === 95 ? "\xA0" : c === 76 ? "\u2028" : c === 80 ? "\u2029" : "";
}
function charFromCodepoint(c) {
  if (c <= 65535) {
    return String.fromCharCode(c);
  }
  return String.fromCharCode(
    (c - 65536 >> 10) + 55296,
    (c - 65536 & 1023) + 56320
  );
}
function setProperty(object, key, value) {
  if (key === "__proto__") {
    Object.defineProperty(object, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value
    });
  } else {
    object[key] = value;
  }
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
var i;
function State$1(input, options) {
  this.input = input;
  this.filename = options["filename"] || null;
  this.schema = options["schema"] || _default;
  this.onWarning = options["onWarning"] || null;
  this.legacy = options["legacy"] || false;
  this.json = options["json"] || false;
  this.listener = options["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    // omit trailing \0
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    try {
      prefix = decodeURIComponent(prefix);
    } catch (err) {
      throwError(state, "tag prefix is malformed: " + prefix);
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source, overridableKeys) {
  var sourceKeys, key, index, quantity;
  if (!common.isObject(source)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source);
  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key)) {
      setProperty(destination, key, source[key]);
      overridableKeys[key] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    setProperty(_result, keyNode, valueNode);
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common.repeat("\n", emptyLines);
      }
    } else {
      state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33) return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38) return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42) return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = /* @__PURE__ */ Object.create(null);
  state.anchorMap = /* @__PURE__ */ Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch)) break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0) readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options) {
  input = String(input);
  options = options || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator, options) {
  if (iterator !== null && typeof iterator === "object" && typeof options === "undefined") {
    options = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}
function load$1(input, options) {
  var documents = loadDocuments(input, options);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
var loadAll_1 = loadAll$1;
var load_1 = load$1;
var loader = {
  loadAll: loadAll_1,
  load: load_1
};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var CHAR_BOM = 65279;
var CHAR_TAB = 9;
var CHAR_LINE_FEED = 10;
var CHAR_CARRIAGE_RETURN = 13;
var CHAR_SPACE = 32;
var CHAR_EXCLAMATION = 33;
var CHAR_DOUBLE_QUOTE = 34;
var CHAR_SHARP = 35;
var CHAR_PERCENT = 37;
var CHAR_AMPERSAND = 38;
var CHAR_SINGLE_QUOTE = 39;
var CHAR_ASTERISK = 42;
var CHAR_COMMA = 44;
var CHAR_MINUS = 45;
var CHAR_COLON = 58;
var CHAR_EQUALS = 61;
var CHAR_GREATER_THAN = 62;
var CHAR_QUESTION = 63;
var CHAR_COMMERCIAL_AT = 64;
var CHAR_LEFT_SQUARE_BRACKET = 91;
var CHAR_RIGHT_SQUARE_BRACKET = 93;
var CHAR_GRAVE_ACCENT = 96;
var CHAR_LEFT_CURLY_BRACKET = 123;
var CHAR_VERTICAL_LINE = 124;
var CHAR_RIGHT_CURLY_BRACKET = 125;
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
var DEPRECATED_BOOLEANS_SYNTAX = [
  "y",
  "Y",
  "yes",
  "Yes",
  "YES",
  "on",
  "On",
  "ON",
  "n",
  "N",
  "no",
  "No",
  "NO",
  "off",
  "Off",
  "OFF"
];
var DEPRECATED_BASE60_SYNTAX = /^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;
function compileStyleMap(schema2, map2) {
  var result, keys, index, length, tag, style, type2;
  if (map2 === null) return {};
  result = {};
  keys = Object.keys(map2);
  for (index = 0, length = keys.length; index < length; index += 1) {
    tag = keys[index];
    style = String(map2[tag]);
    if (tag.slice(0, 2) === "!!") {
      tag = "tag:yaml.org,2002:" + tag.slice(2);
    }
    type2 = schema2.compiledTypeMap["fallback"][tag];
    if (type2 && _hasOwnProperty.call(type2.styleAliases, style)) {
      style = type2.styleAliases[style];
    }
    result[tag] = style;
  }
  return result;
}
function encodeHex(character) {
  var string, handle, length;
  string = character.toString(16).toUpperCase();
  if (character <= 255) {
    handle = "x";
    length = 2;
  } else if (character <= 65535) {
    handle = "u";
    length = 4;
  } else if (character <= 4294967295) {
    handle = "U";
    length = 8;
  } else {
    throw new exception("code point within a string may not be greater than 0xFFFFFFFF");
  }
  return "\\" + handle + common.repeat("0", length - string.length) + string;
}
var QUOTING_TYPE_SINGLE = 1;
var QUOTING_TYPE_DOUBLE = 2;
function State(options) {
  this.schema = options["schema"] || _default;
  this.indent = Math.max(1, options["indent"] || 2);
  this.noArrayIndent = options["noArrayIndent"] || false;
  this.skipInvalid = options["skipInvalid"] || false;
  this.flowLevel = common.isNothing(options["flowLevel"]) ? -1 : options["flowLevel"];
  this.styleMap = compileStyleMap(this.schema, options["styles"] || null);
  this.sortKeys = options["sortKeys"] || false;
  this.lineWidth = options["lineWidth"] || 80;
  this.noRefs = options["noRefs"] || false;
  this.noCompatMode = options["noCompatMode"] || false;
  this.condenseFlow = options["condenseFlow"] || false;
  this.quotingType = options["quotingType"] === '"' ? QUOTING_TYPE_DOUBLE : QUOTING_TYPE_SINGLE;
  this.forceQuotes = options["forceQuotes"] || false;
  this.replacer = typeof options["replacer"] === "function" ? options["replacer"] : null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.explicitTypes = this.schema.compiledExplicit;
  this.tag = null;
  this.result = "";
  this.duplicates = [];
  this.usedDuplicates = null;
}
function indentString(string, spaces) {
  var ind = common.repeat(" ", spaces), position = 0, next = -1, result = "", line, length = string.length;
  while (position < length) {
    next = string.indexOf("\n", position);
    if (next === -1) {
      line = string.slice(position);
      position = length;
    } else {
      line = string.slice(position, next + 1);
      position = next + 1;
    }
    if (line.length && line !== "\n") result += ind;
    result += line;
  }
  return result;
}
function generateNextLine(state, level) {
  return "\n" + common.repeat(" ", state.indent * level);
}
function testImplicitResolving(state, str2) {
  var index, length, type2;
  for (index = 0, length = state.implicitTypes.length; index < length; index += 1) {
    type2 = state.implicitTypes[index];
    if (type2.resolve(str2)) {
      return true;
    }
  }
  return false;
}
function isWhitespace(c) {
  return c === CHAR_SPACE || c === CHAR_TAB;
}
function isPrintable(c) {
  return 32 <= c && c <= 126 || 161 <= c && c <= 55295 && c !== 8232 && c !== 8233 || 57344 <= c && c <= 65533 && c !== CHAR_BOM || 65536 <= c && c <= 1114111;
}
function isNsCharOrWhitespace(c) {
  return isPrintable(c) && c !== CHAR_BOM && c !== CHAR_CARRIAGE_RETURN && c !== CHAR_LINE_FEED;
}
function isPlainSafe(c, prev, inblock) {
  var cIsNsCharOrWhitespace = isNsCharOrWhitespace(c);
  var cIsNsChar = cIsNsCharOrWhitespace && !isWhitespace(c);
  return (
    // ns-plain-safe
    (inblock ? (
      // c = flow-in
      cIsNsCharOrWhitespace
    ) : cIsNsCharOrWhitespace && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET) && c !== CHAR_SHARP && !(prev === CHAR_COLON && !cIsNsChar) || isNsCharOrWhitespace(prev) && !isWhitespace(prev) && c === CHAR_SHARP || prev === CHAR_COLON && cIsNsChar
  );
}
function isPlainSafeFirst(c) {
  return isPrintable(c) && c !== CHAR_BOM && !isWhitespace(c) && c !== CHAR_MINUS && c !== CHAR_QUESTION && c !== CHAR_COLON && c !== CHAR_COMMA && c !== CHAR_LEFT_SQUARE_BRACKET && c !== CHAR_RIGHT_SQUARE_BRACKET && c !== CHAR_LEFT_CURLY_BRACKET && c !== CHAR_RIGHT_CURLY_BRACKET && c !== CHAR_SHARP && c !== CHAR_AMPERSAND && c !== CHAR_ASTERISK && c !== CHAR_EXCLAMATION && c !== CHAR_VERTICAL_LINE && c !== CHAR_EQUALS && c !== CHAR_GREATER_THAN && c !== CHAR_SINGLE_QUOTE && c !== CHAR_DOUBLE_QUOTE && c !== CHAR_PERCENT && c !== CHAR_COMMERCIAL_AT && c !== CHAR_GRAVE_ACCENT;
}
function isPlainSafeLast(c) {
  return !isWhitespace(c) && c !== CHAR_COLON;
}
function codePointAt(string, pos) {
  var first = string.charCodeAt(pos), second;
  if (first >= 55296 && first <= 56319 && pos + 1 < string.length) {
    second = string.charCodeAt(pos + 1);
    if (second >= 56320 && second <= 57343) {
      return (first - 55296) * 1024 + second - 56320 + 65536;
    }
  }
  return first;
}
function needIndentIndicator(string) {
  var leadingSpaceRe = /^\n* /;
  return leadingSpaceRe.test(string);
}
var STYLE_PLAIN = 1;
var STYLE_SINGLE = 2;
var STYLE_LITERAL = 3;
var STYLE_FOLDED = 4;
var STYLE_DOUBLE = 5;
function chooseScalarStyle(string, singleLineOnly, indentPerLevel, lineWidth, testAmbiguousType, quotingType, forceQuotes, inblock) {
  var i;
  var char = 0;
  var prevChar = null;
  var hasLineBreak = false;
  var hasFoldableLine = false;
  var shouldTrackWidth = lineWidth !== -1;
  var previousLineBreak = -1;
  var plain = isPlainSafeFirst(codePointAt(string, 0)) && isPlainSafeLast(codePointAt(string, string.length - 1));
  if (singleLineOnly || forceQuotes) {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
  } else {
    for (i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
      char = codePointAt(string, i);
      if (char === CHAR_LINE_FEED) {
        hasLineBreak = true;
        if (shouldTrackWidth) {
          hasFoldableLine = hasFoldableLine || // Foldable line = too long, and not more-indented.
          i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ";
          previousLineBreak = i;
        }
      } else if (!isPrintable(char)) {
        return STYLE_DOUBLE;
      }
      plain = plain && isPlainSafe(char, prevChar, inblock);
      prevChar = char;
    }
    hasFoldableLine = hasFoldableLine || shouldTrackWidth && (i - previousLineBreak - 1 > lineWidth && string[previousLineBreak + 1] !== " ");
  }
  if (!hasLineBreak && !hasFoldableLine) {
    if (plain && !forceQuotes && !testAmbiguousType(string)) {
      return STYLE_PLAIN;
    }
    return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
  }
  if (indentPerLevel > 9 && needIndentIndicator(string)) {
    return STYLE_DOUBLE;
  }
  if (!forceQuotes) {
    return hasFoldableLine ? STYLE_FOLDED : STYLE_LITERAL;
  }
  return quotingType === QUOTING_TYPE_DOUBLE ? STYLE_DOUBLE : STYLE_SINGLE;
}
function writeScalar(state, string, level, iskey, inblock) {
  state.dump = (function() {
    if (string.length === 0) {
      return state.quotingType === QUOTING_TYPE_DOUBLE ? '""' : "''";
    }
    if (!state.noCompatMode) {
      if (DEPRECATED_BOOLEANS_SYNTAX.indexOf(string) !== -1 || DEPRECATED_BASE60_SYNTAX.test(string)) {
        return state.quotingType === QUOTING_TYPE_DOUBLE ? '"' + string + '"' : "'" + string + "'";
      }
    }
    var indent = state.indent * Math.max(1, level);
    var lineWidth = state.lineWidth === -1 ? -1 : Math.max(Math.min(state.lineWidth, 40), state.lineWidth - indent);
    var singleLineOnly = iskey || state.flowLevel > -1 && level >= state.flowLevel;
    function testAmbiguity(string2) {
      return testImplicitResolving(state, string2);
    }
    switch (chooseScalarStyle(
      string,
      singleLineOnly,
      state.indent,
      lineWidth,
      testAmbiguity,
      state.quotingType,
      state.forceQuotes && !iskey,
      inblock
    )) {
      case STYLE_PLAIN:
        return string;
      case STYLE_SINGLE:
        return "'" + string.replace(/'/g, "''") + "'";
      case STYLE_LITERAL:
        return "|" + blockHeader(string, state.indent) + dropEndingNewline(indentString(string, indent));
      case STYLE_FOLDED:
        return ">" + blockHeader(string, state.indent) + dropEndingNewline(indentString(foldString(string, lineWidth), indent));
      case STYLE_DOUBLE:
        return '"' + escapeString(string) + '"';
      default:
        throw new exception("impossible error: invalid scalar style");
    }
  })();
}
function blockHeader(string, indentPerLevel) {
  var indentIndicator = needIndentIndicator(string) ? String(indentPerLevel) : "";
  var clip = string[string.length - 1] === "\n";
  var keep = clip && (string[string.length - 2] === "\n" || string === "\n");
  var chomp = keep ? "+" : clip ? "" : "-";
  return indentIndicator + chomp + "\n";
}
function dropEndingNewline(string) {
  return string[string.length - 1] === "\n" ? string.slice(0, -1) : string;
}
function foldString(string, width) {
  var lineRe = /(\n+)([^\n]*)/g;
  var result = (function() {
    var nextLF = string.indexOf("\n");
    nextLF = nextLF !== -1 ? nextLF : string.length;
    lineRe.lastIndex = nextLF;
    return foldLine(string.slice(0, nextLF), width);
  })();
  var prevMoreIndented = string[0] === "\n" || string[0] === " ";
  var moreIndented;
  var match;
  while (match = lineRe.exec(string)) {
    var prefix = match[1], line = match[2];
    moreIndented = line[0] === " ";
    result += prefix + (!prevMoreIndented && !moreIndented && line !== "" ? "\n" : "") + foldLine(line, width);
    prevMoreIndented = moreIndented;
  }
  return result;
}
function foldLine(line, width) {
  if (line === "" || line[0] === " ") return line;
  var breakRe = / [^ ]/g;
  var match;
  var start = 0, end, curr = 0, next = 0;
  var result = "";
  while (match = breakRe.exec(line)) {
    next = match.index;
    if (next - start > width) {
      end = curr > start ? curr : next;
      result += "\n" + line.slice(start, end);
      start = end + 1;
    }
    curr = next;
  }
  result += "\n";
  if (line.length - start > width && curr > start) {
    result += line.slice(start, curr) + "\n" + line.slice(curr + 1);
  } else {
    result += line.slice(start);
  }
  return result.slice(1);
}
function escapeString(string) {
  var result = "";
  var char = 0;
  var escapeSeq;
  for (var i = 0; i < string.length; char >= 65536 ? i += 2 : i++) {
    char = codePointAt(string, i);
    escapeSeq = ESCAPE_SEQUENCES[char];
    if (!escapeSeq && isPrintable(char)) {
      result += string[i];
      if (char >= 65536) result += string[i + 1];
    } else {
      result += escapeSeq || encodeHex(char);
    }
  }
  return result;
}
function writeFlowSequence(state, level, object) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level, value, false, false) || typeof value === "undefined" && writeNode(state, level, null, false, false)) {
      if (_result !== "") _result += "," + (!state.condenseFlow ? " " : "");
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = "[" + _result + "]";
}
function writeBlockSequence(state, level, object, compact) {
  var _result = "", _tag = state.tag, index, length, value;
  for (index = 0, length = object.length; index < length; index += 1) {
    value = object[index];
    if (state.replacer) {
      value = state.replacer.call(object, String(index), value);
    }
    if (writeNode(state, level + 1, value, true, true, false, true) || typeof value === "undefined" && writeNode(state, level + 1, null, true, true, false, true)) {
      if (!compact || _result !== "") {
        _result += generateNextLine(state, level);
      }
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        _result += "-";
      } else {
        _result += "- ";
      }
      _result += state.dump;
    }
  }
  state.tag = _tag;
  state.dump = _result || "[]";
}
function writeFlowMapping(state, level, object) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, pairBuffer;
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (_result !== "") pairBuffer += ", ";
    if (state.condenseFlow) pairBuffer += '"';
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level, objectKey, false, false)) {
      continue;
    }
    if (state.dump.length > 1024) pairBuffer += "? ";
    pairBuffer += state.dump + (state.condenseFlow ? '"' : "") + ":" + (state.condenseFlow ? "" : " ");
    if (!writeNode(state, level, objectValue, false, false)) {
      continue;
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = "{" + _result + "}";
}
function writeBlockMapping(state, level, object, compact) {
  var _result = "", _tag = state.tag, objectKeyList = Object.keys(object), index, length, objectKey, objectValue, explicitPair, pairBuffer;
  if (state.sortKeys === true) {
    objectKeyList.sort();
  } else if (typeof state.sortKeys === "function") {
    objectKeyList.sort(state.sortKeys);
  } else if (state.sortKeys) {
    throw new exception("sortKeys must be a boolean or a function");
  }
  for (index = 0, length = objectKeyList.length; index < length; index += 1) {
    pairBuffer = "";
    if (!compact || _result !== "") {
      pairBuffer += generateNextLine(state, level);
    }
    objectKey = objectKeyList[index];
    objectValue = object[objectKey];
    if (state.replacer) {
      objectValue = state.replacer.call(object, objectKey, objectValue);
    }
    if (!writeNode(state, level + 1, objectKey, true, true, true)) {
      continue;
    }
    explicitPair = state.tag !== null && state.tag !== "?" || state.dump && state.dump.length > 1024;
    if (explicitPair) {
      if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
        pairBuffer += "?";
      } else {
        pairBuffer += "? ";
      }
    }
    pairBuffer += state.dump;
    if (explicitPair) {
      pairBuffer += generateNextLine(state, level);
    }
    if (!writeNode(state, level + 1, objectValue, true, explicitPair)) {
      continue;
    }
    if (state.dump && CHAR_LINE_FEED === state.dump.charCodeAt(0)) {
      pairBuffer += ":";
    } else {
      pairBuffer += ": ";
    }
    pairBuffer += state.dump;
    _result += pairBuffer;
  }
  state.tag = _tag;
  state.dump = _result || "{}";
}
function detectType(state, object, explicit) {
  var _result, typeList, index, length, type2, style;
  typeList = explicit ? state.explicitTypes : state.implicitTypes;
  for (index = 0, length = typeList.length; index < length; index += 1) {
    type2 = typeList[index];
    if ((type2.instanceOf || type2.predicate) && (!type2.instanceOf || typeof object === "object" && object instanceof type2.instanceOf) && (!type2.predicate || type2.predicate(object))) {
      if (explicit) {
        if (type2.multi && type2.representName) {
          state.tag = type2.representName(object);
        } else {
          state.tag = type2.tag;
        }
      } else {
        state.tag = "?";
      }
      if (type2.represent) {
        style = state.styleMap[type2.tag] || type2.defaultStyle;
        if (_toString.call(type2.represent) === "[object Function]") {
          _result = type2.represent(object, style);
        } else if (_hasOwnProperty.call(type2.represent, style)) {
          _result = type2.represent[style](object, style);
        } else {
          throw new exception("!<" + type2.tag + '> tag resolver accepts not "' + style + '" style');
        }
        state.dump = _result;
      }
      return true;
    }
  }
  return false;
}
function writeNode(state, level, object, block, compact, iskey, isblockseq) {
  state.tag = null;
  state.dump = object;
  if (!detectType(state, object, false)) {
    detectType(state, object, true);
  }
  var type2 = _toString.call(state.dump);
  var inblock = block;
  var tagStr;
  if (block) {
    block = state.flowLevel < 0 || state.flowLevel > level;
  }
  var objectOrArray = type2 === "[object Object]" || type2 === "[object Array]", duplicateIndex, duplicate;
  if (objectOrArray) {
    duplicateIndex = state.duplicates.indexOf(object);
    duplicate = duplicateIndex !== -1;
  }
  if (state.tag !== null && state.tag !== "?" || duplicate || state.indent !== 2 && level > 0) {
    compact = false;
  }
  if (duplicate && state.usedDuplicates[duplicateIndex]) {
    state.dump = "*ref_" + duplicateIndex;
  } else {
    if (objectOrArray && duplicate && !state.usedDuplicates[duplicateIndex]) {
      state.usedDuplicates[duplicateIndex] = true;
    }
    if (type2 === "[object Object]") {
      if (block && Object.keys(state.dump).length !== 0) {
        writeBlockMapping(state, level, state.dump, compact);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowMapping(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object Array]") {
      if (block && state.dump.length !== 0) {
        if (state.noArrayIndent && !isblockseq && level > 0) {
          writeBlockSequence(state, level - 1, state.dump, compact);
        } else {
          writeBlockSequence(state, level, state.dump, compact);
        }
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + state.dump;
        }
      } else {
        writeFlowSequence(state, level, state.dump);
        if (duplicate) {
          state.dump = "&ref_" + duplicateIndex + " " + state.dump;
        }
      }
    } else if (type2 === "[object String]") {
      if (state.tag !== "?") {
        writeScalar(state, state.dump, level, iskey, inblock);
      }
    } else if (type2 === "[object Undefined]") {
      return false;
    } else {
      if (state.skipInvalid) return false;
      throw new exception("unacceptable kind of an object to dump " + type2);
    }
    if (state.tag !== null && state.tag !== "?") {
      tagStr = encodeURI(
        state.tag[0] === "!" ? state.tag.slice(1) : state.tag
      ).replace(/!/g, "%21");
      if (state.tag[0] === "!") {
        tagStr = "!" + tagStr;
      } else if (tagStr.slice(0, 18) === "tag:yaml.org,2002:") {
        tagStr = "!!" + tagStr.slice(18);
      } else {
        tagStr = "!<" + tagStr + ">";
      }
      state.dump = tagStr + " " + state.dump;
    }
  }
  return true;
}
function getDuplicateReferences(object, state) {
  var objects = [], duplicatesIndexes = [], index, length;
  inspectNode(object, objects, duplicatesIndexes);
  for (index = 0, length = duplicatesIndexes.length; index < length; index += 1) {
    state.duplicates.push(objects[duplicatesIndexes[index]]);
  }
  state.usedDuplicates = new Array(length);
}
function inspectNode(object, objects, duplicatesIndexes) {
  var objectKeyList, index, length;
  if (object !== null && typeof object === "object") {
    index = objects.indexOf(object);
    if (index !== -1) {
      if (duplicatesIndexes.indexOf(index) === -1) {
        duplicatesIndexes.push(index);
      }
    } else {
      objects.push(object);
      if (Array.isArray(object)) {
        for (index = 0, length = object.length; index < length; index += 1) {
          inspectNode(object[index], objects, duplicatesIndexes);
        }
      } else {
        objectKeyList = Object.keys(object);
        for (index = 0, length = objectKeyList.length; index < length; index += 1) {
          inspectNode(object[objectKeyList[index]], objects, duplicatesIndexes);
        }
      }
    }
  }
}
function dump$1(input, options) {
  options = options || {};
  var state = new State(options);
  if (!state.noRefs) getDuplicateReferences(input, state);
  var value = input;
  if (state.replacer) {
    value = state.replacer.call({ "": value }, "", value);
  }
  if (writeNode(state, 0, value, true, true)) return state.dump + "\n";
  return "";
}
var dump_1 = dump$1;
var dumper = {
  dump: dump_1
};
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
  };
}
var Type = type;
var Schema = schema;
var FAILSAFE_SCHEMA = failsafe;
var JSON_SCHEMA = json;
var CORE_SCHEMA = core;
var DEFAULT_SCHEMA = _default;
var load = loader.load;
var loadAll = loader.loadAll;
var dump = dumper.dump;
var YAMLException = exception;
var types = {
  binary,
  float,
  map,
  null: _null,
  pairs,
  set,
  timestamp,
  bool,
  int,
  merge,
  omap,
  seq,
  str
};
var safeLoad = renamed("safeLoad", "load");
var safeLoadAll = renamed("safeLoadAll", "loadAll");
var safeDump = renamed("safeDump", "dump");
var jsYaml = {
  Type,
  Schema,
  FAILSAFE_SCHEMA,
  JSON_SCHEMA,
  CORE_SCHEMA,
  DEFAULT_SCHEMA,
  load,
  loadAll,
  dump,
  YAMLException,
  types,
  safeLoad,
  safeLoadAll,
  safeDump
};

// ../../src/lib/generators-extended.ts
var toPascalCase3 = (s) => s.replace(/(^\w|[_\s-]\w)/g, (m) => m.replace(/[_\s-]/, "").toUpperCase());
var toSnakeCase2 = (s) => s.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
var toCamelCase2 = (s) => {
  const p = toPascalCase3(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
};
var toScreamingSnake = (s) => toSnakeCase2(s).toUpperCase();
var getFields = (schema2) => {
  if (schema2.type === "array" && schema2.itemType) {
    return schema2.itemType.fields ?? {};
  }
  return schema2.fields ?? {};
};
var rootObject = (s) => s.type === "array" && s.itemType ? s.itemType : s;
var sqlType = (s, dialect = "postgres") => {
  if (s.type === "number") {
    const isInt = s.format === "int";
    if (dialect === "sqlite") return isInt ? "INTEGER" : "REAL";
    if (dialect === "mysql") return isInt ? "BIGINT" : "DOUBLE";
    return isInt ? "BIGINT" : "DOUBLE PRECISION";
  }
  if (s.type === "boolean") {
    return dialect === "mysql" ? "TINYINT(1)" : "BOOLEAN";
  }
  if (s.type === "object" || s.type === "array" || s.type === "union") {
    return dialect === "postgres" ? "JSONB" : "JSON";
  }
  if (s.format === "uuid") return dialect === "mysql" ? "CHAR(36)" : "UUID";
  if (s.format === "email") return "VARCHAR(255)";
  if (s.format === "url") return "TEXT";
  if (s.format === "datetime") return "TIMESTAMP";
  return "VARCHAR(255)";
};
var csvGen = {
  generate: (schema2) => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const headers = Object.keys(f).join(",");
    const row = Object.entries(f).map(([, v]) => {
      if (v.type === "number") return "0";
      if (v.type === "boolean") return "true";
      if (v.format === "uuid") return "uuid-xxxx-xxxx";
      if (v.format === "email") return "user@example.com";
      if (v.format === "url") return "https://example.com";
      if (v.format === "datetime") return (/* @__PURE__ */ new Date()).toISOString();
      if (v.type === "object" && v.fields) {
        return `"${JSON.stringify(Object.fromEntries(Object.entries(v.fields).map(([k2, v2]) => [k2, v2.type === "number" ? 0 : v2.type === "boolean" ? false : "sample"]))).replace(/"/g, '""')}"`;
      }
      if (v.type === "array") return '"[]"';
      return '"sample_value"';
    }).join(",");
    return `${headers}
${row}
`;
  }
};
var sqlInsertGen = {
  generate: (schema2, name = "table_name") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const cols = Object.keys(f).map((k) => `"${k}"`).join(", ");
    const vals = Object.entries(f).map(([, v]) => {
      if (v.type === "number") return "0";
      if (v.type === "boolean") return "TRUE";
      if (v.format === "uuid") return "'uuid-xxxx-xxxx'";
      if (v.format === "email") return "'user@example.com'";
      if (v.format === "datetime") return `'${(/* @__PURE__ */ new Date()).toISOString()}'`;
      if (v.type === "object" && v.fields) {
        const nested = Object.fromEntries(Object.entries(v.fields).map(([k2, v2]) => [k2, v2.type === "number" ? 0 : v2.type === "boolean" ? false : "sample"]));
        return `'${JSON.stringify(nested).replace(/'/g, "''")}'`;
      }
      if (v.type === "array") return "'[]'";
      return "'sample_value'";
    }).join(", ");
    return `INSERT INTO "${toSnakeCase2(name)}" (${cols})
VALUES (${vals});
`;
  }
};
var mysqlGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const hasId = "id" in f;
    const hasCreatedAt = "created_at" in f || "createdAt" in f;
    const hasUpdatedAt = "updated_at" in f || "updatedAt" in f;
    let res = `CREATE TABLE \`${toSnakeCase2(name)}\` (
`;
    if (!hasId) {
      res += `  \`id\` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
`;
    }
    for (const [k, v] of Object.entries(f)) {
      const nullable = v.optional ? " NULL" : " NOT NULL";
      const isId = k.toLowerCase() === "id";
      const autoInc = isId ? " AUTO_INCREMENT" : "";
      const pk = isId ? " PRIMARY KEY" : "";
      res += `  \`${toSnakeCase2(k)}\` ${sqlType(v, "mysql")}${nullable}${autoInc}${pk},
`;
    }
    if (!hasCreatedAt) {
      res += `  \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
`;
    }
    if (!hasUpdatedAt) {
      res += `  \`updated_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
`;
    } else {
      res = res.replace(/,\s*$/, "\n");
    }
    res += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;
    return res;
  }
};
var postgresGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const hasId = "id" in f;
    const hasCreatedAt = "created_at" in f || "createdAt" in f;
    const hasUpdatedAt = "updated_at" in f || "updatedAt" in f;
    const table = toSnakeCase2(name);
    let res = `CREATE TABLE "${table}" (
`;
    if (!hasId) {
      res += `  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
`;
    }
    for (const [k, v] of Object.entries(f)) {
      const nullable = v.optional ? "" : " NOT NULL";
      const isId = k.toLowerCase() === "id";
      const pk = isId ? " PRIMARY KEY" : "";
      res += `  "${toSnakeCase2(k)}" ${sqlType(v, "postgres")}${nullable}${pk},
`;
    }
    if (!hasCreatedAt) {
      res += `  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
`;
    }
    if (!hasUpdatedAt) {
      res += `  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
`;
    } else {
      res = res.replace(/,\s*$/, "\n");
    }
    res += `);
`;
    return res;
  }
};
var sqliteGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const hasId = "id" in f;
    const hasCreatedAt = "created_at" in f || "createdAt" in f;
    const hasUpdatedAt = "updated_at" in f || "updatedAt" in f;
    let res = `CREATE TABLE IF NOT EXISTS "${toSnakeCase2(name)}" (
`;
    if (!hasId) {
      res += `  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
`;
    }
    for (const [k, v] of Object.entries(f)) {
      const nullable = v.optional ? "" : " NOT NULL";
      const isId = k.toLowerCase() === "id";
      const pk = isId ? " PRIMARY KEY" : "";
      res += `  "${toSnakeCase2(k)}" ${sqlType(v, "sqlite")}${nullable}${pk},
`;
    }
    if (!hasCreatedAt) {
      res += `  "created_at" TEXT NOT NULL DEFAULT (datetime('now')),
`;
    }
    if (!hasUpdatedAt) {
      res += `  "updated_at" TEXT NOT NULL DEFAULT (datetime('now'))
`;
    } else {
      res = res.replace(/,\s*$/, "\n");
    }
    res += `);
`;
    return res;
  }
};
var snowflakeGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    let res = `CREATE OR REPLACE TABLE ${toScreamingSnake(name)} (
`;
    res += `  ID VARCHAR(36) NOT NULL DEFAULT UUID_STRING(),
`;
    for (const [k, v] of Object.entries(f)) {
      const col = toScreamingSnake(k);
      let type2 = "VARCHAR";
      if (v.type === "number") type2 = "DOUBLE";
      else if (v.type === "boolean") type2 = "BOOLEAN";
      else if (v.type === "object" || v.type === "array") type2 = "VARIANT";
      else if (v.format === "datetime") type2 = "TIMESTAMP_NTZ";
      res += `  ${col} ${type2}${v.optional ? "" : " NOT NULL"},
`;
    }
    res += `  CREATED_AT TIMESTAMP_NTZ NOT NULL DEFAULT CURRENT_TIMESTAMP()
`;
    res += `);
`;
    return res;
  }
};
var tomlGen = {
  generate: (schema2, name = "config") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    let res = `[${toSnakeCase2(name)}]
`;
    for (const [k, v] of Object.entries(f)) {
      if (v.type === "object" && v.fields) {
        res += `
[${toSnakeCase2(name)}.${toSnakeCase2(k)}]
`;
        for (const [k2, v2] of Object.entries(v.fields)) {
          res += `${toSnakeCase2(k2)} = ${tomlValue(v2)}
`;
        }
      } else if (v.type === "array") {
        const itemType = v.itemType?.type;
        const sample = itemType === "number" ? "0" : itemType === "boolean" ? "false" : '"sample_value"';
        res += `${toSnakeCase2(k)} = [${sample}]
`;
      } else {
        res += `${toSnakeCase2(k)} = ${tomlValue(v)}
`;
      }
    }
    return res;
  }
};
var tomlValue = (v) => {
  if (v.type === "number") return "0";
  if (v.type === "boolean") return "false";
  if (v.format === "datetime") return `"2024-01-01T00:00:00Z"`;
  return '"sample_value"';
};
var yamlOutputGen = {
  generate: (schema2) => {
    const buildSample = (s) => {
      if (s.type === "object" && s.fields) {
        return Object.fromEntries(
          Object.entries(s.fields).map(([k, v]) => [k, buildSample(v)])
        );
      }
      if (s.type === "array") return [buildSample(s.itemType ?? { type: "string" })];
      if (s.type === "number") return 0;
      if (s.type === "boolean") return false;
      if (s.format === "uuid") return "uuid-xxxx-xxxx";
      if (s.format === "email") return "user@example.com";
      if (s.format === "url") return "https://example.com";
      if (s.format === "datetime") return "2024-01-01T00:00:00Z";
      return "sample_value";
    };
    return jsYaml.dump(buildSample(schema2), { indent: 2 });
  }
};
var envGen = {
  generate: (schema2) => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const flattenEnv = (fields, prefix) => {
      let out = "";
      for (const [k, v] of Object.entries(fields)) {
        const key = toScreamingSnake(prefix ? `${prefix}_${k}` : k);
        if (v.type === "object" && v.fields) {
          out += flattenEnv(v.fields, prefix ? `${prefix}_${k}` : k);
        } else if (v.type === "array") {
          out += `${key}=
`;
        } else {
          let val = "your_value_here";
          if (v.type === "number") val = "0";
          else if (v.type === "boolean") val = "false";
          else if (v.format === "uuid") val = "uuid-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
          else if (v.format === "email") val = "user@example.com";
          else if (v.format === "url") val = "https://example.com";
          else if (v.format === "datetime") val = "2024-01-01T00:00:00Z";
          out += `${key}=${val}
`;
        }
      }
      return out;
    };
    let res = `# Generated by TypeMorph
`;
    res += flattenEnv(f, "");
    return res;
  }
};
var envValidatorGen = {
  generate: (schema2) => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const fieldToZod = (k, v) => {
      if (v.type === "boolean") {
        return `  ${k}: z.enum(["true", "false"]).transform(v => v === "true")`;
      }
      if (v.type === "number") {
        const intPart = v.format === "int" ? ".int()" : "";
        return `  ${k}: z.coerce.number()${intPart}`;
      }
      if (v.format === "url") return `  ${k}: z.string().url()`;
      if (v.format === "email") return `  ${k}: z.string().email()`;
      const optPart = v.optional ? ".optional()" : "";
      return `  ${k}: z.string()${optPart}`;
    };
    const lines = Object.entries(f).map(([k, v]) => fieldToZod(k, v));
    return `import { z } from "zod";

export const envSchema = z.object({
${lines.join(",\n")},
});

export type Env = z.infer<typeof envSchema>;

// Throws at startup if any env var is missing or invalid
export const env = envSchema.parse(process.env);`;
  }
};
var propertiesGen = {
  generate: (schema2) => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const flattenProps = (fields, prefix) => {
      let out = "";
      for (const [k, v] of Object.entries(fields)) {
        const key = (prefix ? `${prefix}.${toSnakeCase2(k)}` : toSnakeCase2(k)).replace(/_/g, ".");
        if (v.type === "object" && v.fields) {
          out += flattenProps(v.fields, key);
        } else if (v.type === "array") {
          out += `${key}=
`;
        } else {
          let val = "sample_value";
          if (v.type === "number") val = "0";
          else if (v.type === "boolean") val = "false";
          else if (v.format === "datetime") val = "2024-01-01T00:00:00Z";
          out += `${key}=${val}
`;
        }
      }
      return out;
    };
    let res = `# Generated by TypeMorph
`;
    res += flattenProps(f, "");
    return res;
  }
};
var markdownTableGen = {
  generate: (schema2) => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const keys = Object.keys(f);
    const header = `| ${keys.join(" | ")} |`;
    const sep = `| ${keys.map(() => "---").join(" | ")} |`;
    const row = `| ${Object.entries(f).map(([, v]) => {
      if (v.type === "number") return "0";
      if (v.type === "boolean") return "true";
      if (v.format === "email") return "user@example.com";
      if (v.type === "object" && v.fields) {
        return "`" + JSON.stringify(Object.fromEntries(Object.entries(v.fields).map(([k2, v2]) => [k2, v2.type === "number" ? 0 : v2.type === "boolean" ? false : "sample"]))) + "`";
      }
      if (v.type === "array") return "`[]`";
      return "sample";
    }).join(" | ")} |`;
    return `${header}
${sep}
${row}
`;
  }
};
var asciidocTableGen = {
  generate: (schema2) => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const keys = Object.keys(f);
    let res = `[cols="${keys.map(() => "1").join(",")}",options="header"]
|===
`;
    res += `| ${keys.join(" | ")}
`;
    res += `| ${Object.entries(f).map(([, v]) => v.type === "number" ? "0" : "sample").join(" | ")}
`;
    res += `|===
`;
    return res;
  }
};
var latexTableGen = {
  generate: (schema2) => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const keys = Object.keys(f);
    let res = `\\begin{tabular}{${keys.map(() => "l").join("|")}}
`;
    res += `\\hline
`;
    res += keys.join(" & ") + ` \\\\
\\hline
`;
    res += Object.entries(f).map(([, v]) => {
      if (v.type === "number") return "0";
      if (v.type === "boolean") return "false";
      if (v.type === "object") return "\\{...\\}";
      if (v.type === "array") return "[...]";
      if (v.format === "email") return "user@example.com";
      if (v.format === "datetime") return "2024-01-01T00:00:00Z";
      return "sample\\_value";
    }).join(" & ") + ` \\\\
`;
    res += `\\hline
\\end{tabular}
`;
    return res;
  }
};
var mermaidERGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    let res = `erDiagram
`;
    res += `  ${toPascalCase3(name)} {
`;
    for (const [k, v] of Object.entries(f)) {
      let type2 = "string";
      if (v.type === "number") type2 = "float";
      else if (v.type === "boolean") type2 = "boolean";
      else if (v.type === "object") type2 = "object";
      else if (v.type === "array") type2 = "array";
      res += `    ${type2} ${k}
`;
    }
    res += `  }
`;
    for (const [k, v] of Object.entries(f)) {
      if (v.type === "object" && v.fields) {
        const childName = toPascalCase3(k);
        res += `  ${childName} {
`;
        for (const [k2, v2] of Object.entries(v.fields)) {
          let t2 = "string";
          if (v2.type === "number") t2 = "float";
          else if (v2.type === "boolean") t2 = "boolean";
          res += `    ${t2} ${k2}
`;
        }
        res += `  }
`;
        res += `  ${toPascalCase3(name)} ||--o{ ${childName} : "has"
`;
      }
      if (v.type === "array" && v.itemType?.type === "object" && v.itemType.fields) {
        const childName = toPascalCase3(k) + "Item";
        res += `  ${childName} {
`;
        for (const [k2, v2] of Object.entries(v.itemType.fields)) {
          res += `    ${v2.type === "number" ? "float" : "string"} ${k2}
`;
        }
        res += `  }
`;
        res += `  ${toPascalCase3(name)} ||--o{ ${childName} : "contains"
`;
      }
    }
    for (const [k, v] of Object.entries(f)) {
      if (v.type !== "string" && v.type !== "number") continue;
      const isFK = (k.endsWith("_id") || k.endsWith("Id") && k !== "Id") && k.toLowerCase() !== "id";
      if (!isFK) continue;
      const refEntity = toPascalCase3(k.replace(/_id$/, "").replace(/Id$/, ""));
      if (!refEntity || refEntity === toPascalCase3(name)) continue;
      res += `  ${refEntity} {
    string id
  }
`;
      res += `  ${toPascalCase3(name)} }o--|| ${refEntity} : "references"
`;
    }
    return res;
  }
};
var avroType = (s) => {
  if (s.type === "number") return "double";
  if (s.type === "boolean") return "boolean";
  if (s.type === "object" && s.fields) {
    return {
      type: "record",
      name: "NestedRecord",
      fields: Object.entries(s.fields).map(([n, v]) => ({
        name: n,
        type: v.optional ? ["null", avroType(v)] : avroType(v)
      }))
    };
  }
  if (s.type === "array") {
    return { type: "array", items: avroType(s.itemType ?? { type: "string" }) };
  }
  if (s.type === "union" && s.unionTypes) return s.unionTypes.map((t) => t === "number" ? "double" : t);
  return "string";
};
var avroGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const avroSchema = {
      type: "record",
      name: toPascalCase3(name),
      namespace: "com.example",
      fields: Object.entries(f).map(([k, v]) => ({
        name: k,
        type: v.optional ? ["null", avroType(v)] : avroType(v),
        default: v.optional ? null : void 0
      }))
    };
    return JSON.stringify(avroSchema, null, 2);
  }
};
var bqField = (name, s) => {
  const mode = s.optional ? "NULLABLE" : "REQUIRED";
  if (s.type === "number") return { name, type: "FLOAT64", mode };
  if (s.type === "boolean") return { name, type: "BOOL", mode };
  if (s.format === "datetime") return { name, type: "TIMESTAMP", mode };
  if (s.type === "object" && s.fields) {
    return {
      name,
      type: "RECORD",
      mode,
      fields: Object.entries(s.fields).map(([k, v]) => bqField(k, v))
    };
  }
  if (s.type === "array") {
    const item = s.itemType ?? { type: "string" };
    if (item.type === "object" && item.fields) {
      return {
        name,
        type: "RECORD",
        mode: "REPEATED",
        fields: Object.entries(item.fields).map(([k, v]) => bqField(k, v))
      };
    }
    return { name, type: bqField("_item", item).type, mode: "REPEATED" };
  }
  return { name, type: "STRING", mode };
};
var bigQueryGen = {
  generate: (schema2) => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const bqSchema = Object.entries(f).map(([k, v]) => bqField(k, v));
    return JSON.stringify(bqSchema, null, 2);
  }
};
var dynamoValue = (s) => {
  if (s.type === "number") return { N: "0" };
  if (s.type === "boolean") return { BOOL: false };
  if (s.type === "array") {
    const item = s.itemType ?? { type: "string" };
    return { L: [dynamoValue(item)] };
  }
  if (s.type === "object" && s.fields) {
    return { M: Object.fromEntries(Object.entries(s.fields).map(([k, v]) => [k, dynamoValue(v)])) };
  }
  if (s.type === "object") return { M: {} };
  if (s.format === "datetime") return { S: "2024-01-01T00:00:00Z" };
  if (s.format === "uuid") return { S: "uuid-xxxx-xxxx" };
  if (s.format === "email") return { S: "user@example.com" };
  if (s.format === "url") return { S: "https://example.com" };
  return { S: "sample_value" };
};
var dynamoDBGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const item = {
      TableName: toSnakeCase2(name) + "s",
      Item: {
        id: { S: "uuid-xxxx-xxxx" },
        ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, dynamoValue(v)]))
      }
    };
    return JSON.stringify(item, null, 2);
  }
};
var openApiPropType = (s) => {
  if (s.type === "union" && s.unionTypes) {
    const res = { anyOf: s.unionTypes.map((t) => ({ type: t })) };
    if (s.nullable) res.nullable = true;
    return res;
  }
  if (s.type === "number") {
    const res = { type: "number", format: "double" };
    if (s.enumValues && s.enumValues.length) res.enum = s.enumValues;
    if (s.nullable) res.nullable = true;
    return res;
  }
  if (s.type === "boolean") {
    return s.nullable ? { type: "boolean", nullable: true } : { type: "boolean" };
  }
  if (s.type === "array") {
    const res = { type: "array", items: openApiPropType(s.itemType ?? { type: "string" }) };
    if (s.nullable) res.nullable = true;
    return res;
  }
  if (s.type === "object" && s.fields) {
    const res = {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(s.fields).map(([k, v]) => [k, openApiPropType(v)])
      )
    };
    if (s.nullable) res.nullable = true;
    return res;
  }
  const base = { type: "string" };
  if (s.format === "uuid") base.format = "uuid";
  else if (s.format === "email") base.format = "email";
  else if (s.format === "url") base.format = "uri";
  else if (s.format === "datetime") {
    base.type = "string";
    base.format = "date-time";
  }
  if (s.enumValues && s.enumValues.length) base.enum = s.enumValues;
  if (s.nullable) base.nullable = true;
  return base;
};
var openApiGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    const schemaName = toPascalCase3(name);
    const required = Object.entries(f).filter(([, v]) => !v.optional).map(([k]) => k);
    const spec = {
      openapi: "3.0.3",
      info: { title: `${schemaName} API`, version: "1.0.0" },
      paths: {
        [`/${toSnakeCase2(name)}s`]: {
          get: {
            summary: `List ${schemaName}s`,
            responses: {
              "200": {
                description: "Success",
                content: {
                  "application/json": {
                    schema: { type: "array", items: { $ref: `#/components/schemas/${schemaName}` } }
                  }
                }
              }
            }
          },
          post: {
            summary: `Create ${schemaName}`,
            requestBody: {
              required: true,
              content: {
                "application/json": { schema: { $ref: `#/components/schemas/${schemaName}` } }
              }
            },
            responses: { "201": { description: "Created" } }
          }
        }
      },
      components: {
        schemas: {
          [schemaName]: {
            type: "object",
            ...required.length ? { required } : {},
            properties: Object.fromEntries(
              Object.entries(f).map(([k, v]) => [k, openApiPropType(v)])
            )
          }
        }
      }
    };
    return jsYaml.dump(spec, { indent: 2 });
  }
};
var postmanGen = {
  generate: (schema2, name = "Root") => {
    const entity = toPascalCase3(name);
    const base = `https://api.example.com/${toSnakeCase2(name)}s`;
    const collection = {
      info: { name: `${entity} API`, schema: "https://schema.getpostman.com/json/collection/v2.1.0/" },
      item: [
        { name: `GET all ${entity}s`, request: { method: "GET", url: { raw: base } } },
        {
          name: `POST create ${entity}`,
          request: {
            method: "POST",
            url: { raw: base },
            header: [{ key: "Content-Type", value: "application/json" }],
            body: { mode: "raw", raw: "{}" }
          }
        },
        { name: `GET ${entity} by ID`, request: { method: "GET", url: { raw: `${base}/:id` } } },
        { name: `PUT update ${entity}`, request: { method: "PUT", url: { raw: `${base}/:id` } } },
        { name: `DELETE ${entity}`, request: { method: "DELETE", url: { raw: `${base}/:id` } } }
      ]
    };
    return JSON.stringify(collection, null, 2);
  }
};
var httpFileGen = {
  generate: (schema2, name = "Root") => {
    const base = `https://api.example.com/${toSnakeCase2(name)}s`;
    const f = getFields(schema2);
    const body = JSON.stringify(
      Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.type === "number" ? 0 : v.type === "boolean" ? false : "sample"])),
      null,
      2
    );
    return [
      `### Get all ${name}s`,
      `GET ${base}`,
      `Accept: application/json`,
      ``,
      `###`,
      ``,
      `### Create ${name}`,
      `POST ${base}`,
      `Content-Type: application/json`,
      ``,
      body,
      ``,
      `###`,
      ``,
      `### Get ${name} by ID`,
      `GET ${base}/{{id}}`,
      ``,
      `###`
    ].join("\n");
  }
};
var vscodeSnippetGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    const keys = Object.keys(f);
    let idx = 1;
    const body = [
      `{`,
      ...keys.map((k) => {
        const v = f[k];
        const placeholder = v.type === "number" ? "0" : v.type === "boolean" ? "false" : `\${${idx++}:${k}}`;
        return `  "${k}": ${v.type === "string" || v.format ? `"${placeholder}"` : placeholder},`;
      }),
      `}`
    ];
    const snippet2 = {
      [`${toPascalCase3(name)} Scaffold`]: {
        prefix: `${name.toLowerCase()}-scaffold`,
        body,
        description: `Generated by TypeMorph: ${toPascalCase3(name)} scaffold`
      }
    };
    return JSON.stringify(snippet2, null, 2);
  }
};
var curlOutputGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    const buildSampleValue = (v) => {
      if (v.type === "number") return 0;
      if (v.type === "boolean") return false;
      if (v.type === "object" && v.fields) {
        return Object.fromEntries(Object.entries(v.fields).map(([k2, v2]) => [k2, buildSampleValue(v2)]));
      }
      if (v.type === "array") {
        return v.itemType ? [buildSampleValue(v.itemType)] : [];
      }
      if (v.format === "uuid") return "uuid-xxxx-xxxx";
      if (v.format === "email") return "user@example.com";
      if (v.format === "url") return "https://example.com";
      if (v.format === "datetime") return "2024-01-01T00:00:00Z";
      return "sample";
    };
    const body = JSON.stringify(
      Object.fromEntries(Object.entries(f).map(([k, v]) => [k, buildSampleValue(v)])),
      null,
      2
    );
    return `curl -X POST https://api.example.com/${toSnakeCase2(name)}s \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_TOKEN' \\
  -d '${body}'
`;
  }
};
var mongooseGen = {
  generate: (schema2, name = "Root") => {
    schema2 = rootObject(schema2);
    const modelName = toPascalCase3(name);
    const schemaName = `${modelName}Schema`;
    const buildSchemaFields = (s, indent = "  ") => {
      const f = getFields(s);
      let res = "{\n";
      for (const [k, v] of Object.entries(f)) {
        res += `${indent}  ${k}: `;
        if (v.type === "object") {
          res += buildSchemaFields(v, indent + "  ") + ",\n";
        } else if (v.type === "array") {
          const item = v.itemType;
          if (item?.type === "object") {
            res += `[${buildSchemaFields(item, indent + "  ")}],
`;
          } else {
            let typeStr = "String";
            if (item?.type === "number") typeStr = "Number";
            else if (item?.type === "boolean") typeStr = "Boolean";
            else if (item?.type === "union" || item?.type === "any") typeStr = "Schema.Types.Mixed";
            else if (item?.enumValues && item.enumValues.length) typeStr = "String";
            res += `[${typeStr}],
`;
          }
        } else {
          let typeStr = "String";
          if (v.type === "number") typeStr = "Number";
          else if (v.type === "boolean") typeStr = "Boolean";
          else if (v.type === "union") typeStr = "Schema.Types.Mixed";
          let opts = `type: ${typeStr}`;
          if (!v.optional) opts += `, required: true`;
          if (v.enumValues && v.enumValues.length) {
            opts += `, enum: [${v.enumValues.map((e) => `"${e}"`).join(", ")}]`;
          }
          res += `{ ${opts} },
`;
        }
      }
      res += `${indent}}`;
      return res;
    };
    if (schema2.type === "object") {
      let out = `import mongoose, { Schema, Document } from 'mongoose';

`;
      out += `const ${schemaName} = new Schema(${buildSchemaFields(schema2)}, { timestamps: true });

`;
      out += `export interface I${modelName} extends Document {}
`;
      out += `export const ${modelName} = mongoose.models.${modelName} || mongoose.model<I${modelName}>('${modelName}', ${schemaName});
`;
      return out;
    }
    return "";
  }
};
var sequelizeGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const modelName = toPascalCase3(name);
    let res = `import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';

`;
    res += `export class ${modelName} extends Model {}

`;
    res += `${modelName}.init({
`;
    res += `  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = "DataTypes.STRING";
      if (v.type === "number") typeStr = "DataTypes.DOUBLE";
      else if (v.type === "boolean") typeStr = "DataTypes.BOOLEAN";
      else if (v.type === "object" || v.type === "array" || v.type === "union") typeStr = "DataTypes.JSON";
      else if (v.format === "datetime") typeStr = "DataTypes.DATE";
      if (v.enumValues && v.enumValues.length) {
        typeStr = `DataTypes.ENUM(${v.enumValues.map((e) => `'${e}'`).join(", ")})`;
      }
      res += `  ${k}: {
    type: ${typeStr},
    allowNull: ${!!v.optional || !!v.nullable}
  },
`;
    }
    res += `}, {
  sequelize,
  modelName: '${modelName}',
  tableName: '${toSnakeCase2(name)}s',
  timestamps: true
});
`;
    return res;
  }
};
var typeormGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const modelName = toPascalCase3(name);
    let res = `import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

`;
    res += `@Entity('${toSnakeCase2(name)}s')
`;
    res += `export class ${modelName} {
`;
    if (!f.id) {
      res += `  @PrimaryGeneratedColumn('uuid')
  id!: string;

`;
    }
    for (const [k, v] of Object.entries(f)) {
      let typeStr = "string";
      let colDecorator = `@Column()`;
      if (v.type === "number") {
        typeStr = "number";
        colDecorator = `@Column('double')`;
      } else if (v.type === "boolean") {
        typeStr = "boolean";
        colDecorator = `@Column('boolean')`;
      } else if (v.type === "object" || v.type === "array" || v.type === "union") {
        typeStr = "any";
        colDecorator = `@Column('jsonb')`;
      } else if (v.format === "datetime") {
        typeStr = "Date";
        colDecorator = `@Column('timestamp')`;
      }
      if (v.enumValues && v.enumValues.length) {
        const enumTypeStr = v.enumValues.map((e) => `'${e}'`).join(" | ");
        typeStr = enumTypeStr;
        const enumOpts = [`type: 'enum'`, `enum: [${enumTypeStr}]`];
        if (v.nullable) enumOpts.push("nullable: true");
        colDecorator = `@Column({
    ${enumOpts.join(",\n    ")}
  })`;
      }
      if (v.nullable && !(v.enumValues && v.enumValues.length)) {
        colDecorator = colDecorator.replace(/\)$/, `, nullable: true)`);
      }
      res += `  ${colDecorator}
  ${k}${v.optional ? "?" : "!"}: ${typeStr}${v.nullable ? " | null" : ""};

`;
    }
    if (!f.createdAt && !f.created_at) {
      res += `  @CreateDateColumn()
  createdAt!: Date;

`;
    }
    if (!f.updatedAt && !f.updated_at) {
      res += `  @UpdateDateColumn()
  updatedAt!: Date;
`;
    }
    res += `}
`;
    return res;
  }
};
var drizzleGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const tableName = `${toSnakeCase2(name)}s`;
    let res = `import { pgTable, uuid, varchar, doublePrecision, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';

`;
    res += `export const ${toSnakeCase2(name)} = pgTable('${tableName}', {
`;
    if (!f.id) {
      res += `  id: uuid('id').defaultRandom().primaryKey(),
`;
    }
    for (const [k, v] of Object.entries(f)) {
      const dbCol = toSnakeCase2(k);
      let colBuilder = `varchar('${dbCol}', { length: 255 })`;
      if (v.type === "number") colBuilder = `doublePrecision('${dbCol}')`;
      else if (v.type === "boolean") colBuilder = `boolean('${dbCol}')`;
      else if (v.type === "object" || v.type === "array" || v.type === "union") colBuilder = `jsonb('${dbCol}')`;
      else if (v.format === "datetime") colBuilder = `timestamp('${dbCol}')`;
      if (v.enumValues && v.enumValues.length) {
        colBuilder = `varchar('${dbCol}', { enum: [${v.enumValues.map((e) => `'${e}'`).join(", ")}] })`;
      }
      const notNull = v.optional || v.nullable ? "" : ".notNull()";
      res += `  ${k}: ${colBuilder}${notNull},
`;
    }
    if (!f.createdAt && !f.created_at) {
      res += `  createdAt: timestamp('created_at').defaultNow().notNull(),
`;
    }
    if (!f.updatedAt && !f.updated_at) {
      res += `  updatedAt: timestamp('updated_at').defaultNow().notNull()
`;
    }
    res = res.replace(/,\n$/, "\n");
    res += `});
`;
    return res;
  }
};
var kyselyGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const interfaceName = toPascalCase3(name);
    let res = `import { Generated, ColumnType } from 'kysely';

`;
    res += `export interface ${interfaceName}Table {
`;
    if (!f.id) {
      res += `  id: Generated<string>;
`;
    }
    for (const [k, v] of Object.entries(f)) {
      let typeStr = "string";
      if (v.type === "number") typeStr = "number";
      else if (v.type === "boolean") typeStr = "boolean";
      else if (v.type === "object" || v.type === "array") typeStr = "unknown";
      else if (v.format === "datetime") typeStr = "Date | string";
      const typeWithNull = v.optional ? `${typeStr} | null` : typeStr;
      res += `  ${k}: ${typeWithNull};
`;
    }
    if (!f.createdAt && !f.created_at) {
      res += `  createdAt: Generated<string>;
`;
    }
    if (!f.updatedAt && !f.updated_at) {
      res += `  updatedAt: ColumnType<string, string | undefined, string>;
`;
    }
    res += `}

`;
    res += `export interface Database {
`;
    res += `  ${toSnakeCase2(name)}s: ${interfaceName}Table;
`;
    res += `}
`;
    return res;
  }
};
var yupGen = {
  generate: (schema2, name = "root", _seen = /* @__PURE__ */ new Set()) => {
    schema2 = rootObject(schema2);
    if (schema2.type === "object" && schema2.fields) {
      if (_seen.has(name)) return "";
      _seen.add(name);
      let res = "";
      if (_seen.size === 1) {
        res += `import * as yup from 'yup';

`;
      }
      res += `export const ${name}YupSchema = yup.object({
`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        const nullable = v.nullable ? ".nullable()" : "";
        const required = v.optional ? "" : ".required()";
        const childSchemaName = name + toPascalCase3(k);
        let yupType = "";
        if (v.type === "object") {
          yupType = `${childSchemaName}YupSchema`;
        } else if (v.type === "array") {
          const item = v.itemType;
          let innerYup;
          if (item?.type === "string" && item.enumValues) {
            innerYup = `yup.string().oneOf([${item.enumValues.map((ev) => `"${ev}"`).join(", ")}])`;
          } else {
            innerYup = item?.type === "object" ? `${childSchemaName}ItemYupSchema` : `yup.${item?.type ?? "string"}()`;
          }
          yupType = `yup.array().of(${innerYup})`;
        } else if (v.type === "union" && v.unionTypes) {
          yupType = `yup.mixed()`;
        } else if (v.type === "string" && v.enumValues) {
          yupType = `yup.string().oneOf([${v.enumValues.map((ev) => `"${ev}"`).join(", ")}])`;
        } else if (v.type === "string") {
          yupType = "yup.string()";
          if (v.format === "email") yupType += ".email()";
          else if (v.format === "url") yupType += ".url()";
          else if (v.format === "uuid") yupType += ".uuid()";
        } else {
          yupType = v.type === "any" ? "yup.mixed()" : `yup.${v.type}()`;
        }
        res += `  ${k}: ${yupType}${nullable}${required},
`;
      }
      res += `});

`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        const childName = name + toPascalCase3(k);
        if (v.type === "object") res += yupGen.generate(v, childName, _seen);
        if (v.type === "array" && v.itemType?.type === "object") res += yupGen.generate(v.itemType, childName + "Item", _seen);
      }
      return res;
    }
    return "";
  }
};
var joiGen = {
  generate: (schema2, name = "root", _seen = /* @__PURE__ */ new Set()) => {
    schema2 = rootObject(schema2);
    if (schema2.type === "object" && schema2.fields) {
      if (_seen.has(name)) return "";
      _seen.add(name);
      let res = "";
      if (_seen.size === 1) {
        res += `import Joi from 'joi';

`;
      }
      res += `export const ${name}JoiSchema = Joi.object({
`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        const nullable = v.nullable ? ".allow(null)" : "";
        const required = v.optional ? "" : ".required()";
        const childSchemaName = name + toPascalCase3(k);
        let joiType = "";
        if (v.type === "object") {
          joiType = `${childSchemaName}JoiSchema`;
        } else if (v.type === "array") {
          const item = v.itemType;
          let innerJoi;
          if (item?.type === "string" && item.enumValues) {
            innerJoi = `Joi.string().valid(${item.enumValues.map((ev) => `"${ev}"`).join(", ")})`;
          } else {
            innerJoi = item?.type === "object" ? `${childSchemaName}ItemJoiSchema` : `Joi.${item?.type ?? "string"}()`;
          }
          joiType = `Joi.array().items(${innerJoi})`;
        } else if (v.type === "union" && v.unionTypes) {
          joiType = `Joi.alternatives().try(${v.unionTypes.map((ut) => `Joi.valid(${typeof ut === "string" ? `"${ut}"` : ut})`).join(", ")})`;
        } else if (v.type === "string" && v.enumValues) {
          joiType = `Joi.string().valid(${v.enumValues.map((ev) => `"${ev}"`).join(", ")})`;
        } else if (v.type === "string") {
          joiType = "Joi.string()";
          if (v.format === "email") joiType += ".email()";
          else if (v.format === "url") joiType += ".uri()";
          else if (v.format === "uuid") joiType += ".guid()";
        } else {
          joiType = `Joi.${v.type}()`;
        }
        res += `  ${k}: ${joiType}${nullable}${required},
`;
      }
      res += `});

`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        const childName = name + toPascalCase3(k);
        if (v.type === "object") res += joiGen.generate(v, childName, _seen);
        if (v.type === "array" && v.itemType?.type === "object") res += joiGen.generate(v.itemType, childName + "Item", _seen);
      }
      return res;
    }
    return "";
  }
};
var valibotGen = {
  generate: (schema2, name = "root", _seen = /* @__PURE__ */ new Set()) => {
    schema2 = rootObject(schema2);
    if (schema2.type === "object" && schema2.fields) {
      if (_seen.has(name)) return "";
      _seen.add(name);
      let res = "";
      if (_seen.size === 1) {
        res += `import * as v from 'valibot';

`;
      }
      res += `export const ${name}ValiSchema = v.object({
`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        const childSchemaName = name + toPascalCase3(k);
        let valiType = "";
        if (v.type === "object") {
          valiType = `${childSchemaName}ValiSchema`;
        } else if (v.type === "array") {
          const item = v.itemType;
          let innerVali;
          if (item?.type === "string" && item.enumValues) {
            innerVali = `v.picklist([${item.enumValues.map((ev) => `"${ev}"`).join(", ")}])`;
          } else {
            innerVali = item?.type === "object" ? `${childSchemaName}ItemValiSchema` : `v.${item?.type ?? "string"}()`;
          }
          valiType = `v.array(${innerVali})`;
        } else if (v.type === "union" && v.unionTypes) {
          valiType = `v.union([${v.unionTypes.map((ut) => typeof ut === "string" ? `v.literal("${ut}")` : `v.literal(${ut})`).join(", ")}])`;
        } else if (v.type === "string" && v.enumValues) {
          valiType = `v.picklist([${v.enumValues.map((ev) => `"${ev}"`).join(", ")}])`;
        } else if (v.type === "string") {
          valiType = "v.string()";
          if (v.format === "email") valiType = "v.pipe(v.string(), v.email())";
          else if (v.format === "url") valiType = "v.pipe(v.string(), v.url())";
          else if (v.format === "uuid") valiType = "v.pipe(v.string(), v.uuid())";
        } else {
          valiType = `v.${v.type}()`;
        }
        if (v.nullable) {
          valiType = `v.nullable(${valiType})`;
        }
        if (v.optional) {
          valiType = `v.optional(${valiType})`;
        }
        res += `  ${k}: ${valiType},
`;
      }
      res += `});

`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        const childName = name + toPascalCase3(k);
        if (v.type === "object") res += valibotGen.generate(v, childName, _seen);
        if (v.type === "array" && v.itemType?.type === "object") res += valibotGen.generate(v.itemType, childName + "Item", _seen);
      }
      return res;
    }
    return "";
  }
};
var superstructGen = {
  generate: (schema2, name = "root", _seen = /* @__PURE__ */ new Set()) => {
    schema2 = rootObject(schema2);
    if (schema2.type === "object" && schema2.fields) {
      if (_seen.has(name)) return "";
      _seen.add(name);
      let res = "";
      if (_seen.size === 1) {
        res += `import * as s from 'superstruct';

`;
      }
      res += `export const ${name}Struct = s.type({
`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        const childSchemaName = name + toPascalCase3(k);
        let structType = "";
        if (v.type === "object") {
          structType = `${childSchemaName}Struct`;
        } else if (v.type === "array") {
          const item = v.itemType;
          let innerStruct;
          if (item?.type === "string" && item.enumValues) {
            innerStruct = `s.enums([${item.enumValues.map((ev) => `"${ev}"`).join(", ")}])`;
          } else {
            innerStruct = item?.type === "object" ? `${childSchemaName}ItemStruct` : `s.${item?.type ?? "string"}()`;
          }
          structType = `s.array(${innerStruct})`;
        } else if (v.type === "union" && v.unionTypes) {
          structType = `s.union([${v.unionTypes.map((ut) => typeof ut === "string" ? `s.literal("${ut}")` : `s.literal(${ut})`).join(", ")}])`;
        } else if (v.type === "string" && v.enumValues) {
          structType = `s.enums([${v.enumValues.map((ev) => `"${ev}"`).join(", ")}])`;
        } else {
          structType = `s.${v.type}()`;
        }
        if (v.nullable) {
          structType = `s.nullable(${structType})`;
        }
        if (v.optional) {
          structType = `s.optional(${structType})`;
        }
        res += `  ${k}: ${structType},
`;
      }
      res += `});

`;
      for (const [k, v] of Object.entries(schema2.fields)) {
        const childName = name + toPascalCase3(k);
        if (v.type === "object") res += superstructGen.generate(v, childName, _seen);
        if (v.type === "array" && v.itemType?.type === "object") res += superstructGen.generate(v.itemType, childName + "Item", _seen);
      }
      return res;
    }
    return "";
  }
};
var reactPropsGen = {
  generate: (schema2, name = "Component") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const componentName = toPascalCase3(name);
    let res = `import React from 'react';

`;
    res += `export interface ${componentName}Props {
`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = "string";
      if (v.type === "number") typeStr = "number";
      else if (v.type === "boolean") typeStr = "boolean";
      else if (v.type === "object") typeStr = "Record<string, any>";
      else if (v.type === "array") typeStr = "any[]";
      res += `  ${k}${v.optional ? "?" : ""}: ${typeStr};
`;
    }
    res += `}

`;
    res += `export const ${componentName}: React.FC<${componentName}Props> = (props) => {
`;
    res += `  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`;
    res += `      <h2 className="text-xl font-bold mb-2">${componentName}</h2>
`;
    res += `      <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-400">
`;
    for (const k of Object.keys(f)) {
      res += `        <li><strong>${k}:</strong> {String(props.${k} ?? '')}</li>
`;
    }
    res += `      </ul>
    </div>
  );
};
`;
    return res;
  }
};
var reactContextGen = {
  generate: (schema2, name = "State") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const contextName = toPascalCase3(name);
    let res = `import React, { createContext, useContext, useState, ReactNode } from 'react';

`;
    res += `export interface ${contextName}State {
`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = "string";
      if (v.type === "number") typeStr = "number";
      else if (v.type === "boolean") typeStr = "boolean";
      else if (v.type === "object") typeStr = "Record<string, any>";
      else if (v.type === "array") typeStr = "any[]";
      res += `  ${k}${v.optional ? "?" : ""}: ${typeStr};
`;
    }
    res += `}

`;
    res += `interface ${contextName}ContextType {
  state: ${contextName}State;
  updateState: (updates: Partial<${contextName}State>) => void;
}

`;
    res += `const ${contextName}Context = createContext<${contextName}ContextType | undefined>(undefined);

`;
    res += `export const ${contextName}Provider = ({ children, initial }: { children: ReactNode; initial: ${contextName}State }) => {
`;
    res += `  const [state, setState] = useState<${contextName}State>(initial);
`;
    res += `  const updateState = (updates: Partial<${contextName}State>) => setState(prev => ({ ...prev, ...updates }));

`;
    res += `  return (
    <${contextName}Context.Provider value={{ state, updateState }}>
      {children}
    </${contextName}Context.Provider>
  );
};

`;
    res += `export const use${contextName}Context = () => {
  const context = useContext(${contextName}Context);
  if (!context) throw new Error('use${contextName}Context must be used within ${contextName}Provider');
  return context;
};
`;
    return res;
  }
};
var reduxSliceGen = {
  generate: (schema2, name = "User") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const sliceName = toPascalCase3(name);
    const snakeSlice = toSnakeCase2(name);
    let res = `import { createSlice, PayloadAction } from '@reduxjs/toolkit';

`;
    res += `export interface ${sliceName}State {
`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = "string";
      if (v.type === "number") typeStr = "number";
      else if (v.type === "boolean") typeStr = "boolean";
      else if (v.type === "object") typeStr = "Record<string, any>";
      else if (v.type === "array") typeStr = "any[]";
      res += `  ${k}${v.optional ? "?" : ""}: ${typeStr};
`;
    }
    res += `}

`;
    res += `const initialState: ${sliceName}State = {
`;
    for (const [k, v] of Object.entries(f)) {
      let dVal = `''`;
      if (v.type === "number") dVal = "0";
      else if (v.type === "boolean") dVal = "false";
      else if (v.type === "object") dVal = "{}";
      else if (v.type === "array") dVal = "[]";
      res += `  ${k}: ${dVal},
`;
    }
    res += `};

`;
    res += `export const ${snakeSlice}Slice = createSlice({
`;
    res += `  name: '${snakeSlice}',
  initialState,
  reducers: {
`;
    res += `    set${sliceName}: (state, action: PayloadAction<Partial<${sliceName}State>>) => {
`;
    res += `      return { ...state, ...action.payload };
`;
    res += `    },
`;
    res += `    reset${sliceName}: () => initialState,
`;
    res += `  },
});

`;
    res += `export const { set${sliceName}, reset${sliceName} } = ${snakeSlice}Slice.actions;
`;
    res += `export default ${snakeSlice}Slice.reducer;
`;
    return res;
  }
};
var piniaStoreGen = {
  generate: (schema2, name = "User") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const storeName = toPascalCase3(name);
    const snakeStore = toSnakeCase2(name);
    let res = `import { defineStore } from 'pinia';

`;
    res += `export const use${storeName}Store = defineStore('${snakeStore}', {
`;
    res += `  state: () => ({
`;
    for (const [k, v] of Object.entries(f)) {
      let dVal = `''`;
      if (v.type === "number") dVal = "0";
      else if (v.type === "boolean") dVal = "false";
      else if (v.type === "object") dVal = "{}";
      else if (v.type === "array") dVal = "[]";
      res += `    ${k}: ${dVal} as ${v.type === "number" ? "number" : v.type === "boolean" ? "boolean" : v.type === "array" ? "any[]" : v.type === "object" ? "Record<string, any>" : "string"},
`;
    }
    res += `  }),
`;
    res += `  actions: {
`;
    res += `    update(data: Partial<${storeName}State>) {
`;
    res += `      Object.assign(this, data);
`;
    res += `    },
`;
    res += `    reset() {
      this.$reset();
    }
`;
    res += `  }
});
`;
    return res;
  }
};
var vuePropsGen = {
  generate: (schema2, name = "Component") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    let res = `<script setup lang="ts">
`;
    res += `defineProps<{
`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = "string";
      if (v.type === "number") typeStr = "number";
      else if (v.type === "boolean") typeStr = "boolean";
      else if (v.type === "object") typeStr = "Record<string, any>";
      else if (v.type === "array") typeStr = "any[]";
      res += `  ${k}${v.optional ? "?" : ""}: ${typeStr};
`;
    }
    res += `}>();
`;
    res += `</script>

`;
    res += `<template>
  <div class="vue-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`;
    res += `    <h2 class="text-xl font-bold mb-2">${toPascalCase3(name)}</h2>
`;
    res += `    <ul class="text-sm space-y-1">
`;
    for (const k of Object.keys(f)) {
      res += `      <li><strong>${k}:</strong> {{ ${k} }}</li>
`;
    }
    res += `    </ul>
  </div>
</template>
`;
    return res;
  }
};
var sveltePropsGen = {
  generate: (schema2, name = "Component") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    let res = `<script lang="ts">
`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = "string";
      if (v.type === "number") typeStr = "number";
      else if (v.type === "boolean") typeStr = "boolean";
      else if (v.type === "object") typeStr = "Record<string, any>";
      else if (v.type === "array") typeStr = "any[]";
      res += `  export let ${k}: ${typeStr}${v.optional ? " | undefined = undefined" : ""};
`;
    }
    res += `</script>

`;
    res += `<div class="svelte-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`;
    res += `  <h2 class="text-xl font-bold mb-2">${toPascalCase3(name)}</h2>
`;
    res += `  <ul class="text-sm space-y-1">
`;
    for (const k of Object.keys(f)) {
      res += `    <li><strong>${k}:</strong> {${k}}</li>
`;
    }
    res += `  </ul>
</div>
`;
    return res;
  }
};
var solidPropsGen = {
  generate: (schema2, name = "Component") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const compName = toPascalCase3(name);
    let res = `import { Component } from 'solid-js';

`;
    res += `export interface ${compName}Props {
`;
    for (const [k, v] of Object.entries(f)) {
      let typeStr = "string";
      if (v.type === "number") typeStr = "number";
      else if (v.type === "boolean") typeStr = "boolean";
      else if (v.type === "object") typeStr = "Record<string, any>";
      else if (v.type === "array") typeStr = "any[]";
      res += `  ${k}${v.optional ? "?" : ""}: ${typeStr};
`;
    }
    res += `}

`;
    res += `export const ${compName}: Component<${compName}Props> = (props) => {
`;
    res += `  return (
    <div class="solid-card p-4 rounded-xl border border-slate-200 dark:border-slate-800">
`;
    res += `      <h2 class="text-xl font-bold mb-2">${compName}</h2>
`;
    res += `      <ul class="text-sm space-y-1">
`;
    for (const k of Object.keys(f)) {
      res += `        <li><strong>${k}:</strong> {String(props.${k} ?? '')}</li>
`;
    }
    res += `      </ul>
    </div>
  );
};
`;
    return res;
  }
};
var arduinoGen = {
  generate: (schema2, name = "Data") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const structName = toPascalCase3(name);
    let res = `// Generated by TypeMorph (requires ArduinoJson library)
`;
    res += `#include <ArduinoJson.h>

`;
    res += `struct ${structName} {
`;
    for (const [k, v] of Object.entries(f)) {
      let cType = "String";
      if (v.type === "number") cType = "double";
      else if (v.type === "boolean") cType = "bool";
      res += `  ${cType} ${k};
`;
    }
    res += `};

`;
    res += `void deserialize${structName}(Stream& stream, ${structName}& data) {
`;
    res += `  StaticJsonDocument<1024> doc;
`;
    res += `  deserializeJson(doc, stream);

`;
    for (const k of Object.keys(f)) {
      res += `  data.${k} = doc["${k}"];
`;
    }
    res += `}
`;
    return res;
  }
};
var cobolGen = {
  generate: (schema2, name = "RECORD") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const recordName = toScreamingSnake(name).substring(0, 20);
    let res = `      * Generated by TypeMorph \u2014 COBOL Copybook
`;
    res += `       01  ${recordName}.
`;
    for (const [k, v] of Object.entries(f)) {
      const fieldName = toScreamingSnake(k).substring(0, 20);
      if (v.type === "object" && v.fields) {
        res += `           05  ${fieldName.padEnd(20)}.
`;
        for (const [k2, v2] of Object.entries(v.fields)) {
          const subName = toScreamingSnake(k2).substring(0, 20);
          const picStr2 = v2.type === "number" ? "9(9)V99" : v2.type === "boolean" ? "9(1)" : "X(255)";
          res += `               10  ${subName.padEnd(20)} PIC ${picStr2}.
`;
        }
      } else if (v.type === "array") {
        const itemPic = v.itemType?.type === "number" ? "9(9)V99" : "X(255)";
        res += `           05  ${fieldName.padEnd(20)} OCCURS 10 TIMES PIC ${itemPic}.
`;
      } else {
        let picStr = "X(255)";
        if (v.type === "number") picStr = "9(9)V99";
        else if (v.type === "boolean") picStr = "9(1)";
        res += `           05  ${fieldName.padEnd(20)} PIC ${picStr}.
`;
      }
    }
    return res;
  }
};
var clojureGen = {
  generate: (schema2, name = "data") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const ns = toSnakeCase2(name);
    let res = `(ns com.example.${ns}-spec
  (:require [clojure.spec.alpha :as s]))

`;
    const keys = [];
    for (const [k, v] of Object.entries(f)) {
      const specName = `::${toSnakeCase2(k)}`;
      keys.push(specName);
      let pred = "string?";
      if (v.type === "number") pred = "number?";
      else if (v.type === "boolean") pred = "boolean?";
      else if (v.type === "array") pred = "(s/coll-of any?)";
      else if (v.type === "object" && v.fields) {
        const nestedKeys = Object.keys(v.fields).map((k2) => `::${toSnakeCase2(k2)}`);
        for (const [k2, v2] of Object.entries(v.fields)) {
          const p2 = v2.type === "number" ? "number?" : v2.type === "boolean" ? "boolean?" : "string?";
          res += `(s/def ::${toSnakeCase2(k2)} ${p2})
`;
        }
        pred = `(s/keys :req [${nestedKeys.join(" ")}])`;
      }
      res += `(s/def ${specName} ${pred})
`;
    }
    const req = keys.join(" ");
    res += `
(s/def ::${toSnakeCase2(name)} (s/keys :req [${req}]))
`;
    return res;
  }
};
var elixirGen = {
  generate: (schema2, name = "Data") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const moduleName = toPascalCase3(name);
    let res = `defmodule MyApp.${moduleName} do
  use Ecto.Schema
  import Ecto.Changeset

`;
    res += `  schema "${toSnakeCase2(name)}s" do
`;
    for (const [k, v] of Object.entries(f)) {
      let eType = ":string";
      if (v.type === "number") eType = ":float";
      else if (v.type === "boolean") eType = ":boolean";
      else if (v.type === "object" || v.type === "array") eType = ":map";
      else if (v.format === "datetime") eType = ":utc_datetime";
      res += `    field :${toSnakeCase2(k)}, ${eType}
`;
    }
    res += `    timestamps()
  end

`;
    const requiredKeys = Object.entries(f).filter(([, v]) => !v.optional).map(([k]) => `:${toSnakeCase2(k)}`);
    res += `  def changeset(struct, params \\\\ %{}) do
`;
    res += `    struct
`;
    res += `    |> cast(params, [${Object.keys(f).map((k) => `:${toSnakeCase2(k)}`).join(", ")}])
`;
    if (requiredKeys.length) {
      res += `    |> validate_required([${requiredKeys.join(", ")}])
`;
    }
    res += `  end
end
`;
    return res;
  }
};
var elmGen = {
  generate: (schema2, name = "Model") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const modelName = toPascalCase3(name);
    let res = `module MyApp.${modelName} exposing (..)

import Json.Decode as Decode exposing (Decoder)
import Json.Decode.Pipeline exposing (required, optional)

`;
    res += `type alias ${modelName} =
    {
`;
    const fieldsArr = Object.entries(f).map(([k, v]) => {
      let elmType = "String";
      if (v.type === "number") elmType = "Float";
      else if (v.type === "boolean") elmType = "Bool";
      if (v.optional) elmType = `Maybe ${elmType}`;
      return `    ${k} : ${elmType}`;
    });
    res += fieldsArr.join("\n    , ") + "\n    }\n\n";
    res += `decoder : Decoder ${modelName}
decoder =
    Decode.succeed ${modelName}
`;
    for (const [k, v] of Object.entries(f)) {
      let innerDec = "Decode.string";
      if (v.type === "number") innerDec = "Decode.float";
      else if (v.type === "boolean") innerDec = "Decode.bool";
      if (v.optional) {
        res += `        |> optional "${k}" (Decode.nullable ${innerDec}) Nothing
`;
      } else {
        res += `        |> required "${k}" ${innerDec}
`;
      }
    }
    return res;
  }
};
var godotGen = {
  generate: (schema2, name = "Data") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    let res = `# Generated by TypeMorph \u2014 GDScript
class_name ${toPascalCase3(name)}

`;
    for (const [k, v] of Object.entries(f)) {
      let gdType = "String";
      let dVal = '""';
      if (v.type === "number") {
        gdType = "float";
        dVal = "0.0";
      } else if (v.type === "boolean") {
        gdType = "bool";
        dVal = "false";
      } else if (v.type === "object") {
        gdType = "Dictionary";
        dVal = "{}";
      } else if (v.type === "array") {
        gdType = "Array";
        dVal = "[]";
      }
      res += `var ${toSnakeCase2(k)}: ${gdType} = ${dVal}
`;
    }
    res += `
static func from_dict(dict: Dictionary) -> ${toPascalCase3(name)}:
`;
    res += `  var instance = ${toPascalCase3(name)}.new()
`;
    for (const k of Object.keys(f)) {
      const snake = toSnakeCase2(k);
      res += `  if dict.has("${k}"):
    instance.${snake} = dict["${k}"]
`;
    }
    res += `  return instance
`;
    return res;
  }
};
var haskellGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const typeName = toPascalCase3(name);
    let res = `{-# LANGUAGE DeriveGeneric #-}
module MyApp.${typeName} where

import GHC.Generics (Generic)
import Data.Aeson (FromJSON, ToJSON)

`;
    res += `data ${typeName} = ${typeName}
  { `;
    const fieldsArr = Object.entries(f).map(([k, v]) => {
      let haskellType = "String";
      if (v.type === "number") haskellType = v.format === "int" ? "Int" : "Double";
      else if (v.type === "boolean") haskellType = "Bool";
      if (v.optional || v.nullable) haskellType = `Maybe ${haskellType}`;
      return `${toCamelCase2(k)} :: ${haskellType}`;
    });
    res += fieldsArr.join("\n  , ") + "\n  } deriving (Show, Generic)\n\n";
    res += `instance FromJSON ${typeName}
instance ToJSON ${typeName}
`;
    return res;
  }
};
var rGen = {
  generate: (schema2, name = "df") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const dfName = toSnakeCase2(name);
    let res = `# Generated by TypeMorph
`;
    res += `${dfName} <- data.frame(
`;
    const cols = Object.entries(f).map(([k, v]) => {
      let val = '"sample_value"';
      if (v.type === "number") val = "0.0";
      else if (v.type === "boolean") val = "TRUE";
      else if (v.type === "object") val = "list()";
      else if (v.type === "array") val = "list()";
      else if (v.format === "email") val = '"user@example.com"';
      else if (v.format === "datetime") val = 'as.POSIXct("2024-01-01")';
      return `  ${toSnakeCase2(k)} = c(${val})`;
    });
    res += cols.join(",\n") + ",\n  stringsAsFactors = FALSE\n)\n";
    return res;
  }
};
var scalaGen = {
  generate: (schema2, name = "Root") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const className = toPascalCase3(name);
    let res = `// Generated by TypeMorph
`;
    res += `case class ${className}(
`;
    const cols = Object.entries(f).map(([k, v]) => {
      let sType = "String";
      if (v.type === "number") sType = "Double";
      else if (v.type === "boolean") sType = "Boolean";
      else if (v.type === "object") sType = "Map[String, Any]";
      else if (v.type === "array") sType = "List[Any]";
      if (v.optional) sType = `Option[${sType}]`;
      return `  ${k}: ${sType}`;
    });
    res += cols.join(",\n") + "\n)\n";
    return res;
  }
};
var solidityGen = {
  generate: (schema2, name = "Record") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const nestedStructDefs = [];
    let mainFields = "";
    for (const [k, v] of Object.entries(f)) {
      let solType = "string";
      if (v.type === "number") solType = "uint256";
      else if (v.type === "boolean") solType = "bool";
      else if (v.type === "array") {
        const itemType = v.itemType?.type === "number" ? "uint256" : v.itemType?.type === "boolean" ? "bool" : "string";
        solType = `${itemType}[]`;
      } else if (v.type === "object" && v.fields) {
        const structName = toPascalCase3(k);
        let nested = `    struct ${structName} {
`;
        for (const [k2, v2] of Object.entries(v.fields)) {
          const t2 = v2.type === "number" ? "uint256" : v2.type === "boolean" ? "bool" : "string";
          nested += `        ${t2} ${k2};
`;
        }
        nested += `    }`;
        nestedStructDefs.push(nested);
        solType = structName;
      }
      mainFields += `        ${solType} ${k};
`;
    }
    let res = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

`;
    res += `contract ${toPascalCase3(name)}Store {
`;
    for (const nd of nestedStructDefs) res += nd + "\n\n";
    res += `    struct ${toPascalCase3(name)} {
`;
    res += `        uint256 id;
`;
    res += mainFields;
    res += `    }
`;
    res += `}
`;
    return res;
  }
};
var djangoGen = {
  generate: (schema2, name = "Post") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const className = toPascalCase3(name);
    let res = `from django.db import models
from rest_framework import serializers

`;
    res += `class ${className}(models.Model):
`;
    for (const [k, v] of Object.entries(f)) {
      const snake = toSnakeCase2(k);
      const nullOpt = v.optional ? ", null=True, blank=True" : "";
      let fieldStr = `models.CharField(max_length=255${nullOpt})`;
      if (v.type === "number") fieldStr = `models.FloatField(${nullOpt})`;
      else if (v.type === "boolean") fieldStr = `models.BooleanField(default=False)`;
      else if (v.type === "object" || v.type === "array") fieldStr = `models.JSONField(${nullOpt})`;
      else if (v.format === "datetime") fieldStr = `models.DateTimeField(auto_now_add=True)`;
      res += `    ${snake} = ${fieldStr}
`;
    }
    res += `

class ${className}Serializer(serializers.ModelSerializer):
`;
    res += `    class Meta:
`;
    res += `        model = ${className}
`;
    res += `        fields = '__all__'
`;
    return res;
  }
};
var railsGen = {
  generate: (schema2, name = "User") => {
    const f = getFields(schema2);
    if (!Object.keys(f).length) return "";
    const migrationName = `Create${toPascalCase3(name)}s`;
    let res = `class ${migrationName} < ActiveRecord::Migration[7.0]
  def change
`;
    res += `    create_table :${toSnakeCase2(name)}s do |t|
`;
    for (const [k, v] of Object.entries(f)) {
      if (k.toLowerCase() === "id") continue;
      let rType = "string";
      if (v.type === "number") rType = v.format === "int" ? "integer" : "decimal";
      else if (v.type === "boolean") rType = "boolean";
      else if (v.type === "object" || v.type === "array") rType = "jsonb";
      else if (v.format === "datetime") rType = "datetime";
      const opt = v.optional ? ", null: true" : ", null: false";
      res += `      t.${rType} :${toSnakeCase2(k)}${opt}
`;
    }
    res += `      t.timestamps
    end
  end
end
`;
    return res;
  }
};
var apiRouteGen = {
  generate: (schema2, name = "Root") => {
    const entityName = toPascalCase3(name);
    const entityLower = toSnakeCase2(name);
    const f = getFields(schema2);
    const fields = Object.keys(f);
    const fieldToZod = (k, v) => {
      const kl = k.toLowerCase();
      if (v.type === "number") {
        let t = "z.number()";
        if (kl.includes("age")) t += ".int().min(0).max(150)";
        else if (kl.includes("year")) t += ".int().min(1900).max(2100)";
        else if (kl.includes("month") && !kl.includes("monthly")) t += ".int().min(1).max(12)";
        else if (kl === "day" || kl.endsWith("_day") || kl.startsWith("day_")) t += ".int().min(1).max(31)";
        else if (kl.includes("count") || kl.includes("quantity")) t += ".int().min(0)";
        else if (["price", "amount", "cost", "fee", "rank"].some((w) => kl.includes(w))) t += ".min(0)";
        return t;
      }
      if (v.type === "boolean") return "z.boolean()";
      if (v.type === "object" || v.type === "array" || v.type === "union") return "z.any()";
      if (v.format === "email" || kl.includes("email")) return "z.string().email()";
      if (v.format === "uuid" || kl === "id" || kl.endsWith("_id") || kl.endsWith("id")) return "z.string().uuid()";
      if (v.format === "url" || kl.includes("url") || kl.includes("link") || kl.includes("website")) return "z.string().url()";
      if (v.format === "datetime") return "z.string().datetime()";
      const longText = ["description", "note", "bio", "comment", "content", "body", "text", "message", "summary"].some((w) => kl.includes(w));
      const hasTrim = kl.includes("name") || kl.includes("label") || kl.includes("title");
      if (hasTrim) return v.optional ? "z.string().trim()" : "z.string().min(1).trim()";
      if (!v.optional && !longText) return "z.string().min(1)";
      return "z.string()";
    };
    const sampleBody = JSON.stringify(
      Object.fromEntries(fields.map((k) => {
        const v = f[k];
        if (v.type === "number") return [k, 0];
        if (v.type === "boolean") return [k, false];
        return [k, "sample"];
      })),
      null,
      6
    ).replace(/^/gm, "    ");
    return `import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Generated by TypeMorph \u2014 Next.js App Router API Route
// Route: /api/${entityLower}s

const ${entityName}Schema = z.object({
${fields.map((k) => {
      const v = f[k];
      return `  ${k}: ${fieldToZod(k, v)}${v.optional ? ".optional()" : ""}`;
    }).join(",\n")}
});

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with your database query
    const items: z.infer<typeof ${entityName}Schema>[] = [];
    return NextResponse.json(items);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch ${entityLower}s' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = ${entityName}Schema.parse(body);
    // TODO: Replace with your database insert
    return NextResponse.json(validated, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create ${entityLower}' }, { status: 500 });
  }
}
`;
  }
};
var reactHookGen = {
  generate: (schema2, name = "Root") => {
    const entityName = toPascalCase3(name);
    const entityLower = name.charAt(0).toLowerCase() + name.slice(1);
    const entitySnake = toSnakeCase2(name);
    const f = getFields(schema2);
    const fields = Object.keys(f);
    return `import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Generated by TypeMorph \u2014 React Query Hook
// Requires: @tanstack/react-query

export interface ${entityName} {
${fields.map((k) => {
      const v = f[k];
      const tsType = v.type === "number" ? "number" : v.type === "boolean" ? "boolean" : "string";
      return `  ${k}${v.optional ? "?" : ""}: ${tsType};`;
    }).join("\n")}
}

const API_BASE = '/api/${entitySnake}s';

export const use${entityName}List = () => {
  return useQuery<${entityName}[]>({
    queryKey: ['${entitySnake}s'],
    queryFn: async () => {
      const res = await fetch(API_BASE);
      if (!res.ok) throw new Error('Failed to fetch ${entitySnake}s');
      return res.json();
    },
  });
};

export const use${entityName}Create = () => {
  const queryClient = useQueryClient();
  return useMutation<${entityName}, Error, Omit<${entityName}, 'id'>>({
    mutationFn: async (data) => {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create ${entitySnake}');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${entitySnake}s'] });
    },
  });
};

export const use${entityName}Delete = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: async (id) => {
      const res = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete ${entitySnake}');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['${entitySnake}s'] });
    },
  });
};
`;
  }
};

// ../../src/lib/engine.ts
import { createHash } from "crypto";

// ../../node_modules/fast-xml-parser/src/util.js
var nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
var nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
var nameRegexp = "[" + nameStartChar + "][" + nameChar + "]*";
var regexName = new RegExp("^" + nameRegexp + "$");
function getAllMatches(string, regex) {
  const matches = [];
  let match = regex.exec(string);
  while (match) {
    const allmatches = [];
    allmatches.startIndex = regex.lastIndex - match[0].length;
    const len = match.length;
    for (let index = 0; index < len; index++) {
      allmatches.push(match[index]);
    }
    matches.push(allmatches);
    match = regex.exec(string);
  }
  return matches;
}
var isName = function(string) {
  const match = regexName.exec(string);
  return !(match === null || typeof match === "undefined");
};
function isExist(v) {
  return typeof v !== "undefined";
}
var DANGEROUS_PROPERTY_NAMES = [
  // '__proto__',
  // 'constructor',
  // 'prototype',
  "hasOwnProperty",
  "toString",
  "valueOf",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__"
];
var criticalProperties = ["__proto__", "constructor", "prototype"];

// ../../node_modules/fast-xml-parser/src/validator.js
var defaultOptions = {
  allowBooleanAttributes: false,
  //A tag can have attributes without any value
  unpairedTags: []
};
function validate(xmlData, options) {
  options = Object.assign({}, defaultOptions, options);
  const tags = [];
  let tagFound = false;
  let reachedRoot = false;
  if (xmlData[0] === "\uFEFF") {
    xmlData = xmlData.substr(1);
  }
  for (let i = 0; i < xmlData.length; i++) {
    if (xmlData[i] === "<" && xmlData[i + 1] === "?") {
      i += 2;
      i = readPI(xmlData, i);
      if (i.err) return i;
    } else if (xmlData[i] === "<") {
      let tagStartPos = i;
      i++;
      if (xmlData[i] === "!") {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === "/") {
          closingTag = true;
          i++;
        }
        let tagName = "";
        for (; i < xmlData.length && xmlData[i] !== ">" && xmlData[i] !== " " && xmlData[i] !== "	" && xmlData[i] !== "\n" && xmlData[i] !== "\r"; i++) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();
        if (tagName[tagName.length - 1] === "/") {
          tagName = tagName.substring(0, tagName.length - 1);
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '" + tagName + "' is an invalid name.";
          }
          return getErrorObject("InvalidTag", msg, getLineNumberForPosition(xmlData, i));
        }
        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;
        if (attrStr[attrStr.length - 1] === "/") {
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
          } else {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else if (tags.length === 0) {
            return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject(
                "InvalidTag",
                "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                getLineNumberForPosition(xmlData, tagStartPos)
              );
            }
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }
          if (reachedRoot === true) {
            return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i));
          } else if (options.unpairedTags.indexOf(tagName) !== -1) {
          } else {
            tags.push({ tagName, tagStartPos });
          }
          tagFound = true;
        }
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === "<") {
            if (xmlData[i + 1] === "!") {
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i + 1] === "?") {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === "&") {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          } else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i));
            }
          }
        }
        if (xmlData[i] === "<") {
          i--;
        }
      }
    } else {
      if (isWhiteSpace(xmlData[i])) {
        continue;
      }
      return getErrorObject("InvalidChar", "char '" + xmlData[i] + "' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }
  if (!tagFound) {
    return getErrorObject("InvalidXml", "Start tag expected.", 1);
  } else if (tags.length == 1) {
    return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  } else if (tags.length > 0) {
    return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t) => t.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 });
  }
  return true;
}
function isWhiteSpace(char) {
  return char === " " || char === "	" || char === "\n" || char === "\r";
}
function readPI(xmlData, i) {
  const start = i;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] == "?" || xmlData[i] == " ") {
      const tagname = xmlData.substr(start, i - start);
      if (i > 5 && tagname === "xml") {
        return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == "?" && xmlData[i + 1] == ">") {
        i++;
        break;
      } else {
        continue;
      }
    }
  }
  return i;
}
function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === "-" && xmlData[i + 2] === "-") {
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === "-" && xmlData[i + 1] === "-" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  } else if (xmlData.length > i + 8 && xmlData[i + 1] === "D" && xmlData[i + 2] === "O" && xmlData[i + 3] === "C" && xmlData[i + 4] === "T" && xmlData[i + 5] === "Y" && xmlData[i + 6] === "P" && xmlData[i + 7] === "E") {
    let angleBracketsCount = 1;
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "<") {
        angleBracketsCount++;
      } else if (xmlData[i] === ">") {
        angleBracketsCount--;
        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (xmlData.length > i + 9 && xmlData[i + 1] === "[" && xmlData[i + 2] === "C" && xmlData[i + 3] === "D" && xmlData[i + 4] === "A" && xmlData[i + 5] === "T" && xmlData[i + 6] === "A" && xmlData[i + 7] === "[") {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === "]" && xmlData[i + 1] === "]" && xmlData[i + 2] === ">") {
        i += 2;
        break;
      }
    }
  }
  return i;
}
var doubleQuote = '"';
var singleQuote = "'";
function readAttributeStr(xmlData, i) {
  let attrStr = "";
  let startChar = "";
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === "") {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) {
      } else {
        startChar = "";
      }
    } else if (xmlData[i] === ">") {
      if (startChar === "") {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== "") {
    return false;
  }
  return {
    value: attrStr,
    index: i,
    tagClosed
  };
}
var validAttrStrRegxp = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
function validateAttributeString(attrStr, options) {
  const matches = getAllMatches(attrStr, validAttrStrRegxp);
  const attrNames = {};
  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' has no space in starting.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] !== void 0 && matches[i][4] === void 0) {
      return getErrorObject("InvalidAttr", "Attribute '" + matches[i][2] + "' is without value.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === void 0 && !options.allowBooleanAttributes) {
      return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i][2] + "' is not allowed.", getPositionFromMatch(matches[i]));
    }
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i]));
    }
    if (!Object.prototype.hasOwnProperty.call(attrNames, attrName)) {
      attrNames[attrName] = 1;
    } else {
      return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i]));
    }
  }
  return true;
}
function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === "x") {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ";")
      return i;
    if (!xmlData[i].match(re))
      break;
  }
  return -1;
}
function validateAmpersand(xmlData, i) {
  i++;
  if (xmlData[i] === ";")
    return -1;
  if (xmlData[i] === "#") {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20)
      continue;
    if (xmlData[i] === ";")
      break;
    return -1;
  }
  return i;
}
function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code,
      msg: message,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col
    }
  };
}
function validateAttrName(attrName) {
  return isName(attrName);
}
function validateTagName(tagname) {
  return isName(tagname);
}
function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,
    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
}
function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

// ../../node_modules/@nodable/entities/src/entities.js
var BASIC_LATIN = {
  amp: "&",
  AMP: "&",
  lt: "<",
  LT: "<",
  gt: ">",
  GT: ">",
  quot: '"',
  QUOT: '"',
  apos: "'",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  lsquor: "\u201A",
  rsquor: "\u2019",
  ldquor: "\u201E",
  bdquo: "\u201E",
  comma: ",",
  period: ".",
  colon: ":",
  semi: ";",
  excl: "!",
  quest: "?",
  num: "#",
  dollar: "$",
  percent: "%",
  amp: "&",
  ast: "*",
  commat: "@",
  lowbar: "_",
  verbar: "|",
  vert: "|",
  sol: "/",
  bsol: "\\",
  lbrace: "{",
  rbrace: "}",
  lbrack: "[",
  rbrack: "]",
  lpar: "(",
  rpar: ")",
  nbsp: "\xA0",
  iexcl: "\xA1",
  cent: "\xA2",
  pound: "\xA3",
  curren: "\xA4",
  yen: "\xA5",
  brvbar: "\xA6",
  sect: "\xA7",
  uml: "\xA8",
  copy: "\xA9",
  COPY: "\xA9",
  ordf: "\xAA",
  laquo: "\xAB",
  not: "\xAC",
  shy: "\xAD",
  reg: "\xAE",
  REG: "\xAE",
  macr: "\xAF",
  deg: "\xB0",
  plusmn: "\xB1",
  sup2: "\xB2",
  sup3: "\xB3",
  acute: "\xB4",
  micro: "\xB5",
  para: "\xB6",
  middot: "\xB7",
  cedil: "\xB8",
  sup1: "\xB9",
  ordm: "\xBA",
  raquo: "\xBB",
  frac14: "\xBC",
  frac12: "\xBD",
  half: "\xBD",
  frac34: "\xBE",
  iquest: "\xBF",
  times: "\xD7",
  div: "\xF7",
  divide: "\xF7"
};
var LATIN_ACCENTS = {
  Agrave: "\xC0",
  agrave: "\xE0",
  Aacute: "\xC1",
  aacute: "\xE1",
  Acirc: "\xC2",
  acirc: "\xE2",
  Atilde: "\xC3",
  atilde: "\xE3",
  Auml: "\xC4",
  auml: "\xE4",
  Aring: "\xC5",
  aring: "\xE5",
  AElig: "\xC6",
  aelig: "\xE6",
  Ccedil: "\xC7",
  ccedil: "\xE7",
  Egrave: "\xC8",
  egrave: "\xE8",
  Eacute: "\xC9",
  eacute: "\xE9",
  Ecirc: "\xCA",
  ecirc: "\xEA",
  Euml: "\xCB",
  euml: "\xEB",
  Igrave: "\xCC",
  igrave: "\xEC",
  Iacute: "\xCD",
  iacute: "\xED",
  Icirc: "\xCE",
  icirc: "\xEE",
  Iuml: "\xCF",
  iuml: "\xEF",
  ETH: "\xD0",
  eth: "\xF0",
  Ntilde: "\xD1",
  ntilde: "\xF1",
  Ograve: "\xD2",
  ograve: "\xF2",
  Oacute: "\xD3",
  oacute: "\xF3",
  Ocirc: "\xD4",
  ocirc: "\xF4",
  Otilde: "\xD5",
  otilde: "\xF5",
  Ouml: "\xD6",
  ouml: "\xF6",
  Oslash: "\xD8",
  oslash: "\xF8",
  Ugrave: "\xD9",
  ugrave: "\xF9",
  Uacute: "\xDA",
  uacute: "\xFA",
  Ucirc: "\xDB",
  ucirc: "\xFB",
  Uuml: "\xDC",
  uuml: "\xFC",
  Yacute: "\xDD",
  yacute: "\xFD",
  THORN: "\xDE",
  thorn: "\xFE",
  szlig: "\xDF",
  yuml: "\xFF",
  Yuml: "\u0178"
};
var LATIN_EXTENDED = {
  Amacr: "\u0100",
  amacr: "\u0101",
  Abreve: "\u0102",
  abreve: "\u0103",
  Aogon: "\u0104",
  aogon: "\u0105",
  Cacute: "\u0106",
  cacute: "\u0107",
  Ccirc: "\u0108",
  ccirc: "\u0109",
  Cdot: "\u010A",
  cdot: "\u010B",
  Ccaron: "\u010C",
  ccaron: "\u010D",
  Dcaron: "\u010E",
  dcaron: "\u010F",
  Dstrok: "\u0110",
  dstrok: "\u0111",
  Emacr: "\u0112",
  emacr: "\u0113",
  Ecaron: "\u011A",
  ecaron: "\u011B",
  Edot: "\u0116",
  edot: "\u0117",
  Eogon: "\u0118",
  eogon: "\u0119",
  Gcirc: "\u011C",
  gcirc: "\u011D",
  Gbreve: "\u011E",
  gbreve: "\u011F",
  Gdot: "\u0120",
  gdot: "\u0121",
  Gcedil: "\u0122",
  Hcirc: "\u0124",
  hcirc: "\u0125",
  Hstrok: "\u0126",
  hstrok: "\u0127",
  Itilde: "\u0128",
  itilde: "\u0129",
  Imacr: "\u012A",
  imacr: "\u012B",
  Iogon: "\u012E",
  iogon: "\u012F",
  Idot: "\u0130",
  IJlig: "\u0132",
  ijlig: "\u0133",
  Jcirc: "\u0134",
  jcirc: "\u0135",
  Kcedil: "\u0136",
  kcedil: "\u0137",
  kgreen: "\u0138",
  Lacute: "\u0139",
  lacute: "\u013A",
  Lcedil: "\u013B",
  lcedil: "\u013C",
  Lcaron: "\u013D",
  lcaron: "\u013E",
  Lmidot: "\u013F",
  lmidot: "\u0140",
  Lstrok: "\u0141",
  lstrok: "\u0142",
  Nacute: "\u0143",
  nacute: "\u0144",
  Ncaron: "\u0147",
  ncaron: "\u0148",
  Ncedil: "\u0145",
  ncedil: "\u0146",
  ENG: "\u014A",
  eng: "\u014B",
  Omacr: "\u014C",
  omacr: "\u014D",
  Odblac: "\u0150",
  odblac: "\u0151",
  OElig: "\u0152",
  oelig: "\u0153",
  Racute: "\u0154",
  racute: "\u0155",
  Rcaron: "\u0158",
  rcaron: "\u0159",
  Rcedil: "\u0156",
  rcedil: "\u0157",
  Sacute: "\u015A",
  sacute: "\u015B",
  Scirc: "\u015C",
  scirc: "\u015D",
  Scedil: "\u015E",
  scedil: "\u015F",
  Scaron: "\u0160",
  scaron: "\u0161",
  Tcedil: "\u0162",
  tcedil: "\u0163",
  Tcaron: "\u0164",
  tcaron: "\u0165",
  Tstrok: "\u0166",
  tstrok: "\u0167",
  Utilde: "\u0168",
  utilde: "\u0169",
  Umacr: "\u016A",
  umacr: "\u016B",
  Ubreve: "\u016C",
  ubreve: "\u016D",
  Uring: "\u016E",
  uring: "\u016F",
  Udblac: "\u0170",
  udblac: "\u0171",
  Uogon: "\u0172",
  uogon: "\u0173",
  Wcirc: "\u0174",
  wcirc: "\u0175",
  Ycirc: "\u0176",
  ycirc: "\u0177",
  Zacute: "\u0179",
  zacute: "\u017A",
  Zdot: "\u017B",
  zdot: "\u017C",
  Zcaron: "\u017D",
  zcaron: "\u017E"
};
var GREEK = {
  Alpha: "\u0391",
  alpha: "\u03B1",
  Beta: "\u0392",
  beta: "\u03B2",
  Gamma: "\u0393",
  gamma: "\u03B3",
  Delta: "\u0394",
  delta: "\u03B4",
  Epsilon: "\u0395",
  epsilon: "\u03B5",
  epsiv: "\u03F5",
  varepsilon: "\u03F5",
  Zeta: "\u0396",
  zeta: "\u03B6",
  Eta: "\u0397",
  eta: "\u03B7",
  Theta: "\u0398",
  theta: "\u03B8",
  thetasym: "\u03D1",
  vartheta: "\u03D1",
  Iota: "\u0399",
  iota: "\u03B9",
  Kappa: "\u039A",
  kappa: "\u03BA",
  kappav: "\u03F0",
  varkappa: "\u03F0",
  Lambda: "\u039B",
  lambda: "\u03BB",
  Mu: "\u039C",
  mu: "\u03BC",
  Nu: "\u039D",
  nu: "\u03BD",
  Xi: "\u039E",
  xi: "\u03BE",
  Omicron: "\u039F",
  omicron: "\u03BF",
  Pi: "\u03A0",
  pi: "\u03C0",
  piv: "\u03D6",
  varpi: "\u03D6",
  Rho: "\u03A1",
  rho: "\u03C1",
  rhov: "\u03F1",
  varrho: "\u03F1",
  Sigma: "\u03A3",
  sigma: "\u03C3",
  sigmaf: "\u03C2",
  sigmav: "\u03C2",
  varsigma: "\u03C2",
  Tau: "\u03A4",
  tau: "\u03C4",
  Upsilon: "\u03A5",
  upsilon: "\u03C5",
  upsi: "\u03C5",
  Upsi: "\u03D2",
  upsih: "\u03D2",
  Phi: "\u03A6",
  phi: "\u03C6",
  phiv: "\u03D5",
  varphi: "\u03D5",
  Chi: "\u03A7",
  chi: "\u03C7",
  Psi: "\u03A8",
  psi: "\u03C8",
  Omega: "\u03A9",
  omega: "\u03C9",
  ohm: "\u03A9",
  Gammad: "\u03DC",
  gammad: "\u03DD",
  digamma: "\u03DD"
};
var CYRILLIC = {
  Afr: "\u{1D504}",
  afr: "\u{1D51E}",
  Acy: "\u0410",
  acy: "\u0430",
  Bcy: "\u0411",
  bcy: "\u0431",
  Vcy: "\u0412",
  vcy: "\u0432",
  Gcy: "\u0413",
  gcy: "\u0433",
  Dcy: "\u0414",
  dcy: "\u0434",
  IEcy: "\u0415",
  iecy: "\u0435",
  IOcy: "\u0401",
  iocy: "\u0451",
  ZHcy: "\u0416",
  zhcy: "\u0436",
  Zcy: "\u0417",
  zcy: "\u0437",
  Icy: "\u0418",
  icy: "\u0438",
  Jcy: "\u0419",
  jcy: "\u0439",
  Kcy: "\u041A",
  kcy: "\u043A",
  Lcy: "\u041B",
  lcy: "\u043B",
  Mcy: "\u041C",
  mcy: "\u043C",
  Ncy: "\u041D",
  ncy: "\u043D",
  Ocy: "\u041E",
  ocy: "\u043E",
  Pcy: "\u041F",
  pcy: "\u043F",
  Rcy: "\u0420",
  rcy: "\u0440",
  Scy: "\u0421",
  scy: "\u0441",
  Tcy: "\u0422",
  tcy: "\u0442",
  Ucy: "\u0423",
  ucy: "\u0443",
  Fcy: "\u0424",
  fcy: "\u0444",
  KHcy: "\u0425",
  khcy: "\u0445",
  TScy: "\u0426",
  tscy: "\u0446",
  CHcy: "\u0427",
  chcy: "\u0447",
  SHcy: "\u0428",
  shcy: "\u0448",
  SHCHcy: "\u0429",
  shchcy: "\u0449",
  HARDcy: "\u042A",
  hardcy: "\u044A",
  Ycy: "\u042B",
  ycy: "\u044B",
  SOFTcy: "\u042C",
  softcy: "\u044C",
  Ecy: "\u042D",
  ecy: "\u044D",
  YUcy: "\u042E",
  yucy: "\u044E",
  YAcy: "\u042F",
  yacy: "\u044F",
  DJcy: "\u0402",
  djcy: "\u0452",
  GJcy: "\u0403",
  gjcy: "\u0453",
  Jukcy: "\u0404",
  jukcy: "\u0454",
  DScy: "\u0405",
  dscy: "\u0455",
  Iukcy: "\u0406",
  iukcy: "\u0456",
  YIcy: "\u0407",
  yicy: "\u0457",
  Jsercy: "\u0408",
  jsercy: "\u0458",
  LJcy: "\u0409",
  ljcy: "\u0459",
  NJcy: "\u040A",
  njcy: "\u045A",
  TSHcy: "\u040B",
  tshcy: "\u045B",
  KJcy: "\u040C",
  kjcy: "\u045C",
  Ubrcy: "\u040E",
  ubrcy: "\u045E",
  DZcy: "\u040F",
  dzcy: "\u045F"
};
var MATH = {
  plus: "+",
  minus: "\u2212",
  mnplus: "\u2213",
  mp: "\u2213",
  pm: "\xB1",
  times: "\xD7",
  div: "\xF7",
  divide: "\xF7",
  sdot: "\u22C5",
  star: "\u2606",
  starf: "\u2605",
  bigstar: "\u2605",
  lowast: "\u2217",
  ast: "*",
  midast: "*",
  compfn: "\u2218",
  smallcircle: "\u2218",
  bullet: "\u2022",
  bull: "\u2022",
  nbsp: "\xA0",
  hellip: "\u2026",
  mldr: "\u2026",
  prime: "\u2032",
  Prime: "\u2033",
  tprime: "\u2034",
  bprime: "\u2035",
  backprime: "\u2035",
  minus: "\u2212",
  minusd: "\u2238",
  dotminus: "\u2238",
  plusdo: "\u2214",
  dotplus: "\u2214",
  plusmn: "\xB1",
  minusplus: "\u2213",
  mnplus: "\u2213",
  mp: "\u2213",
  setminus: "\u2216",
  smallsetminus: "\u2216",
  Backslash: "\u2216",
  setmn: "\u2216",
  ssetmn: "\u2216",
  lowbar: "_",
  verbar: "|",
  vert: "|",
  VerticalLine: "|",
  colon: ":",
  Colon: "\u2237",
  Proportion: "\u2237",
  ratio: "\u2236",
  equals: "=",
  ne: "\u2260",
  nequiv: "\u2262",
  equiv: "\u2261",
  Congruent: "\u2261",
  sim: "\u223C",
  thicksim: "\u223C",
  thksim: "\u223C",
  sime: "\u2243",
  simeq: "\u2243",
  TildeEqual: "\u2243",
  asymp: "\u2248",
  approx: "\u2248",
  thickapprox: "\u2248",
  thkap: "\u2248",
  TildeTilde: "\u2248",
  ncong: "\u2247",
  cong: "\u2245",
  TildeFullEqual: "\u2245",
  asympeq: "\u224D",
  CupCap: "\u224D",
  bump: "\u224E",
  Bumpeq: "\u224E",
  HumpDownHump: "\u224E",
  bumpe: "\u224F",
  bumpeq: "\u224F",
  HumpEqual: "\u224F",
  dotminus: "\u2238",
  minusd: "\u2238",
  plusdo: "\u2214",
  dotplus: "\u2214",
  le: "\u2264",
  LessEqual: "\u2264",
  ge: "\u2265",
  GreaterEqual: "\u2265",
  lesseqgtr: "\u22DA",
  lesseqqgtr: "\u2A8B",
  greater: ">",
  less: "<"
};
var MATH_ADVANCED = {
  alefsym: "\u2135",
  aleph: "\u2135",
  beth: "\u2136",
  gimel: "\u2137",
  daleth: "\u2138",
  forall: "\u2200",
  ForAll: "\u2200",
  part: "\u2202",
  PartialD: "\u2202",
  exist: "\u2203",
  Exists: "\u2203",
  nexist: "\u2204",
  nexists: "\u2204",
  empty: "\u2205",
  emptyset: "\u2205",
  emptyv: "\u2205",
  varnothing: "\u2205",
  nabla: "\u2207",
  Del: "\u2207",
  isin: "\u2208",
  isinv: "\u2208",
  in: "\u2208",
  Element: "\u2208",
  notin: "\u2209",
  notinva: "\u2209",
  ni: "\u220B",
  niv: "\u220B",
  SuchThat: "\u220B",
  ReverseElement: "\u220B",
  notni: "\u220C",
  notniva: "\u220C",
  prod: "\u220F",
  Product: "\u220F",
  coprod: "\u2210",
  Coproduct: "\u2210",
  sum: "\u2211",
  Sum: "\u2211",
  minus: "\u2212",
  mp: "\u2213",
  plusdo: "\u2214",
  dotplus: "\u2214",
  setminus: "\u2216",
  lowast: "\u2217",
  radic: "\u221A",
  Sqrt: "\u221A",
  prop: "\u221D",
  propto: "\u221D",
  Proportional: "\u221D",
  varpropto: "\u221D",
  infin: "\u221E",
  infintie: "\u29DD",
  ang: "\u2220",
  angle: "\u2220",
  angmsd: "\u2221",
  measuredangle: "\u2221",
  angsph: "\u2222",
  mid: "\u2223",
  VerticalBar: "\u2223",
  nmid: "\u2224",
  nsmid: "\u2224",
  npar: "\u2226",
  parallel: "\u2225",
  spar: "\u2225",
  nparallel: "\u2226",
  nspar: "\u2226",
  and: "\u2227",
  wedge: "\u2227",
  or: "\u2228",
  vee: "\u2228",
  cap: "\u2229",
  cup: "\u222A",
  int: "\u222B",
  Integral: "\u222B",
  conint: "\u222E",
  ContourIntegral: "\u222E",
  Conint: "\u222F",
  DoubleContourIntegral: "\u222F",
  Cconint: "\u2230",
  there4: "\u2234",
  therefore: "\u2234",
  Therefore: "\u2234",
  becaus: "\u2235",
  because: "\u2235",
  Because: "\u2235",
  ratio: "\u2236",
  Proportion: "\u2237",
  minusd: "\u2238",
  dotminus: "\u2238",
  mDDot: "\u223A",
  homtht: "\u223B",
  sim: "\u223C",
  bsimg: "\u223D",
  backsim: "\u223D",
  ac: "\u223E",
  mstpos: "\u223E",
  acd: "\u223F",
  VerticalTilde: "\u2240",
  wr: "\u2240",
  wreath: "\u2240",
  nsime: "\u2244",
  nsimeq: "\u2244",
  nsimeq: "\u2244",
  ncong: "\u2247",
  simne: "\u2246",
  ncongdot: "\u2A6D\u0338",
  ngsim: "\u2275",
  nsim: "\u2241",
  napprox: "\u2249",
  nap: "\u2249",
  ngeq: "\u2271",
  nge: "\u2271",
  nleq: "\u2270",
  nle: "\u2270",
  ngtr: "\u226F",
  ngt: "\u226F",
  nless: "\u226E",
  nlt: "\u226E",
  nprec: "\u2280",
  npr: "\u2280",
  nsucc: "\u2281",
  nsc: "\u2281"
};
var ARROWS = {
  larr: "\u2190",
  leftarrow: "\u2190",
  LeftArrow: "\u2190",
  uarr: "\u2191",
  uparrow: "\u2191",
  UpArrow: "\u2191",
  rarr: "\u2192",
  rightarrow: "\u2192",
  RightArrow: "\u2192",
  darr: "\u2193",
  downarrow: "\u2193",
  DownArrow: "\u2193",
  harr: "\u2194",
  leftrightarrow: "\u2194",
  LeftRightArrow: "\u2194",
  varr: "\u2195",
  updownarrow: "\u2195",
  UpDownArrow: "\u2195",
  nwarr: "\u2196",
  nwarrow: "\u2196",
  UpperLeftArrow: "\u2196",
  nearr: "\u2197",
  nearrow: "\u2197",
  UpperRightArrow: "\u2197",
  searr: "\u2198",
  searrow: "\u2198",
  LowerRightArrow: "\u2198",
  swarr: "\u2199",
  swarrow: "\u2199",
  LowerLeftArrow: "\u2199",
  lArr: "\u21D0",
  Leftarrow: "\u21D0",
  uArr: "\u21D1",
  Uparrow: "\u21D1",
  rArr: "\u21D2",
  Rightarrow: "\u21D2",
  dArr: "\u21D3",
  Downarrow: "\u21D3",
  hArr: "\u21D4",
  Leftrightarrow: "\u21D4",
  iff: "\u21D4",
  vArr: "\u21D5",
  Updownarrow: "\u21D5",
  lAarr: "\u21DA",
  Lleftarrow: "\u21DA",
  rAarr: "\u21DB",
  Rrightarrow: "\u21DB",
  lrarr: "\u21C6",
  leftrightarrows: "\u21C6",
  rlarr: "\u21C4",
  rightleftarrows: "\u21C4",
  lrhar: "\u21CB",
  leftrightharpoons: "\u21CB",
  ReverseEquilibrium: "\u21CB",
  rlhar: "\u21CC",
  rightleftharpoons: "\u21CC",
  Equilibrium: "\u21CC",
  udarr: "\u21C5",
  UpArrowDownArrow: "\u21C5",
  duarr: "\u21F5",
  DownArrowUpArrow: "\u21F5",
  llarr: "\u21C7",
  leftleftarrows: "\u21C7",
  rrarr: "\u21C9",
  rightrightarrows: "\u21C9",
  ddarr: "\u21CA",
  downdownarrows: "\u21CA",
  har: "\u21BD",
  lhard: "\u21BD",
  leftharpoondown: "\u21BD",
  lharu: "\u21BC",
  leftharpoonup: "\u21BC",
  rhard: "\u21C1",
  rightharpoondown: "\u21C1",
  rharu: "\u21C0",
  rightharpoonup: "\u21C0",
  lsh: "\u21B0",
  Lsh: "\u21B0",
  rsh: "\u21B1",
  Rsh: "\u21B1",
  ldsh: "\u21B2",
  rdsh: "\u21B3",
  hookleftarrow: "\u21A9",
  hookrightarrow: "\u21AA",
  mapstoleft: "\u21A4",
  mapstoup: "\u21A5",
  map: "\u21A6",
  mapsto: "\u21A6",
  mapstodown: "\u21A7",
  crarr: "\u21B5",
  nwarrow: "\u2196",
  nearrow: "\u2197",
  searrow: "\u2198",
  swarrow: "\u2199",
  nleftarrow: "\u219A",
  nleftrightarrow: "\u21AE",
  nrightarrow: "\u219B",
  nrarr: "\u219B",
  larrtl: "\u21A2",
  rarrtl: "\u21A3",
  leftarrowtail: "\u21A2",
  rightarrowtail: "\u21A3",
  twoheadleftarrow: "\u219E",
  twoheadrightarrow: "\u21A0",
  Larr: "\u219E",
  Rarr: "\u21A0",
  larrhk: "\u21A9",
  rarrhk: "\u21AA",
  larrlp: "\u21AB",
  looparrowleft: "\u21AB",
  rarrlp: "\u21AC",
  looparrowright: "\u21AC",
  harrw: "\u21AD",
  leftrightsquigarrow: "\u21AD",
  nrarrw: "\u219D\u0338",
  rarrw: "\u219D",
  rightsquigarrow: "\u219D",
  larrbfs: "\u291F",
  rarrbfs: "\u2920",
  nvHarr: "\u2904",
  nvlArr: "\u2902",
  nvrArr: "\u2903",
  larrfs: "\u291D",
  rarrfs: "\u291E",
  Map: "\u2905",
  larrsim: "\u2973",
  rarrsim: "\u2974",
  harrcir: "\u2948",
  Uarrocir: "\u2949",
  lurdshar: "\u294A",
  ldrdhar: "\u2967",
  ldrushar: "\u294B",
  rdldhar: "\u2969",
  lrhard: "\u296D",
  rlhar: "\u21CC",
  uharr: "\u21BE",
  uharl: "\u21BF",
  dharr: "\u21C2",
  dharl: "\u21C3",
  Uarr: "\u219F",
  Darr: "\u21A1",
  zigrarr: "\u21DD",
  nwArr: "\u21D6",
  neArr: "\u21D7",
  seArr: "\u21D8",
  swArr: "\u21D9",
  nharr: "\u21AE",
  nhArr: "\u21CE",
  nlarr: "\u219A",
  nlArr: "\u21CD",
  nrarr: "\u219B",
  nrArr: "\u21CF",
  larrb: "\u21E4",
  LeftArrowBar: "\u21E4",
  rarrb: "\u21E5",
  RightArrowBar: "\u21E5"
};
var SHAPES = {
  square: "\u25A1",
  Square: "\u25A1",
  squ: "\u25A1",
  squf: "\u25AA",
  squarf: "\u25AA",
  blacksquar: "\u25AA",
  blacksquare: "\u25AA",
  FilledVerySmallSquare: "\u25AA",
  blk34: "\u2593",
  blk12: "\u2592",
  blk14: "\u2591",
  block: "\u2588",
  srect: "\u25AD",
  rect: "\u25AD",
  sdot: "\u22C5",
  sdotb: "\u22A1",
  dotsquare: "\u22A1",
  triangle: "\u25B5",
  tri: "\u25B5",
  trine: "\u25B5",
  utri: "\u25B5",
  triangledown: "\u25BF",
  dtri: "\u25BF",
  tridown: "\u25BF",
  triangleleft: "\u25C3",
  ltri: "\u25C3",
  triangleright: "\u25B9",
  rtri: "\u25B9",
  blacktriangle: "\u25B4",
  utrif: "\u25B4",
  blacktriangledown: "\u25BE",
  dtrif: "\u25BE",
  blacktriangleleft: "\u25C2",
  ltrif: "\u25C2",
  blacktriangleright: "\u25B8",
  rtrif: "\u25B8",
  loz: "\u25CA",
  lozenge: "\u25CA",
  blacklozenge: "\u29EB",
  lozf: "\u29EB",
  bigcirc: "\u25EF",
  xcirc: "\u25EF",
  circ: "\u02C6",
  Circle: "\u25CB",
  cir: "\u25CB",
  o: "\u25CB",
  bullet: "\u2022",
  bull: "\u2022",
  hellip: "\u2026",
  mldr: "\u2026",
  nldr: "\u2025",
  boxh: "\u2500",
  HorizontalLine: "\u2500",
  boxv: "\u2502",
  boxdr: "\u250C",
  boxdl: "\u2510",
  boxur: "\u2514",
  boxul: "\u2518",
  boxvr: "\u251C",
  boxvl: "\u2524",
  boxhd: "\u252C",
  boxhu: "\u2534",
  boxvh: "\u253C",
  boxH: "\u2550",
  boxV: "\u2551",
  boxdR: "\u2552",
  boxDr: "\u2553",
  boxDR: "\u2554",
  boxDl: "\u2555",
  boxdL: "\u2556",
  boxDL: "\u2557",
  boxuR: "\u2558",
  boxUr: "\u2559",
  boxUR: "\u255A",
  boxUl: "\u255C",
  boxuL: "\u255B",
  boxUL: "\u255D",
  boxvR: "\u255E",
  boxVr: "\u255F",
  boxVR: "\u2560",
  boxVl: "\u2562",
  boxvL: "\u2561",
  boxVL: "\u2563",
  boxHd: "\u2564",
  boxhD: "\u2565",
  boxHD: "\u2566",
  boxHu: "\u2567",
  boxhU: "\u2568",
  boxHU: "\u2569",
  boxvH: "\u256A",
  boxVh: "\u256B",
  boxVH: "\u256C"
};
var PUNCTUATION = {
  excl: "!",
  iexcl: "\xA1",
  brvbar: "\xA6",
  sect: "\xA7",
  uml: "\xA8",
  copy: "\xA9",
  ordf: "\xAA",
  laquo: "\xAB",
  not: "\xAC",
  shy: "\xAD",
  reg: "\xAE",
  macr: "\xAF",
  deg: "\xB0",
  plusmn: "\xB1",
  sup2: "\xB2",
  sup3: "\xB3",
  acute: "\xB4",
  micro: "\xB5",
  para: "\xB6",
  middot: "\xB7",
  cedil: "\xB8",
  sup1: "\xB9",
  ordm: "\xBA",
  raquo: "\xBB",
  frac14: "\xBC",
  frac12: "\xBD",
  frac34: "\xBE",
  iquest: "\xBF",
  nbsp: "\xA0",
  comma: ",",
  period: ".",
  colon: ":",
  semi: ";",
  vert: "|",
  Verbar: "\u2016",
  verbar: "|",
  dblac: "\u02DD",
  circ: "\u02C6",
  caron: "\u02C7",
  breve: "\u02D8",
  dot: "\u02D9",
  ring: "\u02DA",
  ogon: "\u02DB",
  tilde: "\u02DC",
  DiacriticalGrave: "`",
  DiacriticalAcute: "\xB4",
  DiacriticalTilde: "\u02DC",
  DiacriticalDot: "\u02D9",
  DiacriticalDoubleAcute: "\u02DD",
  grave: "`",
  acute: "\xB4"
};
var CURRENCY = {
  cent: "\xA2",
  pound: "\xA3",
  curren: "\xA4",
  yen: "\xA5",
  euro: "\u20AC",
  dollar: "$",
  euro: "\u20AC",
  fnof: "\u0192",
  inr: "\u20B9",
  af: "\u060B",
  birr: "\u1265\u122D",
  peso: "\u20B1",
  rub: "\u20BD",
  won: "\u20A9",
  yuan: "\xA5",
  cedil: "\xB8"
};
var FRACTIONS = {
  frac12: "\xBD",
  half: "\xBD",
  frac13: "\u2153",
  frac14: "\xBC",
  frac15: "\u2155",
  frac16: "\u2159",
  frac18: "\u215B",
  frac23: "\u2154",
  frac25: "\u2156",
  frac34: "\xBE",
  frac35: "\u2157",
  frac38: "\u215C",
  frac45: "\u2158",
  frac56: "\u215A",
  frac58: "\u215D",
  frac78: "\u215E",
  frasl: "\u2044"
};
var MISC_SYMBOLS = {
  trade: "\u2122",
  TRADE: "\u2122",
  telrec: "\u2315",
  target: "\u2316",
  ulcorn: "\u231C",
  ulcorner: "\u231C",
  urcorn: "\u231D",
  urcorner: "\u231D",
  dlcorn: "\u231E",
  llcorner: "\u231E",
  drcorn: "\u231F",
  lrcorner: "\u231F",
  intercal: "\u22BA",
  intcal: "\u22BA",
  oplus: "\u2295",
  CirclePlus: "\u2295",
  ominus: "\u2296",
  CircleMinus: "\u2296",
  otimes: "\u2297",
  CircleTimes: "\u2297",
  osol: "\u2298",
  odot: "\u2299",
  CircleDot: "\u2299",
  oast: "\u229B",
  circledast: "\u229B",
  odash: "\u229D",
  circleddash: "\u229D",
  ocirc: "\u229A",
  circledcirc: "\u229A",
  boxplus: "\u229E",
  plusb: "\u229E",
  boxminus: "\u229F",
  minusb: "\u229F",
  boxtimes: "\u22A0",
  timesb: "\u22A0",
  boxdot: "\u22A1",
  sdotb: "\u22A1",
  veebar: "\u22BB",
  vee: "\u2228",
  barvee: "\u22BD",
  and: "\u2227",
  wedge: "\u2227",
  Cap: "\u22D2",
  Cup: "\u22D3",
  Fork: "\u22D4",
  pitchfork: "\u22D4",
  epar: "\u22D5",
  ltlarr: "\u2976",
  nvap: "\u224D\u20D2",
  nvsim: "\u223C\u20D2",
  nvge: "\u2265\u20D2",
  nvle: "\u2264\u20D2",
  nvlt: "<\u20D2",
  nvgt: ">\u20D2",
  nvltrie: "\u22B4\u20D2",
  nvrtrie: "\u22B5\u20D2",
  Vdash: "\u22A9",
  dashv: "\u22A3",
  vDash: "\u22A8",
  Vdash: "\u22A9",
  Vvdash: "\u22AA",
  nvdash: "\u22AC",
  nvDash: "\u22AD",
  nVdash: "\u22AE",
  nVDash: "\u22AF"
};
var ALL_ENTITIES = {
  ...BASIC_LATIN,
  ...LATIN_ACCENTS,
  ...LATIN_EXTENDED,
  ...GREEK,
  ...CYRILLIC,
  ...MATH,
  ...MATH_ADVANCED,
  ...ARROWS,
  ...SHAPES,
  ...PUNCTUATION,
  ...CURRENCY,
  ...FRACTIONS,
  ...MISC_SYMBOLS
};
var XML = {
  amp: "&",
  apos: "'",
  gt: ">",
  lt: "<",
  quot: '"'
};
var COMMON_HTML = {
  nbsp: "\xA0",
  copy: "\xA9",
  reg: "\xAE",
  trade: "\u2122",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  laquo: "\xAB",
  raquo: "\xBB",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201C",
  rdquo: "\u201D",
  bull: "\u2022",
  para: "\xB6",
  sect: "\xA7",
  deg: "\xB0",
  frac12: "\xBD",
  frac14: "\xBC",
  frac34: "\xBE"
};

// ../../node_modules/@nodable/entities/src/EntityDecoder.js
var SPECIAL_CHARS = new Set("!?\\\\/[]$%{}^&*()<>|+");
function validateEntityName(name) {
  if (name[0] === "#") {
    throw new Error(`[EntityReplacer] Invalid character '#' in entity name: "${name}"`);
  }
  for (const ch of name) {
    if (SPECIAL_CHARS.has(ch)) {
      throw new Error(`[EntityReplacer] Invalid character '${ch}' in entity name: "${name}"`);
    }
  }
  return name;
}
function mergeEntityMaps(...maps) {
  const out = /* @__PURE__ */ Object.create(null);
  for (const map2 of maps) {
    if (!map2) continue;
    for (const key of Object.keys(map2)) {
      const raw = map2[key];
      if (typeof raw === "string") {
        out[key] = raw;
      } else if (raw && typeof raw === "object" && raw.val !== void 0) {
        const val = raw.val;
        if (typeof val === "string") {
          out[key] = val;
        }
      }
    }
  }
  return out;
}
var LIMIT_TIER_EXTERNAL = "external";
var LIMIT_TIER_BASE = "base";
var LIMIT_TIER_ALL = "all";
function parseLimitTiers(raw) {
  if (!raw || raw === LIMIT_TIER_EXTERNAL) return /* @__PURE__ */ new Set([LIMIT_TIER_EXTERNAL]);
  if (raw === LIMIT_TIER_ALL) return /* @__PURE__ */ new Set([LIMIT_TIER_ALL]);
  if (raw === LIMIT_TIER_BASE) return /* @__PURE__ */ new Set([LIMIT_TIER_BASE]);
  if (Array.isArray(raw)) return new Set(raw);
  return /* @__PURE__ */ new Set([LIMIT_TIER_EXTERNAL]);
}
var NCR_LEVEL = Object.freeze({ allow: 0, leave: 1, remove: 2, throw: 3 });
var XML10_ALLOWED_C0 = /* @__PURE__ */ new Set([9, 10, 13]);
function parseNCRConfig(ncr) {
  if (!ncr) {
    return { xmlVersion: 1, onLevel: NCR_LEVEL.allow, nullLevel: NCR_LEVEL.remove };
  }
  const xmlVersion = ncr.xmlVersion === 1.1 ? 1.1 : 1;
  const onLevel = NCR_LEVEL[ncr.onNCR] ?? NCR_LEVEL.allow;
  const nullLevel = NCR_LEVEL[ncr.nullNCR] ?? NCR_LEVEL.remove;
  const clampedNull = Math.max(nullLevel, NCR_LEVEL.remove);
  return { xmlVersion, onLevel, nullLevel: clampedNull };
}
var EntityDecoder = class {
  /**
   * @param {object} [options]
   * @param {object|null}  [options.namedEntities]        — extra named entities merged into base map
   * @param {object}  [options.limit]                 — security limits
   * @param {number}       [options.limit.maxTotalExpansions=0]  — 0 = unlimited
   * @param {number}       [options.limit.maxExpandedLength=0]   — 0 = unlimited
   * @param {'external'|'base'|'all'|string[]} [options.limit.applyLimitsTo='external']
   *   Which entity tiers count against the security limits:
   *   - 'external' (default) — only input/runtime + persistent external entities
   *   - 'base'               — only DEFAULT_XML_ENTITIES + namedEntities
   *   - 'all'                — every entity regardless of tier
   *   - string[]             — explicit combination, e.g. ['external', 'base']
   * @param {((resolved: string, original: string) => string)|null} [options.postCheck=null]
   * @param {string[]} [options.remove=[]] — entity names (e.g. ['nbsp', '#13']) to delete (replace with empty string)
   * @param {string[]} [options.leave=[]]  — entity names to keep as literal (unchanged in output)
   * @param {object}   [options.ncr]       — Numeric Character Reference controls
   * @param {1.0|1.1}  [options.ncr.xmlVersion=1.0]
   *   XML version governing which codepoint ranges are restricted:
   *   - 1.0 — C0 controls U+0001–U+001F (except U+0009/000A/000D) are prohibited
   *   - 1.1 — C0 controls are allowed when written as NCRs; C1 (U+007F–U+009F) decoded as-is
   * @param {'allow'|'leave'|'remove'|'throw'} [options.ncr.onNCR='allow']
   *   Base action for numeric references. Severity order: allow < leave < remove < throw.
   *   For codepoint ranges that carry a minimum level (surrogates → remove, XML 1.0 C0 → remove),
   *   the effective action is max(onNCR, rangeMinimum).
   * @param {'remove'|'throw'} [options.ncr.nullNCR='remove']
   *   Action for U+0000 (null). 'allow' and 'leave' are clamped to 'remove' since null is never safe.
   */
  constructor(options = {}) {
    this._limit = options.limit || {};
    this._maxTotalExpansions = this._limit.maxTotalExpansions || 0;
    this._maxExpandedLength = this._limit.maxExpandedLength || 0;
    this._postCheck = typeof options.postCheck === "function" ? options.postCheck : (r) => r;
    this._limitTiers = parseLimitTiers(this._limit.applyLimitsTo ?? LIMIT_TIER_EXTERNAL);
    this._numericAllowed = options.numericAllowed ?? true;
    this._baseMap = mergeEntityMaps(XML, options.namedEntities || null);
    this._externalMap = /* @__PURE__ */ Object.create(null);
    this._inputMap = /* @__PURE__ */ Object.create(null);
    this._totalExpansions = 0;
    this._expandedLength = 0;
    this._removeSet = new Set(options.remove && Array.isArray(options.remove) ? options.remove : []);
    this._leaveSet = new Set(options.leave && Array.isArray(options.leave) ? options.leave : []);
    const ncrCfg = parseNCRConfig(options.ncr);
    this._ncrXmlVersion = ncrCfg.xmlVersion;
    this._ncrOnLevel = ncrCfg.onLevel;
    this._ncrNullLevel = ncrCfg.nullLevel;
  }
  // -------------------------------------------------------------------------
  // Persistent external entity registration
  // -------------------------------------------------------------------------
  /**
   * Replace the full set of persistent external entities.
   * All keys are validated — throws on invalid characters.
   * @param {Record<string, string | { regex?: RegExp, val: string }>} map
   */
  setExternalEntities(map2) {
    if (map2) {
      for (const key of Object.keys(map2)) {
        validateEntityName(key);
      }
    }
    this._externalMap = mergeEntityMaps(map2);
  }
  /**
   * Add a single persistent external entity.
   * @param {string} key
   * @param {string} value
   */
  addExternalEntity(key, value) {
    validateEntityName(key);
    if (typeof value === "string" && value.indexOf("&") === -1) {
      this._externalMap[key] = value;
    }
  }
  // -------------------------------------------------------------------------
  // Input / runtime entity registration (per document)
  // -------------------------------------------------------------------------
  /**
   * Inject DOCTYPE entities for the current document.
   * Also resets per-document expansion counters.
   * @param {Record<string, string | { regx?: RegExp, regex?: RegExp, val: string }>} map
   */
  addInputEntities(map2) {
    this._totalExpansions = 0;
    this._expandedLength = 0;
    this._inputMap = mergeEntityMaps(map2);
  }
  // -------------------------------------------------------------------------
  // Per-document reset
  // -------------------------------------------------------------------------
  /**
   * Wipe input/runtime entities and reset counters.
   * Call this before processing each new document.
   * @returns {this}
   */
  reset() {
    this._inputMap = /* @__PURE__ */ Object.create(null);
    this._totalExpansions = 0;
    this._expandedLength = 0;
    return this;
  }
  // -------------------------------------------------------------------------
  // XML version (can be set after construction, e.g. once parser reads <?xml?>)
  // -------------------------------------------------------------------------
  /**
   * Update the XML version used for NCR classification.
   * Call this as soon as the document's `<?xml version="...">` declaration is parsed.
   * @param {1.0|1.1|number} version
   */
  setXmlVersion(version) {
    this._ncrXmlVersion = version === 1.1 ? 1.1 : 1;
  }
  // -------------------------------------------------------------------------
  // Primary API
  // -------------------------------------------------------------------------
  /**
   * Replace all entity references in `str` in a single pass.
   *
   * @param {string} str
   * @returns {string}
   */
  decode(str2) {
    if (typeof str2 !== "string" || str2.length === 0) return str2;
    const original = str2;
    const chunks = [];
    const len = str2.length;
    let last = 0;
    let i = 0;
    const limitExpansions = this._maxTotalExpansions > 0;
    const limitLength = this._maxExpandedLength > 0;
    const checkLimits = limitExpansions || limitLength;
    while (i < len) {
      if (str2.charCodeAt(i) !== 38) {
        i++;
        continue;
      }
      let j = i + 1;
      while (j < len && str2.charCodeAt(j) !== 59 && j - i <= 32) j++;
      if (j >= len || str2.charCodeAt(j) !== 59) {
        i++;
        continue;
      }
      const token = str2.slice(i + 1, j);
      if (token.length === 0) {
        i++;
        continue;
      }
      let replacement;
      let tier;
      if (this._removeSet.has(token)) {
        replacement = "";
        if (tier === void 0) {
          tier = LIMIT_TIER_EXTERNAL;
        }
      } else if (this._leaveSet.has(token)) {
        i++;
        continue;
      } else if (token.charCodeAt(0) === 35) {
        const ncrResult = this._resolveNCR(token);
        if (ncrResult === void 0) {
          i++;
          continue;
        }
        replacement = ncrResult;
        tier = LIMIT_TIER_BASE;
      } else {
        const resolved = this._resolveName(token);
        replacement = resolved?.value;
        tier = resolved?.tier;
      }
      if (replacement === void 0) {
        i++;
        continue;
      }
      if (i > last) chunks.push(str2.slice(last, i));
      chunks.push(replacement);
      last = j + 1;
      i = last;
      if (checkLimits && this._tierCounts(tier)) {
        if (limitExpansions) {
          this._totalExpansions++;
          if (this._totalExpansions > this._maxTotalExpansions) {
            throw new Error(
              `[EntityReplacer] Entity expansion count limit exceeded: ${this._totalExpansions} > ${this._maxTotalExpansions}`
            );
          }
        }
        if (limitLength) {
          const delta = replacement.length - (token.length + 2);
          if (delta > 0) {
            this._expandedLength += delta;
            if (this._expandedLength > this._maxExpandedLength) {
              throw new Error(
                `[EntityReplacer] Expanded content length limit exceeded: ${this._expandedLength} > ${this._maxExpandedLength}`
              );
            }
          }
        }
      }
    }
    if (last < len) chunks.push(str2.slice(last));
    const result = chunks.length === 0 ? str2 : chunks.join("");
    return this._postCheck(result, original);
  }
  // -------------------------------------------------------------------------
  // Private: limit tier check
  // -------------------------------------------------------------------------
  /**
   * Returns true if a resolved entity of the given tier should count
   * against the expansion/length limits.
   * @param {string} tier  — LIMIT_TIER_EXTERNAL | LIMIT_TIER_BASE
   * @returns {boolean}
   */
  _tierCounts(tier) {
    if (this._limitTiers.has(LIMIT_TIER_ALL)) return true;
    return this._limitTiers.has(tier);
  }
  // -------------------------------------------------------------------------
  // Private: entity resolution
  // -------------------------------------------------------------------------
  /**
   * Resolve a named entity token (without & and ;).
   * Priority: inputMap > externalMap > baseMap
   * Returns the resolved value tagged with its limit tier.
   *
   * @param {string} name
   * @returns {{ value: string, tier: string }|undefined}
   */
  _resolveName(name) {
    if (name in this._inputMap) return { value: this._inputMap[name], tier: LIMIT_TIER_EXTERNAL };
    if (name in this._externalMap) return { value: this._externalMap[name], tier: LIMIT_TIER_EXTERNAL };
    if (name in this._baseMap) return { value: this._baseMap[name], tier: LIMIT_TIER_BASE };
    return void 0;
  }
  /**
   * Classify a codepoint and return the minimum action level that must be applied.
   * Returns -1 when no minimum is imposed (normal allow path).
   *
   * Ranges checked (in priority order):
   *   1. U+0000            — null, governed by nullNCR (always ≥ remove)
   *   2. U+D800–U+DFFF     — surrogates, always prohibited (min: remove)
   *   3. U+0001–U+001F \ {0x09,0x0A,0x0D}  — XML 1.0 restricted C0 (min: remove)
   *      (skipped in XML 1.1 — C0 controls are allowed when written as NCRs)
   *
   * @param {number} cp  — codepoint
   * @returns {number}   — minimum NCR_LEVEL value, or -1 for no restriction
   */
  _classifyNCR(cp) {
    if (cp === 0) return this._ncrNullLevel;
    if (cp >= 55296 && cp <= 57343) return NCR_LEVEL.remove;
    if (this._ncrXmlVersion === 1) {
      if (cp >= 1 && cp <= 31 && !XML10_ALLOWED_C0.has(cp)) return NCR_LEVEL.remove;
    }
    return -1;
  }
  /**
   * Execute a resolved NCR action.
   *
   * @param {number} action   — NCR_LEVEL value
   * @param {string} token    — raw token (e.g. '#38') for error messages
   * @param {number} cp       — codepoint, used only for error messages
   * @returns {string|undefined}
   *   - decoded character string  → 'allow'
   *   - ''                        → 'remove'
   *   - undefined                 → 'leave' (caller must skip past '&' only)
   *   - throws Error              → 'throw'
   */
  _applyNCRAction(action, token, cp) {
    switch (action) {
      case NCR_LEVEL.allow:
        return String.fromCodePoint(cp);
      case NCR_LEVEL.remove:
        return "";
      case NCR_LEVEL.leave:
        return void 0;
      // signal: keep literal
      case NCR_LEVEL.throw:
        throw new Error(
          `[EntityDecoder] Prohibited numeric character reference &${token}; (U+${cp.toString(16).toUpperCase().padStart(4, "0")})`
        );
      default:
        return String.fromCodePoint(cp);
    }
  }
  /**
   * Full NCR resolution pipeline for a numeric token.
   *
   * Steps:
   *   1. Parse the codepoint (decimal or hex).
   *   2. Validate the raw codepoint range (NaN, <0, >0x10FFFF).
   *   3. If numericAllowed is false and no minimum restriction applies → leave as-is.
   *   4. Classify the codepoint to find the minimum required action level.
   *   5. Resolve effective action = max(onNCR, minimum).
   *   6. Apply and return.
   *
   * @param {string} token  — e.g. '#38', '#x26', '#X26'
   * @returns {string|undefined}
   *   - string (incl. '')  — replacement ('' = remove)
   *   - undefined          — leave original &token; as-is
   */
  _resolveNCR(token) {
    const second = token.charCodeAt(1);
    let cp;
    if (second === 120 || second === 88) {
      cp = parseInt(token.slice(2), 16);
    } else {
      cp = parseInt(token.slice(1), 10);
    }
    if (Number.isNaN(cp) || cp < 0 || cp > 1114111) return void 0;
    const minimum = this._classifyNCR(cp);
    if (!this._numericAllowed && minimum < NCR_LEVEL.remove) return void 0;
    const effective = minimum === -1 ? this._ncrOnLevel : Math.max(this._ncrOnLevel, minimum);
    return this._applyNCRAction(effective, token, cp);
  }
};

// ../../node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js
var defaultOnDangerousProperty = (name) => {
  if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return "__" + name;
  }
  return name;
};
var defaultOptions2 = {
  preserveOrder: false,
  attributeNamePrefix: "@_",
  attributesGroupName: false,
  textNodeName: "#text",
  ignoreAttributes: true,
  removeNSPrefix: false,
  // remove NS from tag name or attribute name if true
  allowBooleanAttributes: false,
  //a tag can have attributes without any value
  //ignoreRootElement : false,
  parseTagValue: true,
  parseAttributeValue: false,
  trimValues: true,
  //Trim string values of tag and attributes
  cdataPropName: false,
  numberParseOptions: {
    hex: true,
    leadingZeros: true,
    eNotation: true
  },
  tagValueProcessor: function(tagName, val) {
    return val;
  },
  attributeValueProcessor: function(attrName, val) {
    return val;
  },
  stopNodes: [],
  //nested tags will not be parsed even for errors
  alwaysCreateTextNode: false,
  isArray: () => false,
  commentPropName: false,
  unpairedTags: [],
  processEntities: true,
  htmlEntities: false,
  entityDecoder: null,
  ignoreDeclaration: false,
  ignorePiTags: false,
  transformTagName: false,
  transformAttributeName: false,
  updateTag: function(tagName, jPath, attrs) {
    return tagName;
  },
  // skipEmptyListItem: false
  captureMetaData: false,
  maxNestedTags: 100,
  strictReservedNames: true,
  jPath: true,
  // if true, pass jPath string to callbacks; if false, pass matcher instance
  onDangerousProperty: defaultOnDangerousProperty
};
function validatePropertyName(propertyName, optionName) {
  if (typeof propertyName !== "string") {
    return;
  }
  const normalized = propertyName.toLowerCase();
  if (DANGEROUS_PROPERTY_NAMES.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
  if (criticalProperties.some((dangerous) => normalized === dangerous.toLowerCase())) {
    throw new Error(
      `[SECURITY] Invalid ${optionName}: "${propertyName}" is a reserved JavaScript keyword that could cause prototype pollution`
    );
  }
}
function normalizeProcessEntities(value, htmlEntities) {
  if (typeof value === "boolean") {
    return {
      enabled: value,
      // true or false
      maxEntitySize: 1e4,
      maxExpansionDepth: 1e4,
      maxTotalExpansions: Infinity,
      maxExpandedLength: 1e5,
      maxEntityCount: 1e3,
      allowedTags: null,
      tagFilter: null,
      appliesTo: "all"
    };
  }
  if (typeof value === "object" && value !== null) {
    return {
      enabled: value.enabled !== false,
      maxEntitySize: Math.max(1, value.maxEntitySize ?? 1e4),
      maxExpansionDepth: Math.max(1, value.maxExpansionDepth ?? 1e4),
      maxTotalExpansions: Math.max(1, value.maxTotalExpansions ?? Infinity),
      maxExpandedLength: Math.max(1, value.maxExpandedLength ?? 1e5),
      maxEntityCount: Math.max(1, value.maxEntityCount ?? 1e3),
      allowedTags: value.allowedTags ?? null,
      tagFilter: value.tagFilter ?? null,
      appliesTo: value.appliesTo ?? "all"
    };
  }
  return normalizeProcessEntities(true);
}
var buildOptions = function(options) {
  const built = Object.assign({}, defaultOptions2, options);
  const propertyNameOptions = [
    { value: built.attributeNamePrefix, name: "attributeNamePrefix" },
    { value: built.attributesGroupName, name: "attributesGroupName" },
    { value: built.textNodeName, name: "textNodeName" },
    { value: built.cdataPropName, name: "cdataPropName" },
    { value: built.commentPropName, name: "commentPropName" }
  ];
  for (const { value, name } of propertyNameOptions) {
    if (value) {
      validatePropertyName(value, name);
    }
  }
  if (built.onDangerousProperty === null) {
    built.onDangerousProperty = defaultOnDangerousProperty;
  }
  built.processEntities = normalizeProcessEntities(built.processEntities, built.htmlEntities);
  built.unpairedTagsSet = new Set(built.unpairedTags);
  if (built.stopNodes && Array.isArray(built.stopNodes)) {
    built.stopNodes = built.stopNodes.map((node) => {
      if (typeof node === "string" && node.startsWith("*.")) {
        return ".." + node.substring(2);
      }
      return node;
    });
  }
  return built;
};

// ../../node_modules/fast-xml-parser/src/xmlparser/xmlNode.js
var METADATA_SYMBOL;
if (typeof Symbol !== "function") {
  METADATA_SYMBOL = "@@xmlMetadata";
} else {
  METADATA_SYMBOL = /* @__PURE__ */ Symbol("XML Node Metadata");
}
var XmlNode = class {
  constructor(tagname) {
    this.tagname = tagname;
    this.child = [];
    this[":@"] = /* @__PURE__ */ Object.create(null);
  }
  add(key, val) {
    if (key === "__proto__") key = "#__proto__";
    this.child.push({ [key]: val });
  }
  addChild(node, startIndex) {
    if (node.tagname === "__proto__") node.tagname = "#__proto__";
    if (node[":@"] && Object.keys(node[":@"]).length > 0) {
      this.child.push({ [node.tagname]: node.child, [":@"]: node[":@"] });
    } else {
      this.child.push({ [node.tagname]: node.child });
    }
    if (startIndex !== void 0) {
      this.child[this.child.length - 1][METADATA_SYMBOL] = { startIndex };
    }
  }
  /** symbol used for metadata */
  static getMetaDataSymbol() {
    return METADATA_SYMBOL;
  }
};

// ../../node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js
var DocTypeReader = class {
  constructor(options) {
    this.suppressValidationErr = !options;
    this.options = options;
  }
  readDocType(xmlData, i) {
    const entities = /* @__PURE__ */ Object.create(null);
    let entityCount = 0;
    if (xmlData[i + 3] === "O" && xmlData[i + 4] === "C" && xmlData[i + 5] === "T" && xmlData[i + 6] === "Y" && xmlData[i + 7] === "P" && xmlData[i + 8] === "E") {
      i = i + 9;
      let angleBracketsCount = 1;
      let hasBody = false, comment = false;
      let exp = "";
      for (; i < xmlData.length; i++) {
        if (xmlData[i] === "<" && !comment) {
          if (hasBody && hasSeq(xmlData, "!ENTITY", i)) {
            i += 7;
            let entityName, val;
            [entityName, val, i] = this.readEntityExp(xmlData, i + 1, this.suppressValidationErr);
            if (val.indexOf("&") === -1) {
              if (this.options.enabled !== false && this.options.maxEntityCount != null && entityCount >= this.options.maxEntityCount) {
                throw new Error(
                  `Entity count (${entityCount + 1}) exceeds maximum allowed (${this.options.maxEntityCount})`
                );
              }
              entities[entityName] = val;
              entityCount++;
            }
          } else if (hasBody && hasSeq(xmlData, "!ELEMENT", i)) {
            i += 8;
            const { index } = this.readElementExp(xmlData, i + 1);
            i = index;
          } else if (hasBody && hasSeq(xmlData, "!ATTLIST", i)) {
            i += 8;
          } else if (hasBody && hasSeq(xmlData, "!NOTATION", i)) {
            i += 9;
            const { index } = this.readNotationExp(xmlData, i + 1, this.suppressValidationErr);
            i = index;
          } else if (hasSeq(xmlData, "!--", i)) comment = true;
          else throw new Error(`Invalid DOCTYPE`);
          angleBracketsCount++;
          exp = "";
        } else if (xmlData[i] === ">") {
          if (comment) {
            if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
              comment = false;
              angleBracketsCount--;
            }
          } else {
            angleBracketsCount--;
          }
          if (angleBracketsCount === 0) {
            break;
          }
        } else if (xmlData[i] === "[") {
          hasBody = true;
        } else {
          exp += xmlData[i];
        }
      }
      if (angleBracketsCount !== 0) {
        throw new Error(`Unclosed DOCTYPE`);
      }
    } else {
      throw new Error(`Invalid Tag instead of DOCTYPE`);
    }
    return { entities, i };
  }
  readEntityExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== '"' && xmlData[i] !== "'") {
      i++;
    }
    let entityName = xmlData.substring(startIndex, i);
    validateEntityName2(entityName);
    i = skipWhitespace(xmlData, i);
    if (!this.suppressValidationErr) {
      if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") {
        throw new Error("External entities are not supported");
      } else if (xmlData[i] === "%") {
        throw new Error("Parameter entities are not supported");
      }
    }
    let entityValue = "";
    [i, entityValue] = this.readIdentifierVal(xmlData, i, "entity");
    if (this.options.enabled !== false && this.options.maxEntitySize != null && entityValue.length > this.options.maxEntitySize) {
      throw new Error(
        `Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`
      );
    }
    i--;
    return [entityName, entityValue, i];
  }
  readNotationExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let notationName = xmlData.substring(startIndex, i);
    !this.suppressValidationErr && validateEntityName2(notationName);
    i = skipWhitespace(xmlData, i);
    const identifierType = xmlData.substring(i, i + 6).toUpperCase();
    if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC") {
      throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
    }
    i += identifierType.length;
    i = skipWhitespace(xmlData, i);
    let publicIdentifier = null;
    let systemIdentifier = null;
    if (identifierType === "PUBLIC") {
      [i, publicIdentifier] = this.readIdentifierVal(xmlData, i, "publicIdentifier");
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] === '"' || xmlData[i] === "'") {
        [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      }
    } else if (identifierType === "SYSTEM") {
      [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
      if (!this.suppressValidationErr && !systemIdentifier) {
        throw new Error("Missing mandatory system identifier for SYSTEM notation");
      }
    }
    return { notationName, publicIdentifier, systemIdentifier, index: --i };
  }
  readIdentifierVal(xmlData, i, type2) {
    let identifierVal = "";
    const startChar = xmlData[i];
    if (startChar !== '"' && startChar !== "'") {
      throw new Error(`Expected quoted string, found "${startChar}"`);
    }
    i++;
    const startIndex = i;
    while (i < xmlData.length && xmlData[i] !== startChar) {
      i++;
    }
    identifierVal = xmlData.substring(startIndex, i);
    if (xmlData[i] !== startChar) {
      throw new Error(`Unterminated ${type2} value`);
    }
    i++;
    return [i, identifierVal];
  }
  readElementExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    const startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    if (!this.suppressValidationErr && !isName(elementName)) {
      throw new Error(`Invalid element name: "${elementName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let contentModel = "";
    if (xmlData[i] === "E" && hasSeq(xmlData, "MPTY", i)) i += 4;
    else if (xmlData[i] === "A" && hasSeq(xmlData, "NY", i)) i += 2;
    else if (xmlData[i] === "(") {
      i++;
      const startIndex2 = i;
      while (i < xmlData.length && xmlData[i] !== ")") {
        i++;
      }
      contentModel = xmlData.substring(startIndex2, i);
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated content model");
      }
    } else if (!this.suppressValidationErr) {
      throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
    }
    return {
      elementName,
      contentModel: contentModel.trim(),
      index: i
    };
  }
  readAttlistExp(xmlData, i) {
    i = skipWhitespace(xmlData, i);
    let startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let elementName = xmlData.substring(startIndex, i);
    validateEntityName2(elementName);
    i = skipWhitespace(xmlData, i);
    startIndex = i;
    while (i < xmlData.length && !/\s/.test(xmlData[i])) {
      i++;
    }
    let attributeName = xmlData.substring(startIndex, i);
    if (!validateEntityName2(attributeName)) {
      throw new Error(`Invalid attribute name: "${attributeName}"`);
    }
    i = skipWhitespace(xmlData, i);
    let attributeType = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "NOTATION") {
      attributeType = "NOTATION";
      i += 8;
      i = skipWhitespace(xmlData, i);
      if (xmlData[i] !== "(") {
        throw new Error(`Expected '(', found "${xmlData[i]}"`);
      }
      i++;
      let allowedNotations = [];
      while (i < xmlData.length && xmlData[i] !== ")") {
        const startIndex2 = i;
        while (i < xmlData.length && xmlData[i] !== "|" && xmlData[i] !== ")") {
          i++;
        }
        let notation = xmlData.substring(startIndex2, i);
        notation = notation.trim();
        if (!validateEntityName2(notation)) {
          throw new Error(`Invalid notation name: "${notation}"`);
        }
        allowedNotations.push(notation);
        if (xmlData[i] === "|") {
          i++;
          i = skipWhitespace(xmlData, i);
        }
      }
      if (xmlData[i] !== ")") {
        throw new Error("Unterminated list of notations");
      }
      i++;
      attributeType += " (" + allowedNotations.join("|") + ")";
    } else {
      const startIndex2 = i;
      while (i < xmlData.length && !/\s/.test(xmlData[i])) {
        i++;
      }
      attributeType += xmlData.substring(startIndex2, i);
      const validTypes = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
      if (!this.suppressValidationErr && !validTypes.includes(attributeType.toUpperCase())) {
        throw new Error(`Invalid attribute type: "${attributeType}"`);
      }
    }
    i = skipWhitespace(xmlData, i);
    let defaultValue = "";
    if (xmlData.substring(i, i + 8).toUpperCase() === "#REQUIRED") {
      defaultValue = "#REQUIRED";
      i += 8;
    } else if (xmlData.substring(i, i + 7).toUpperCase() === "#IMPLIED") {
      defaultValue = "#IMPLIED";
      i += 7;
    } else {
      [i, defaultValue] = this.readIdentifierVal(xmlData, i, "ATTLIST");
    }
    return {
      elementName,
      attributeName,
      attributeType,
      defaultValue,
      index: i
    };
  }
};
var skipWhitespace = (data, index) => {
  while (index < data.length && /\s/.test(data[index])) {
    index++;
  }
  return index;
};
function hasSeq(data, seq2, i) {
  for (let j = 0; j < seq2.length; j++) {
    if (seq2[j] !== data[i + j + 1]) return false;
  }
  return true;
}
function validateEntityName2(name) {
  if (isName(name))
    return name;
  else
    throw new Error(`Invalid entity name ${name}`);
}

// ../../node_modules/strnum/strnum.js
var hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
var binRegex = /^0b[01]+$/;
var octRegex = /^0o[0-7]+$/;
var numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
var consider = {
  hex: true,
  binary: false,
  octal: false,
  leadingZeros: true,
  decimalPoint: ".",
  eNotation: true,
  //skipLike: /regex/,
  infinity: "original"
  // "null", "infinity" (Infinity type), "string" ("Infinity" (the string literal))
};
function toNumber(str2, options = {}) {
  options = Object.assign({}, consider, options);
  if (!str2 || typeof str2 !== "string") return str2;
  let trimmedStr = str2.trim();
  if (trimmedStr.length === 0) return str2;
  else if (options.skipLike !== void 0 && options.skipLike.test(trimmedStr)) return str2;
  else if (trimmedStr === "0") return 0;
  else if (options.hex && hexRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 16);
  } else if (options.binary && binRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 2);
  } else if (options.octal && octRegex.test(trimmedStr)) {
    return parse_int(trimmedStr, 8);
  } else if (!isFinite(trimmedStr)) {
    return handleInfinity(str2, Number(trimmedStr), options);
  } else if (trimmedStr.includes("e") || trimmedStr.includes("E")) {
    return resolveEnotation(str2, trimmedStr, options);
  } else {
    const match = numRegex.exec(trimmedStr);
    if (match) {
      const sign = match[1] || "";
      const leadingZeros = match[2];
      let numTrimmedByZeros = trimZeros(match[3]);
      const decimalAdjacentToLeadingZeros = sign ? (
        // 0., -00., 000.
        str2[leadingZeros.length + 1] === "."
      ) : str2[leadingZeros.length] === ".";
      if (!options.leadingZeros && (leadingZeros.length > 1 || leadingZeros.length === 1 && !decimalAdjacentToLeadingZeros)) {
        return str2;
      } else {
        const num = Number(trimmedStr);
        const parsedStr = String(num);
        if (num === 0) return num;
        if (parsedStr.search(/[eE]/) !== -1) {
          if (options.eNotation) return num;
          else return str2;
        } else if (trimmedStr.indexOf(".") !== -1) {
          if (parsedStr === "0") return num;
          else if (parsedStr === numTrimmedByZeros) return num;
          else if (parsedStr === `${sign}${numTrimmedByZeros}`) return num;
          else return str2;
        }
        let n = leadingZeros ? numTrimmedByZeros : trimmedStr;
        if (leadingZeros) {
          return n === parsedStr || sign + n === parsedStr ? num : str2;
        } else {
          return n === parsedStr || n === sign + parsedStr ? num : str2;
        }
      }
    } else {
      return str2;
    }
  }
}
var eNotationRegx = /^([-+])?(0*)(\d*(\.\d*)?[eE][-\+]?\d+)$/;
function resolveEnotation(str2, trimmedStr, options) {
  if (!options.eNotation) return str2;
  const notation = trimmedStr.match(eNotationRegx);
  if (notation) {
    let sign = notation[1] || "";
    const eChar = notation[3].indexOf("e") === -1 ? "E" : "e";
    const leadingZeros = notation[2];
    const eAdjacentToLeadingZeros = sign ? (
      // 0E.
      str2[leadingZeros.length + 1] === eChar
    ) : str2[leadingZeros.length] === eChar;
    if (leadingZeros.length > 1 && eAdjacentToLeadingZeros) return str2;
    else if (leadingZeros.length === 1 && (notation[3].startsWith(`.${eChar}`) || notation[3][0] === eChar)) {
      return Number(trimmedStr);
    } else if (leadingZeros.length > 0) {
      if (options.leadingZeros && !eAdjacentToLeadingZeros) {
        trimmedStr = (notation[1] || "") + notation[3];
        return Number(trimmedStr);
      } else return str2;
    } else {
      return Number(trimmedStr);
    }
  } else {
    return str2;
  }
}
function trimZeros(numStr) {
  if (numStr && numStr.indexOf(".") !== -1) {
    numStr = numStr.replace(/0+$/, "");
    if (numStr === ".") numStr = "0";
    else if (numStr[0] === ".") numStr = "0" + numStr;
    else if (numStr[numStr.length - 1] === ".") numStr = numStr.substring(0, numStr.length - 1);
    return numStr;
  }
  return numStr;
}
function parse_int(numStr, base) {
  const str2 = numStr.trim();
  if (base === 2 || base === 8) numStr = str2.substring(2);
  if (parseInt) return parseInt(numStr, base);
  else if (Number.parseInt) return Number.parseInt(numStr, base);
  else if (window && window.parseInt) return window.parseInt(numStr, base);
  else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported");
}
function handleInfinity(str2, num, options) {
  const isPositive = num === Infinity;
  switch (options.infinity.toLowerCase()) {
    case "null":
      return null;
    case "infinity":
      return num;
    // Return Infinity or -Infinity
    case "string":
      return isPositive ? "Infinity" : "-Infinity";
    case "original":
    default:
      return str2;
  }
}

// ../../node_modules/fast-xml-parser/src/ignoreAttributes.js
function getIgnoreAttributesFn(ignoreAttributes) {
  if (typeof ignoreAttributes === "function") {
    return ignoreAttributes;
  }
  if (Array.isArray(ignoreAttributes)) {
    return (attrName) => {
      for (const pattern of ignoreAttributes) {
        if (typeof pattern === "string" && attrName === pattern) {
          return true;
        }
        if (pattern instanceof RegExp && pattern.test(attrName)) {
          return true;
        }
      }
    };
  }
  return () => false;
}

// ../../node_modules/path-expression-matcher/src/Expression.js
var Expression = class {
  /**
   * Create a new Expression
   * @param {string} pattern - Pattern string (e.g., "root.users.user", "..user[id]")
   * @param {Object} options - Configuration options
   * @param {string} options.separator - Path separator (default: '.')
   */
  constructor(pattern, options = {}, data) {
    this.pattern = pattern;
    this.separator = options.separator || ".";
    this.segments = this._parse(pattern);
    this.data = data;
    this._hasDeepWildcard = this.segments.some((seg) => seg.type === "deep-wildcard");
    this._hasAttributeCondition = this.segments.some((seg) => seg.attrName !== void 0);
    this._hasPositionSelector = this.segments.some((seg) => seg.position !== void 0);
  }
  /**
   * Parse pattern string into segments
   * @private
   * @param {string} pattern - Pattern to parse
   * @returns {Array} Array of segment objects
   */
  _parse(pattern) {
    const segments = [];
    let i = 0;
    let currentPart = "";
    while (i < pattern.length) {
      if (pattern[i] === this.separator) {
        if (i + 1 < pattern.length && pattern[i + 1] === this.separator) {
          if (currentPart.trim()) {
            segments.push(this._parseSegment(currentPart.trim()));
            currentPart = "";
          }
          segments.push({ type: "deep-wildcard" });
          i += 2;
        } else {
          if (currentPart.trim()) {
            segments.push(this._parseSegment(currentPart.trim()));
          }
          currentPart = "";
          i++;
        }
      } else {
        currentPart += pattern[i];
        i++;
      }
    }
    if (currentPart.trim()) {
      segments.push(this._parseSegment(currentPart.trim()));
    }
    return segments;
  }
  /**
   * Parse a single segment
   * @private
   * @param {string} part - Segment string (e.g., "user", "ns::user", "user[id]", "ns::user:first")
   * @returns {Object} Segment object
   */
  _parseSegment(part) {
    const segment = { type: "tag" };
    let bracketContent = null;
    let withoutBrackets = part;
    const bracketMatch = part.match(/^([^\[]+)(\[[^\]]*\])(.*)$/);
    if (bracketMatch) {
      withoutBrackets = bracketMatch[1] + bracketMatch[3];
      if (bracketMatch[2]) {
        const content = bracketMatch[2].slice(1, -1);
        if (content) {
          bracketContent = content;
        }
      }
    }
    let namespace = void 0;
    let tagAndPosition = withoutBrackets;
    if (withoutBrackets.includes("::")) {
      const nsIndex = withoutBrackets.indexOf("::");
      namespace = withoutBrackets.substring(0, nsIndex).trim();
      tagAndPosition = withoutBrackets.substring(nsIndex + 2).trim();
      if (!namespace) {
        throw new Error(`Invalid namespace in pattern: ${part}`);
      }
    }
    let tag = void 0;
    let positionMatch = null;
    if (tagAndPosition.includes(":")) {
      const colonIndex = tagAndPosition.lastIndexOf(":");
      const tagPart = tagAndPosition.substring(0, colonIndex).trim();
      const posPart = tagAndPosition.substring(colonIndex + 1).trim();
      const isPositionKeyword = ["first", "last", "odd", "even"].includes(posPart) || /^nth\(\d+\)$/.test(posPart);
      if (isPositionKeyword) {
        tag = tagPart;
        positionMatch = posPart;
      } else {
        tag = tagAndPosition;
      }
    } else {
      tag = tagAndPosition;
    }
    if (!tag) {
      throw new Error(`Invalid segment pattern: ${part}`);
    }
    segment.tag = tag;
    if (namespace) {
      segment.namespace = namespace;
    }
    if (bracketContent) {
      if (bracketContent.includes("=")) {
        const eqIndex = bracketContent.indexOf("=");
        segment.attrName = bracketContent.substring(0, eqIndex).trim();
        segment.attrValue = bracketContent.substring(eqIndex + 1).trim();
      } else {
        segment.attrName = bracketContent.trim();
      }
    }
    if (positionMatch) {
      const nthMatch = positionMatch.match(/^nth\((\d+)\)$/);
      if (nthMatch) {
        segment.position = "nth";
        segment.positionValue = parseInt(nthMatch[1], 10);
      } else {
        segment.position = positionMatch;
      }
    }
    return segment;
  }
  /**
   * Get the number of segments
   * @returns {number}
   */
  get length() {
    return this.segments.length;
  }
  /**
   * Check if expression contains deep wildcard
   * @returns {boolean}
   */
  hasDeepWildcard() {
    return this._hasDeepWildcard;
  }
  /**
   * Check if expression has attribute conditions
   * @returns {boolean}
   */
  hasAttributeCondition() {
    return this._hasAttributeCondition;
  }
  /**
   * Check if expression has position selectors
   * @returns {boolean}
   */
  hasPositionSelector() {
    return this._hasPositionSelector;
  }
  /**
   * Get string representation
   * @returns {string}
   */
  toString() {
    return this.pattern;
  }
};

// ../../node_modules/path-expression-matcher/src/ExpressionSet.js
var ExpressionSet = class {
  constructor() {
    this._byDepthAndTag = /* @__PURE__ */ new Map();
    this._wildcardByDepth = /* @__PURE__ */ new Map();
    this._deepWildcards = [];
    this._patterns = /* @__PURE__ */ new Set();
    this._sealed = false;
  }
  /**
   * Add an Expression to the set.
   * Duplicate patterns (same pattern string) are silently ignored.
   *
   * @param {import('./Expression.js').default} expression - A pre-constructed Expression instance
   * @returns {this} for chaining
   * @throws {TypeError} if called after seal()
   *
   * @example
   * set.add(new Expression('root.users.user'));
   * set.add(new Expression('..script'));
   */
  add(expression) {
    if (this._sealed) {
      throw new TypeError(
        "ExpressionSet is sealed. Create a new ExpressionSet to add more expressions."
      );
    }
    if (this._patterns.has(expression.pattern)) return this;
    this._patterns.add(expression.pattern);
    if (expression.hasDeepWildcard()) {
      this._deepWildcards.push(expression);
      return this;
    }
    const depth = expression.length;
    const lastSeg = expression.segments[expression.segments.length - 1];
    const tag = lastSeg?.tag;
    if (!tag || tag === "*") {
      if (!this._wildcardByDepth.has(depth)) this._wildcardByDepth.set(depth, []);
      this._wildcardByDepth.get(depth).push(expression);
    } else {
      const key = `${depth}:${tag}`;
      if (!this._byDepthAndTag.has(key)) this._byDepthAndTag.set(key, []);
      this._byDepthAndTag.get(key).push(expression);
    }
    return this;
  }
  /**
   * Add multiple expressions at once.
   *
   * @param {import('./Expression.js').default[]} expressions - Array of Expression instances
   * @returns {this} for chaining
   *
   * @example
   * set.addAll([
   *   new Expression('root.users.user'),
   *   new Expression('root.config.setting'),
   * ]);
   */
  addAll(expressions) {
    for (const expr of expressions) this.add(expr);
    return this;
  }
  /**
   * Check whether a pattern string is already present in the set.
   *
   * @param {import('./Expression.js').default} expression
   * @returns {boolean}
   */
  has(expression) {
    return this._patterns.has(expression.pattern);
  }
  /**
   * Number of expressions in the set.
   * @type {number}
   */
  get size() {
    return this._patterns.size;
  }
  /**
   * Seal the set against further modifications.
   * Useful to prevent accidental mutations after config is built.
   * Calling add() or addAll() on a sealed set throws a TypeError.
   *
   * @returns {this}
   */
  seal() {
    this._sealed = true;
    return this;
  }
  /**
   * Whether the set has been sealed.
   * @type {boolean}
   */
  get isSealed() {
    return this._sealed;
  }
  /**
   * Test whether the matcher's current path matches any expression in the set.
   *
   * Evaluation order (cheapest → most expensive):
   *  1. Exact depth + tag bucket  — O(1) lookup, typically 0–2 expressions
   *  2. Depth-only wildcard bucket — O(1) lookup, rare
   *  3. Deep-wildcard list         — always checked, but usually small
   *
   * @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
   * @returns {boolean} true if any expression matches the current path
   *
   * @example
   * if (stopNodes.matchesAny(matcher)) {
   *   // handle stop node
   * }
   */
  matchesAny(matcher) {
    return this.findMatch(matcher) !== null;
  }
  /**
  * Find and return the first Expression that matches the matcher's current path.
  *
  * Uses the same evaluation order as matchesAny (cheapest → most expensive):
  *  1. Exact depth + tag bucket
  *  2. Depth-only wildcard bucket
  *  3. Deep-wildcard list
  *
  * @param {import('./Matcher.js').default} matcher - Matcher instance (or readOnly view)
  * @returns {import('./Expression.js').default | null} the first matching Expression, or null
  *
  * @example
  * const expr = stopNodes.findMatch(matcher);
  * if (expr) {
  *   // access expr.config, expr.pattern, etc.
  * }
  */
  findMatch(matcher) {
    const depth = matcher.getDepth();
    const tag = matcher.getCurrentTag();
    const exactKey = `${depth}:${tag}`;
    const exactBucket = this._byDepthAndTag.get(exactKey);
    if (exactBucket) {
      for (let i = 0; i < exactBucket.length; i++) {
        if (matcher.matches(exactBucket[i])) return exactBucket[i];
      }
    }
    const wildcardBucket = this._wildcardByDepth.get(depth);
    if (wildcardBucket) {
      for (let i = 0; i < wildcardBucket.length; i++) {
        if (matcher.matches(wildcardBucket[i])) return wildcardBucket[i];
      }
    }
    for (let i = 0; i < this._deepWildcards.length; i++) {
      if (matcher.matches(this._deepWildcards[i])) return this._deepWildcards[i];
    }
    return null;
  }
};

// ../../node_modules/path-expression-matcher/src/Matcher.js
var MatcherView = class {
  /**
   * @param {Matcher} matcher - The parent Matcher instance to read from.
   */
  constructor(matcher) {
    this._matcher = matcher;
  }
  /**
   * Get the path separator used by the parent matcher.
   * @returns {string}
   */
  get separator() {
    return this._matcher.separator;
  }
  /**
   * Get current tag name.
   * @returns {string|undefined}
   */
  getCurrentTag() {
    const path = this._matcher.path;
    return path.length > 0 ? path[path.length - 1].tag : void 0;
  }
  /**
   * Get current namespace.
   * @returns {string|undefined}
   */
  getCurrentNamespace() {
    const path = this._matcher.path;
    return path.length > 0 ? path[path.length - 1].namespace : void 0;
  }
  /**
   * Get current node's attribute value.
   * @param {string} attrName
   * @returns {*}
   */
  getAttrValue(attrName) {
    const path = this._matcher.path;
    if (path.length === 0) return void 0;
    return path[path.length - 1].values?.[attrName];
  }
  /**
   * Check if current node has an attribute.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAttr(attrName) {
    const path = this._matcher.path;
    if (path.length === 0) return false;
    const current = path[path.length - 1];
    return current.values !== void 0 && attrName in current.values;
  }
  /**
   * Get current node's sibling position (child index in parent).
   * @returns {number}
   */
  getPosition() {
    const path = this._matcher.path;
    if (path.length === 0) return -1;
    return path[path.length - 1].position ?? 0;
  }
  /**
   * Get current node's repeat counter (occurrence count of this tag name).
   * @returns {number}
   */
  getCounter() {
    const path = this._matcher.path;
    if (path.length === 0) return -1;
    return path[path.length - 1].counter ?? 0;
  }
  /**
   * Get current node's sibling index (alias for getPosition).
   * @returns {number}
   * @deprecated Use getPosition() or getCounter() instead
   */
  getIndex() {
    return this.getPosition();
  }
  /**
   * Get current path depth.
   * @returns {number}
   */
  getDepth() {
    return this._matcher.path.length;
  }
  /**
   * Get path as string.
   * @param {string} [separator] - Optional separator (uses default if not provided)
   * @param {boolean} [includeNamespace=true]
   * @returns {string}
   */
  toString(separator, includeNamespace = true) {
    return this._matcher.toString(separator, includeNamespace);
  }
  /**
   * Get path as array of tag names.
   * @returns {string[]}
   */
  toArray() {
    return this._matcher.path.map((n) => n.tag);
  }
  /**
   * Match current path against an Expression.
   * @param {Expression} expression
   * @returns {boolean}
   */
  matches(expression) {
    return this._matcher.matches(expression);
  }
  /**
   * Match any expression in the given set against the current path.
   * @param {ExpressionSet} exprSet
   * @returns {boolean}
   */
  matchesAny(exprSet) {
    return exprSet.matchesAny(this._matcher);
  }
};
var Matcher = class {
  /**
   * Create a new Matcher.
   * @param {Object} [options={}]
   * @param {string} [options.separator='.'] - Default path separator
   */
  constructor(options = {}) {
    this.separator = options.separator || ".";
    this.path = [];
    this.siblingStacks = [];
    this._pathStringCache = null;
    this._view = new MatcherView(this);
  }
  /**
   * Push a new tag onto the path.
   * @param {string} tagName
   * @param {Object|null} [attrValues=null]
   * @param {string|null} [namespace=null]
   */
  push(tagName, attrValues = null, namespace = null) {
    this._pathStringCache = null;
    if (this.path.length > 0) {
      this.path[this.path.length - 1].values = void 0;
    }
    const currentLevel = this.path.length;
    if (!this.siblingStacks[currentLevel]) {
      this.siblingStacks[currentLevel] = /* @__PURE__ */ new Map();
    }
    const siblings = this.siblingStacks[currentLevel];
    const siblingKey = namespace ? `${namespace}:${tagName}` : tagName;
    const counter = siblings.get(siblingKey) || 0;
    let position = 0;
    for (const count of siblings.values()) {
      position += count;
    }
    siblings.set(siblingKey, counter + 1);
    const node = {
      tag: tagName,
      position,
      counter
    };
    if (namespace !== null && namespace !== void 0) {
      node.namespace = namespace;
    }
    if (attrValues !== null && attrValues !== void 0) {
      node.values = attrValues;
    }
    this.path.push(node);
  }
  /**
   * Pop the last tag from the path.
   * @returns {Object|undefined} The popped node
   */
  pop() {
    if (this.path.length === 0) return void 0;
    this._pathStringCache = null;
    const node = this.path.pop();
    if (this.siblingStacks.length > this.path.length + 1) {
      this.siblingStacks.length = this.path.length + 1;
    }
    return node;
  }
  /**
   * Update current node's attribute values.
   * Useful when attributes are parsed after push.
   * @param {Object} attrValues
   */
  updateCurrent(attrValues) {
    if (this.path.length > 0) {
      const current = this.path[this.path.length - 1];
      if (attrValues !== null && attrValues !== void 0) {
        current.values = attrValues;
      }
    }
  }
  /**
   * Get current tag name.
   * @returns {string|undefined}
   */
  getCurrentTag() {
    return this.path.length > 0 ? this.path[this.path.length - 1].tag : void 0;
  }
  /**
   * Get current namespace.
   * @returns {string|undefined}
   */
  getCurrentNamespace() {
    return this.path.length > 0 ? this.path[this.path.length - 1].namespace : void 0;
  }
  /**
   * Get current node's attribute value.
   * @param {string} attrName
   * @returns {*}
   */
  getAttrValue(attrName) {
    if (this.path.length === 0) return void 0;
    return this.path[this.path.length - 1].values?.[attrName];
  }
  /**
   * Check if current node has an attribute.
   * @param {string} attrName
   * @returns {boolean}
   */
  hasAttr(attrName) {
    if (this.path.length === 0) return false;
    const current = this.path[this.path.length - 1];
    return current.values !== void 0 && attrName in current.values;
  }
  /**
   * Get current node's sibling position (child index in parent).
   * @returns {number}
   */
  getPosition() {
    if (this.path.length === 0) return -1;
    return this.path[this.path.length - 1].position ?? 0;
  }
  /**
   * Get current node's repeat counter (occurrence count of this tag name).
   * @returns {number}
   */
  getCounter() {
    if (this.path.length === 0) return -1;
    return this.path[this.path.length - 1].counter ?? 0;
  }
  /**
   * Get current node's sibling index (alias for getPosition).
   * @returns {number}
   * @deprecated Use getPosition() or getCounter() instead
   */
  getIndex() {
    return this.getPosition();
  }
  /**
   * Get current path depth.
   * @returns {number}
   */
  getDepth() {
    return this.path.length;
  }
  /**
   * Get path as string.
   * @param {string} [separator] - Optional separator (uses default if not provided)
   * @param {boolean} [includeNamespace=true]
   * @returns {string}
   */
  toString(separator, includeNamespace = true) {
    const sep = separator || this.separator;
    const isDefault = sep === this.separator && includeNamespace === true;
    if (isDefault) {
      if (this._pathStringCache !== null) {
        return this._pathStringCache;
      }
      const result = this.path.map(
        (n) => n.namespace ? `${n.namespace}:${n.tag}` : n.tag
      ).join(sep);
      this._pathStringCache = result;
      return result;
    }
    return this.path.map(
      (n) => includeNamespace && n.namespace ? `${n.namespace}:${n.tag}` : n.tag
    ).join(sep);
  }
  /**
   * Get path as array of tag names.
   * @returns {string[]}
   */
  toArray() {
    return this.path.map((n) => n.tag);
  }
  /**
   * Reset the path to empty.
   */
  reset() {
    this._pathStringCache = null;
    this.path = [];
    this.siblingStacks = [];
  }
  /**
   * Match current path against an Expression.
   * @param {Expression} expression
   * @returns {boolean}
   */
  matches(expression) {
    const segments = expression.segments;
    if (segments.length === 0) {
      return false;
    }
    if (expression.hasDeepWildcard()) {
      return this._matchWithDeepWildcard(segments);
    }
    return this._matchSimple(segments);
  }
  /**
   * @private
   */
  _matchSimple(segments) {
    if (this.path.length !== segments.length) {
      return false;
    }
    for (let i = 0; i < segments.length; i++) {
      if (!this._matchSegment(segments[i], this.path[i], i === this.path.length - 1)) {
        return false;
      }
    }
    return true;
  }
  /**
   * @private
   */
  _matchWithDeepWildcard(segments) {
    let pathIdx = this.path.length - 1;
    let segIdx = segments.length - 1;
    while (segIdx >= 0 && pathIdx >= 0) {
      const segment = segments[segIdx];
      if (segment.type === "deep-wildcard") {
        segIdx--;
        if (segIdx < 0) {
          return true;
        }
        const nextSeg = segments[segIdx];
        let found = false;
        for (let i = pathIdx; i >= 0; i--) {
          if (this._matchSegment(nextSeg, this.path[i], i === this.path.length - 1)) {
            pathIdx = i - 1;
            segIdx--;
            found = true;
            break;
          }
        }
        if (!found) {
          return false;
        }
      } else {
        if (!this._matchSegment(segment, this.path[pathIdx], pathIdx === this.path.length - 1)) {
          return false;
        }
        pathIdx--;
        segIdx--;
      }
    }
    return segIdx < 0;
  }
  /**
   * @private
   */
  _matchSegment(segment, node, isCurrentNode) {
    if (segment.tag !== "*" && segment.tag !== node.tag) {
      return false;
    }
    if (segment.namespace !== void 0) {
      if (segment.namespace !== "*" && segment.namespace !== node.namespace) {
        return false;
      }
    }
    if (segment.attrName !== void 0) {
      if (!isCurrentNode) {
        return false;
      }
      if (!node.values || !(segment.attrName in node.values)) {
        return false;
      }
      if (segment.attrValue !== void 0) {
        if (String(node.values[segment.attrName]) !== String(segment.attrValue)) {
          return false;
        }
      }
    }
    if (segment.position !== void 0) {
      if (!isCurrentNode) {
        return false;
      }
      const counter = node.counter ?? 0;
      if (segment.position === "first" && counter !== 0) {
        return false;
      } else if (segment.position === "odd" && counter % 2 !== 1) {
        return false;
      } else if (segment.position === "even" && counter % 2 !== 0) {
        return false;
      } else if (segment.position === "nth" && counter !== segment.positionValue) {
        return false;
      }
    }
    return true;
  }
  /**
   * Match any expression in the given set against the current path.
   * @param {ExpressionSet} exprSet
   * @returns {boolean}
   */
  matchesAny(exprSet) {
    return exprSet.matchesAny(this);
  }
  /**
   * Create a snapshot of current state.
   * @returns {Object}
   */
  snapshot() {
    return {
      path: this.path.map((node) => ({ ...node })),
      siblingStacks: this.siblingStacks.map((map2) => new Map(map2))
    };
  }
  /**
   * Restore state from snapshot.
   * @param {Object} snapshot
   */
  restore(snapshot) {
    this._pathStringCache = null;
    this.path = snapshot.path.map((node) => ({ ...node }));
    this.siblingStacks = snapshot.siblingStacks.map((map2) => new Map(map2));
  }
  /**
   * Return the read-only {@link MatcherView} for this matcher.
   *
   * The same instance is returned on every call — no allocation occurs.
   * It always reflects the current parser state and is safe to pass to
   * user callbacks without risk of accidental mutation.
   *
   * @returns {MatcherView}
   *
   * @example
   * const view = matcher.readOnly();
   * // pass view to callbacks — it stays in sync automatically
   * view.matches(expr);       // ✓
   * view.getCurrentTag();     // ✓
   * // view.push(...)         // ✗ method does not exist — caught by TypeScript
   */
  readOnly() {
    return this._view;
  }
};

// ../../node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js
function extractRawAttributes(prefixedAttrs, options) {
  if (!prefixedAttrs) return {};
  const attrs = options.attributesGroupName ? prefixedAttrs[options.attributesGroupName] : prefixedAttrs;
  if (!attrs) return {};
  const rawAttrs = {};
  for (const key in attrs) {
    if (key.startsWith(options.attributeNamePrefix)) {
      const rawName = key.substring(options.attributeNamePrefix.length);
      rawAttrs[rawName] = attrs[key];
    } else {
      rawAttrs[key] = attrs[key];
    }
  }
  return rawAttrs;
}
function extractNamespace(rawTagName) {
  if (!rawTagName || typeof rawTagName !== "string") return void 0;
  const colonIndex = rawTagName.indexOf(":");
  if (colonIndex !== -1 && colonIndex > 0) {
    const ns = rawTagName.substring(0, colonIndex);
    if (ns !== "xmlns") {
      return ns;
    }
  }
  return void 0;
}
var OrderedObjParser = class {
  constructor(options, externalEntities) {
    this.options = options;
    this.currentNode = null;
    this.tagsNodeStack = [];
    this.parseXml = parseXml;
    this.parseTextData = parseTextData;
    this.resolveNameSpace = resolveNameSpace;
    this.buildAttributesMap = buildAttributesMap;
    this.isItStopNode = isItStopNode;
    this.replaceEntitiesValue = replaceEntitiesValue;
    this.readStopNodeData = readStopNodeData;
    this.saveTextToParentTag = saveTextToParentTag;
    this.addChild = addChild;
    this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
    this.entityExpansionCount = 0;
    this.currentExpandedLength = 0;
    let namedEntities = { ...XML };
    if (this.options.entityDecoder) {
      this.entityDecoder = this.options.entityDecoder;
    } else {
      if (typeof this.options.htmlEntities === "object") namedEntities = this.options.htmlEntities;
      else if (this.options.htmlEntities === true) namedEntities = { ...COMMON_HTML, ...CURRENCY };
      this.entityDecoder = new EntityDecoder({
        namedEntities: { ...namedEntities, ...externalEntities },
        numericAllowed: this.options.htmlEntities,
        limit: {
          maxTotalExpansions: this.options.processEntities.maxTotalExpansions,
          maxExpandedLength: this.options.processEntities.maxExpandedLength,
          applyLimitsTo: this.options.processEntities.appliesTo
        }
        //postCheck: resolved => resolved
      });
    }
    this.matcher = new Matcher();
    this.readonlyMatcher = this.matcher.readOnly();
    this.isCurrentNodeStopNode = false;
    this.stopNodeExpressionsSet = new ExpressionSet();
    const stopNodesOpts = this.options.stopNodes;
    if (stopNodesOpts && stopNodesOpts.length > 0) {
      for (let i = 0; i < stopNodesOpts.length; i++) {
        const stopNodeExp = stopNodesOpts[i];
        if (typeof stopNodeExp === "string") {
          this.stopNodeExpressionsSet.add(new Expression(stopNodeExp));
        } else if (stopNodeExp instanceof Expression) {
          this.stopNodeExpressionsSet.add(stopNodeExp);
        }
      }
      this.stopNodeExpressionsSet.seal();
    }
  }
};
function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
  const options = this.options;
  if (val !== void 0) {
    if (options.trimValues && !dontTrim) {
      val = val.trim();
    }
    if (val.length > 0) {
      if (!escapeEntities) val = this.replaceEntitiesValue(val, tagName, jPath);
      const jPathOrMatcher = options.jPath ? jPath.toString() : jPath;
      const newval = options.tagValueProcessor(tagName, val, jPathOrMatcher, hasAttributes, isLeafNode);
      if (newval === null || newval === void 0) {
        return val;
      } else if (typeof newval !== typeof val || newval !== val) {
        return newval;
      } else if (options.trimValues) {
        return parseValue(val, options.parseTagValue, options.numberParseOptions);
      } else {
        const trimmedVal = val.trim();
        if (trimmedVal === val) {
          return parseValue(val, options.parseTagValue, options.numberParseOptions);
        } else {
          return val;
        }
      }
    }
  }
}
function resolveNameSpace(tagname) {
  if (this.options.removeNSPrefix) {
    const tags = tagname.split(":");
    const prefix = tagname.charAt(0) === "/" ? "/" : "";
    if (tags[0] === "xmlns") {
      return "";
    }
    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }
  return tagname;
}
var attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
function buildAttributesMap(attrStr, jPath, tagName, force = false) {
  const options = this.options;
  if (force === true || options.ignoreAttributes !== true && typeof attrStr === "string") {
    const matches = getAllMatches(attrStr, attrsRegx);
    const len = matches.length;
    const attrs = {};
    const processedVals = new Array(len);
    let hasRawAttrs = false;
    const rawAttrsForMatcher = {};
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      const oldVal = matches[i][4];
      if (attrName.length && oldVal !== void 0) {
        let val = oldVal;
        if (options.trimValues) val = val.trim();
        val = this.replaceEntitiesValue(val, tagName, this.readonlyMatcher);
        processedVals[i] = val;
        rawAttrsForMatcher[attrName] = val;
        hasRawAttrs = true;
      }
    }
    if (hasRawAttrs && typeof jPath === "object" && jPath.updateCurrent) {
      jPath.updateCurrent(rawAttrsForMatcher);
    }
    const jPathStr = options.jPath ? jPath.toString() : this.readonlyMatcher;
    let hasAttrs = false;
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      if (this.ignoreAttributesFn(attrName, jPathStr)) continue;
      let aName = options.attributeNamePrefix + attrName;
      if (attrName.length) {
        if (options.transformAttributeName) {
          aName = options.transformAttributeName(aName);
        }
        aName = sanitizeName(aName, options);
        if (matches[i][4] !== void 0) {
          const oldVal = processedVals[i];
          const newVal = options.attributeValueProcessor(attrName, oldVal, jPathStr);
          if (newVal === null || newVal === void 0) {
            attrs[aName] = oldVal;
          } else if (typeof newVal !== typeof oldVal || newVal !== oldVal) {
            attrs[aName] = newVal;
          } else {
            attrs[aName] = parseValue(oldVal, options.parseAttributeValue, options.numberParseOptions);
          }
          hasAttrs = true;
        } else if (options.allowBooleanAttributes) {
          attrs[aName] = true;
          hasAttrs = true;
        }
      }
    }
    if (!hasAttrs) return;
    if (options.attributesGroupName && !options.preserveOrder) {
      const attrCollection = {};
      attrCollection[options.attributesGroupName] = attrs;
      return attrCollection;
    }
    return attrs;
  }
}
var parseXml = function(xmlData) {
  xmlData = xmlData.replace(/\r\n?/g, "\n");
  const xmlObj = new XmlNode("!xml");
  let currentNode = xmlObj;
  let textData = "";
  this.matcher.reset();
  this.entityDecoder.reset();
  this.entityExpansionCount = 0;
  this.currentExpandedLength = 0;
  const options = this.options;
  const docTypeReader = new DocTypeReader(options.processEntities);
  const xmlLen = xmlData.length;
  for (let i = 0; i < xmlLen; i++) {
    const ch = xmlData[i];
    if (ch === "<") {
      const c1 = xmlData.charCodeAt(i + 1);
      if (c1 === 47) {
        const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
        let tagName = xmlData.substring(i + 2, closeIndex).trim();
        if (options.removeNSPrefix) {
          const colonIndex = tagName.indexOf(":");
          if (colonIndex !== -1) {
            tagName = tagName.substr(colonIndex + 1);
          }
        }
        tagName = transformTagName(options.transformTagName, tagName, "", options).tagName;
        if (currentNode) {
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        }
        const lastTagName = this.matcher.getCurrentTag();
        if (tagName && options.unpairedTagsSet.has(tagName)) {
          throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
        }
        if (lastTagName && options.unpairedTagsSet.has(lastTagName)) {
          this.matcher.pop();
          this.tagsNodeStack.pop();
        }
        this.matcher.pop();
        this.isCurrentNodeStopNode = false;
        currentNode = this.tagsNodeStack.pop();
        textData = "";
        i = closeIndex;
      } else if (c1 === 63) {
        let tagData = readTagExp(xmlData, i, false, "?>");
        if (!tagData) throw new Error("Pi Tag is not closed.");
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        const attsMap = this.buildAttributesMap(tagData.tagExp, this.matcher, tagData.tagName, true);
        if (attsMap) {
          const ver = attsMap[this.options.attributeNamePrefix + "version"];
          this.entityDecoder.setXmlVersion(Number(ver) || 1);
        }
        if (options.ignoreDeclaration && tagData.tagName === "?xml" || options.ignorePiTags) {
        } else {
          const childNode = new XmlNode(tagData.tagName);
          childNode.add(options.textNodeName, "");
          if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent && options.ignoreAttributes !== true) {
            childNode[":@"] = attsMap;
          }
          this.addChild(currentNode, childNode, this.readonlyMatcher, i);
        }
        i = tagData.closeIndex + 1;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) {
        const endIndex = findClosingIndex(xmlData, "-->", i + 4, "Comment is not closed.");
        if (options.commentPropName) {
          const comment = xmlData.substring(i + 4, endIndex - 2);
          textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
          currentNode.add(options.commentPropName, [{ [options.textNodeName]: comment }]);
        }
        i = endIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 68) {
        const result = docTypeReader.readDocType(xmlData, i);
        this.entityDecoder.addInputEntities(result.entities);
        i = result.i;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
        const tagExp = xmlData.substring(i + 9, closeIndex);
        textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher);
        let val = this.parseTextData(tagExp, currentNode.tagname, this.readonlyMatcher, true, false, true, true);
        if (val == void 0) val = "";
        if (options.cdataPropName) {
          currentNode.add(options.cdataPropName, [{ [options.textNodeName]: tagExp }]);
        } else {
          currentNode.add(options.textNodeName, val);
        }
        i = closeIndex + 2;
      } else {
        let result = readTagExp(xmlData, i, options.removeNSPrefix);
        if (!result) {
          const context = xmlData.substring(Math.max(0, i - 50), Math.min(xmlLen, i + 50));
          throw new Error(`readTagExp returned undefined at position ${i}. Context: "${context}"`);
        }
        let tagName = result.tagName;
        const rawTagName = result.rawTagName;
        let tagExp = result.tagExp;
        let attrExpPresent = result.attrExpPresent;
        let closeIndex = result.closeIndex;
        ({ tagName, tagExp } = transformTagName(options.transformTagName, tagName, tagExp, options));
        if (options.strictReservedNames && (tagName === options.commentPropName || tagName === options.cdataPropName || tagName === options.textNodeName || tagName === options.attributesGroupName)) {
          throw new Error(`Invalid tag name: ${tagName}`);
        }
        if (currentNode && textData) {
          if (currentNode.tagname !== "!xml") {
            textData = this.saveTextToParentTag(textData, currentNode, this.readonlyMatcher, false);
          }
        }
        const lastTag = currentNode;
        if (lastTag && options.unpairedTagsSet.has(lastTag.tagname)) {
          currentNode = this.tagsNodeStack.pop();
          this.matcher.pop();
        }
        let isSelfClosing = false;
        if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
          isSelfClosing = true;
          if (tagName[tagName.length - 1] === "/") {
            tagName = tagName.substr(0, tagName.length - 1);
            tagExp = tagName;
          } else {
            tagExp = tagExp.substr(0, tagExp.length - 1);
          }
          attrExpPresent = tagName !== tagExp;
        }
        let prefixedAttrs = null;
        let rawAttrs = {};
        let namespace = void 0;
        namespace = extractNamespace(rawTagName);
        if (tagName !== xmlObj.tagname) {
          this.matcher.push(tagName, {}, namespace);
        }
        if (tagName !== tagExp && attrExpPresent) {
          prefixedAttrs = this.buildAttributesMap(tagExp, this.matcher, tagName);
          if (prefixedAttrs) {
            rawAttrs = extractRawAttributes(prefixedAttrs, options);
          }
        }
        if (tagName !== xmlObj.tagname) {
          this.isCurrentNodeStopNode = this.isItStopNode();
        }
        const startIndex = i;
        if (this.isCurrentNodeStopNode) {
          let tagContent = "";
          if (isSelfClosing) {
            i = result.closeIndex;
          } else if (options.unpairedTagsSet.has(tagName)) {
            i = result.closeIndex;
          } else {
            const result2 = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
            if (!result2) throw new Error(`Unexpected end of ${rawTagName}`);
            i = result2.i;
            tagContent = result2.tagContent;
          }
          const childNode = new XmlNode(tagName);
          if (prefixedAttrs) {
            childNode[":@"] = prefixedAttrs;
          }
          childNode.add(options.textNodeName, tagContent);
          this.matcher.pop();
          this.isCurrentNodeStopNode = false;
          this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
        } else {
          if (isSelfClosing) {
            ({ tagName, tagExp } = transformTagName(options.transformTagName, tagName, tagExp, options));
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
          } else if (options.unpairedTagsSet.has(tagName)) {
            const childNode = new XmlNode(tagName);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            this.matcher.pop();
            this.isCurrentNodeStopNode = false;
            i = result.closeIndex;
            continue;
          } else {
            const childNode = new XmlNode(tagName);
            if (this.tagsNodeStack.length > options.maxNestedTags) {
              throw new Error("Maximum nested tags exceeded");
            }
            this.tagsNodeStack.push(currentNode);
            if (prefixedAttrs) {
              childNode[":@"] = prefixedAttrs;
            }
            this.addChild(currentNode, childNode, this.readonlyMatcher, startIndex);
            currentNode = childNode;
          }
          textData = "";
          i = closeIndex;
        }
      }
    } else {
      textData += xmlData[i];
    }
  }
  return xmlObj.child;
};
function addChild(currentNode, childNode, matcher, startIndex) {
  if (!this.options.captureMetaData) startIndex = void 0;
  const jPathOrMatcher = this.options.jPath ? matcher.toString() : matcher;
  const result = this.options.updateTag(childNode.tagname, jPathOrMatcher, childNode[":@"]);
  if (result === false) {
  } else if (typeof result === "string") {
    childNode.tagname = result;
    currentNode.addChild(childNode, startIndex);
  } else {
    currentNode.addChild(childNode, startIndex);
  }
}
function replaceEntitiesValue(val, tagName, jPath) {
  const entityConfig = this.options.processEntities;
  if (!entityConfig || !entityConfig.enabled) {
    return val;
  }
  if (entityConfig.allowedTags) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    const allowed = Array.isArray(entityConfig.allowedTags) ? entityConfig.allowedTags.includes(tagName) : entityConfig.allowedTags(tagName, jPathOrMatcher);
    if (!allowed) {
      return val;
    }
  }
  if (entityConfig.tagFilter) {
    const jPathOrMatcher = this.options.jPath ? jPath.toString() : jPath;
    if (!entityConfig.tagFilter(tagName, jPathOrMatcher)) {
      return val;
    }
  }
  return this.entityDecoder.decode(val);
}
function saveTextToParentTag(textData, parentNode, matcher, isLeafNode) {
  if (textData) {
    if (isLeafNode === void 0) isLeafNode = parentNode.child.length === 0;
    textData = this.parseTextData(
      textData,
      parentNode.tagname,
      matcher,
      false,
      parentNode[":@"] ? Object.keys(parentNode[":@"]).length !== 0 : false,
      isLeafNode
    );
    if (textData !== void 0 && textData !== "")
      parentNode.add(this.options.textNodeName, textData);
    textData = "";
  }
  return textData;
}
function isItStopNode() {
  if (this.stopNodeExpressionsSet.size === 0) return false;
  return this.matcher.matchesAny(this.stopNodeExpressionsSet);
}
function tagExpWithClosingIndex(xmlData, i, closingChar = ">") {
  let attrBoundary = 0;
  const len = xmlData.length;
  const closeCode0 = closingChar.charCodeAt(0);
  const closeCode1 = closingChar.length > 1 ? closingChar.charCodeAt(1) : -1;
  let result = "";
  let segmentStart = i;
  for (let index = i; index < len; index++) {
    const code = xmlData.charCodeAt(index);
    if (attrBoundary) {
      if (code === attrBoundary) attrBoundary = 0;
    } else if (code === 34 || code === 39) {
      attrBoundary = code;
    } else if (code === closeCode0) {
      if (closeCode1 !== -1) {
        if (xmlData.charCodeAt(index + 1) === closeCode1) {
          result += xmlData.substring(segmentStart, index);
          return { data: result, index };
        }
      } else {
        result += xmlData.substring(segmentStart, index);
        return { data: result, index };
      }
    } else if (code === 9 && !attrBoundary) {
      result += xmlData.substring(segmentStart, index) + " ";
      segmentStart = index + 1;
    }
  }
}
function findClosingIndex(xmlData, str2, i, errMsg) {
  const closingIndex = xmlData.indexOf(str2, i);
  if (closingIndex === -1) {
    throw new Error(errMsg);
  } else {
    return closingIndex + str2.length - 1;
  }
}
function findClosingChar(xmlData, char, i, errMsg) {
  const closingIndex = xmlData.indexOf(char, i);
  if (closingIndex === -1) throw new Error(errMsg);
  return closingIndex;
}
function readTagExp(xmlData, i, removeNSPrefix, closingChar = ">") {
  const result = tagExpWithClosingIndex(xmlData, i + 1, closingChar);
  if (!result) return;
  let tagExp = result.data;
  const closeIndex = result.index;
  const separatorIndex = tagExp.search(/\s/);
  let tagName = tagExp;
  let attrExpPresent = true;
  if (separatorIndex !== -1) {
    tagName = tagExp.substring(0, separatorIndex);
    tagExp = tagExp.substring(separatorIndex + 1).trimStart();
  }
  const rawTagName = tagName;
  if (removeNSPrefix) {
    const colonIndex = tagName.indexOf(":");
    if (colonIndex !== -1) {
      tagName = tagName.substr(colonIndex + 1);
      attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
    }
  }
  return {
    tagName,
    tagExp,
    closeIndex,
    attrExpPresent,
    rawTagName
  };
}
function readStopNodeData(xmlData, tagName, i) {
  const startIndex = i;
  let openTagCount = 1;
  const xmllen = xmlData.length;
  for (; i < xmllen; i++) {
    if (xmlData[i] === "<") {
      const c1 = xmlData.charCodeAt(i + 1);
      if (c1 === 47) {
        const closeIndex = findClosingChar(xmlData, ">", i, `${tagName} is not closed`);
        let closeTagName = xmlData.substring(i + 2, closeIndex).trim();
        if (closeTagName === tagName) {
          openTagCount--;
          if (openTagCount === 0) {
            return {
              tagContent: xmlData.substring(startIndex, i),
              i: closeIndex
            };
          }
        }
        i = closeIndex;
      } else if (c1 === 63) {
        const closeIndex = findClosingIndex(xmlData, "?>", i + 1, "StopNode is not closed.");
        i = closeIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 45 && xmlData.charCodeAt(i + 3) === 45) {
        const closeIndex = findClosingIndex(xmlData, "-->", i + 3, "StopNode is not closed.");
        i = closeIndex;
      } else if (c1 === 33 && xmlData.charCodeAt(i + 2) === 91) {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
        i = closeIndex;
      } else {
        const tagData = readTagExp(xmlData, i, false);
        if (tagData) {
          const openTagName = tagData && tagData.tagName;
          if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") {
            openTagCount++;
          }
          i = tagData.closeIndex;
        }
      }
    }
  }
}
function parseValue(val, shouldParse, options) {
  if (shouldParse && typeof val === "string") {
    const newval = val.trim();
    if (newval === "true") return true;
    else if (newval === "false") return false;
    else return toNumber(val, options);
  } else {
    if (isExist(val)) {
      return val;
    } else {
      return "";
    }
  }
}
function transformTagName(fn, tagName, tagExp, options) {
  if (fn) {
    const newTagName = fn(tagName);
    if (tagExp === tagName) {
      tagExp = newTagName;
    }
    tagName = newTagName;
  }
  tagName = sanitizeName(tagName, options);
  return { tagName, tagExp };
}
function sanitizeName(name, options) {
  if (criticalProperties.includes(name)) {
    throw new Error(`[SECURITY] Invalid name: "${name}" is a reserved JavaScript keyword that could cause prototype pollution`);
  } else if (DANGEROUS_PROPERTY_NAMES.includes(name)) {
    return options.onDangerousProperty(name);
  }
  return name;
}

// ../../node_modules/fast-xml-parser/src/xmlparser/node2json.js
var METADATA_SYMBOL2 = XmlNode.getMetaDataSymbol();
function stripAttributePrefix(attrs, prefix) {
  if (!attrs || typeof attrs !== "object") return {};
  if (!prefix) return attrs;
  const rawAttrs = {};
  for (const key in attrs) {
    if (key.startsWith(prefix)) {
      const rawName = key.substring(prefix.length);
      rawAttrs[rawName] = attrs[key];
    } else {
      rawAttrs[key] = attrs[key];
    }
  }
  return rawAttrs;
}
function prettify(node, options, matcher, readonlyMatcher) {
  return compress(node, options, matcher, readonlyMatcher);
}
function compress(arr, options, matcher, readonlyMatcher) {
  let text;
  const compressedObj = {};
  for (let i = 0; i < arr.length; i++) {
    const tagObj = arr[i];
    const property = propName(tagObj);
    if (property !== void 0 && property !== options.textNodeName) {
      const rawAttrs = stripAttributePrefix(
        tagObj[":@"] || {},
        options.attributeNamePrefix
      );
      matcher.push(property, rawAttrs);
    }
    if (property === options.textNodeName) {
      if (text === void 0) text = tagObj[property];
      else text += "" + tagObj[property];
    } else if (property === void 0) {
      continue;
    } else if (tagObj[property]) {
      let val = compress(tagObj[property], options, matcher, readonlyMatcher);
      const isLeaf = isLeafTag(val, options);
      if (Object.keys(val).length === 0 && options.alwaysCreateTextNode) {
        val[options.textNodeName] = "";
      }
      if (tagObj[":@"]) {
        assignAttributes(val, tagObj[":@"], readonlyMatcher, options);
      } else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) {
        val = val[options.textNodeName];
      } else if (Object.keys(val).length === 0) {
        if (options.alwaysCreateTextNode) val[options.textNodeName] = "";
        else val = "";
      }
      if (tagObj[METADATA_SYMBOL2] !== void 0 && typeof val === "object" && val !== null) {
        val[METADATA_SYMBOL2] = tagObj[METADATA_SYMBOL2];
      }
      if (compressedObj[property] !== void 0 && Object.prototype.hasOwnProperty.call(compressedObj, property)) {
        if (!Array.isArray(compressedObj[property])) {
          compressedObj[property] = [compressedObj[property]];
        }
        compressedObj[property].push(val);
      } else {
        const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() : readonlyMatcher;
        if (options.isArray(property, jPathOrMatcher, isLeaf)) {
          compressedObj[property] = [val];
        } else {
          compressedObj[property] = val;
        }
      }
      if (property !== void 0 && property !== options.textNodeName) {
        matcher.pop();
      }
    }
  }
  if (typeof text === "string") {
    if (text.length > 0) compressedObj[options.textNodeName] = text;
  } else if (text !== void 0) compressedObj[options.textNodeName] = text;
  return compressedObj;
}
function propName(obj) {
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (key !== ":@") return key;
  }
}
function assignAttributes(obj, attrMap, readonlyMatcher, options) {
  if (attrMap) {
    const keys = Object.keys(attrMap);
    const len = keys.length;
    for (let i = 0; i < len; i++) {
      const atrrName = keys[i];
      const rawAttrName = atrrName.startsWith(options.attributeNamePrefix) ? atrrName.substring(options.attributeNamePrefix.length) : atrrName;
      const jPathOrMatcher = options.jPath ? readonlyMatcher.toString() + "." + rawAttrName : readonlyMatcher;
      if (options.isArray(atrrName, jPathOrMatcher, true, true)) {
        obj[atrrName] = [attrMap[atrrName]];
      } else {
        obj[atrrName] = attrMap[atrrName];
      }
    }
  }
}
function isLeafTag(obj, options) {
  const { textNodeName } = options;
  const propCount = Object.keys(obj).length;
  if (propCount === 0) {
    return true;
  }
  if (propCount === 1 && (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)) {
    return true;
  }
  return false;
}

// ../../node_modules/fast-xml-parser/src/xmlparser/XMLParser.js
var XMLParser = class {
  constructor(options) {
    this.externalEntities = {};
    this.options = buildOptions(options);
  }
  /**
   * Parse XML dats to JS object 
   * @param {string|Uint8Array} xmlData 
   * @param {boolean|Object} validationOption 
   */
  parse(xmlData, validationOption) {
    if (typeof xmlData !== "string" && xmlData.toString) {
      xmlData = xmlData.toString();
    } else if (typeof xmlData !== "string") {
      throw new Error("XML data is accepted in String or Bytes[] form.");
    }
    if (validationOption) {
      if (validationOption === true) validationOption = {};
      const result = validate(xmlData, validationOption);
      if (result !== true) {
        throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
      }
    }
    const orderedObjParser = new OrderedObjParser(this.options, this.externalEntities);
    const orderedResult = orderedObjParser.parseXml(xmlData);
    if (this.options.preserveOrder || orderedResult === void 0) return orderedResult;
    else return prettify(orderedResult, this.options, orderedObjParser.matcher, orderedObjParser.readonlyMatcher);
  }
  /**
   * Add Entity which is not by default supported by this library
   * @param {string} key 
   * @param {string} value 
   */
  addEntity(key, value) {
    if (value.indexOf("&") !== -1) {
      throw new Error("Entity value can't have '&'");
    } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
      throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
    } else if (value === "&") {
      throw new Error("An entity with value '&' is not permitted");
    } else {
      this.externalEntities[key] = value;
    }
  }
  /**
   * Returns a Symbol that can be used to access the metadata
   * property on a node.
   * 
   * If Symbol is not available in the environment, an ordinary property is used
   * and the name of the property is here returned.
   * 
   * The XMLMetaData property is only present when `captureMetaData`
   * is true in the options.
   */
  static getMetaDataSymbol() {
    return XmlNode.getMetaDataSymbol();
  }
};

// ../../node_modules/fast-xml-parser/src/fxp.js
var XMLValidator = {
  validate
};

// ../../src/lib/parsers.ts
var parseYAML = (str2) => {
  try {
    const parsed = jsYaml.load(str2);
    if (parsed === null || parsed === void 0) return {};
    if (typeof parsed !== "object" || Array.isArray(parsed)) {
      return { value: parsed };
    }
    const result = parsed;
    if ("_parseError" in result) return {};
    return result;
  } catch {
    return null;
  }
};
var coerceNumbers = (obj, depth = 0) => {
  if (depth > 50) return obj;
  if (Array.isArray(obj)) return obj.map((v) => coerceNumbers(v, depth + 1));
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, coerceNumbers(v, depth + 1)])
    );
  }
  if (typeof obj === "string" && obj.trim() !== "" && !isNaN(Number(obj))) {
    return Number(obj);
  }
  return obj;
};
var stripAttrPrefix = (obj, depth = 0) => {
  if (depth > 50) return obj;
  if (Array.isArray(obj)) return obj.map((v) => stripAttrPrefix(v, depth + 1));
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [
        k.startsWith("@_") ? k.slice(2) : k,
        stripAttrPrefix(v, depth + 1)
      ])
    );
  }
  return obj;
};
var parseXML = (str2) => {
  try {
    if (XMLValidator.validate(str2) !== true) return null;
    const parser = new XMLParser({
      ignoreAttributes: false,
      // preserve attributes (e.g. id="1")
      attributeNamePrefix: "@_",
      // attributes prefixed with @_
      allowBooleanAttributes: true,
      parseAttributeValue: true,
      // auto-cast attribute values
      parseTagValue: true,
      // auto-cast tag text content
      trimValues: true,
      cdataPropName: "__cdata"
    });
    const raw = parser.parse(str2);
    return stripAttrPrefix(coerceNumbers(raw));
  } catch {
    return null;
  }
};
var parseCurl = (curl) => {
  const joinedCurl = curl.replace(/\\\s*\n\s*/g, " ").trim();
  const cleanCurl = joinedCurl.replace(/\s+/g, " ").trim();
  let method = "GET";
  const methodMatch = cleanCurl.match(/(?:-X|--request)\s+(\w+)/i);
  if (methodMatch) {
    method = methodMatch[1].toUpperCase();
  } else if (/(?:-d|--data|--data-raw|--data-binary)\s*\S/.test(cleanCurl)) {
    method = "POST";
  }
  let url = "";
  const urlMatch = cleanCurl.match(/(?:https?:\/\/[^\s'"]+)/);
  if (urlMatch) {
    url = urlMatch[0];
  }
  const headers = {};
  const headerMatches = cleanCurl.matchAll(/(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)")/gi);
  for (const m of headerMatches) {
    const headerStr = m[1] || m[2];
    if (headerStr) {
      const firstColon = headerStr.indexOf(":");
      if (firstColon !== -1) {
        const k = headerStr.slice(0, firstColon).trim();
        const v = headerStr.slice(firstColon + 1).trim();
        headers[k] = v;
      }
    }
  }
  let body = "";
  let bodyJson = null;
  const bodySingleMatch = cleanCurl.match(/(?:-d|--data|--data-raw|--data-binary)\s*'((?:[^'\\]|\\.)*)'/i) || joinedCurl.match(/(?:-d|--data|--data-raw|--data-binary)\s*'((?:[^'\\]|\\.)*)'/i);
  const bodyDoubleMatch = cleanCurl.match(/(?:-d|--data|--data-raw|--data-binary)\s*"((?:[^"\\]|\\.)*)"/i) || joinedCurl.match(/(?:-d|--data|--data-raw|--data-binary)\s*"((?:[^"\\]|\\.)*)"/i);
  const bodyUnquotedMatch = cleanCurl.match(
    /(?:-d|--data|--data-raw|--data-binary)\s+(\S+(?:\s+(?!-[a-zA-Z])\S+)*)/i
  );
  if (bodySingleMatch) {
    body = bodySingleMatch[1];
  } else if (bodyDoubleMatch) {
    body = bodyDoubleMatch[1].replace(/\\"/g, '"');
  } else if (bodyUnquotedMatch) {
    body = bodyUnquotedMatch[1];
  }
  if (body) {
    try {
      const unescapedBody = body.replace(/\\'/g, "'");
      bodyJson = JSON.parse(unescapedBody);
    } catch {
      try {
        const unescapedBody = body.replace(/\\'/g, "'").replace(/\\"/g, '"');
        bodyJson = JSON.parse(unescapedBody);
      } catch {
      }
    }
  }
  return { method, url, headers, body, bodyJson };
};
var parseEnvFile = (str2) => {
  const fields = {};
  let count = 0;
  for (const line of str2.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx < 1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let rawValue = trimmed.slice(eqIdx + 1).trim();
    rawValue = rawValue.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    let schema2;
    if (rawValue === "true" || rawValue === "false") {
      schema2 = { type: "boolean" };
    } else if (/^\d+$/.test(rawValue) && rawValue.length > 0) {
      schema2 = { type: "number", format: "int" };
    } else if (/^\d+\.\d+$/.test(rawValue)) {
      schema2 = { type: "number", format: "float" };
    } else if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(rawValue)) {
      schema2 = { type: "string", format: "url" };
    } else if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawValue)) {
      schema2 = { type: "string", format: "email" };
    } else if (rawValue === "") {
      schema2 = { type: "string", optional: true };
    } else {
      schema2 = { type: "string" };
    }
    fields[key] = schema2;
    count++;
  }
  if (count === 0) return null;
  const result = { type: "object", fields };
  result._isTypeMorphSchema = true;
  return result;
};

// ../../src/lib/analytics.ts
function gtagEvent(event, params) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
}
function trackInferenceFallback(reason, params) {
  gtagEvent("infer_worker_fallback", { reason, ...params });
}
function trackInferenceError(reason, params) {
  gtagEvent("infer_error", { reason, ...params });
}
function trackUnsupportedOutputTarget(target, requested) {
  gtagEvent("infer_unsupported_output", {
    target,
    requested
  });
}

// ../../src/lib/openapi-parser.ts
function isOpenAPISpec(obj) {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return false;
  const o = obj;
  const oaStr = String(o.openapi ?? "");
  const swStr = String(o.swagger ?? "");
  const isV3 = o.openapi !== void 0 && oaStr.startsWith("3");
  const isV2 = o.swagger !== void 0 && swStr.startsWith("2");
  return (isV3 || isV2) && !!(o.info || o.paths || o.components || o.definitions);
}
function parseOpenAPIComponents(spec) {
  const isV3 = typeof spec.openapi === "string" || typeof spec.openapi === "number";
  const rawSchemas = isV3 ? spec.components?.schemas ?? {} : spec.definitions ?? {};
  const inProgress = /* @__PURE__ */ new Set();
  function resolveRef(ref) {
    if (!ref.startsWith("#/")) return null;
    const parts = ref.slice(2).split("/");
    let node = spec;
    for (const p of parts) {
      if (node === void 0 || node === null) return null;
      node = node[p.replace(/~1/g, "/").replace(/~0/g, "~")];
    }
    return node ?? null;
  }
  function refComponentName(ref) {
    return ref.split("/").pop() ?? "";
  }
  function convert(raw, depth = 0, inline = false) {
    if (depth > 20 || !raw || typeof raw !== "object") return { type: "any" };
    if (typeof raw.$ref === "string") {
      const compName = refComponentName(raw.$ref);
      if (!inline && rawSchemas[compName] !== void 0) {
        return { type: "object", _sharedTypeName: compName };
      }
      if (inProgress.has(compName)) return { type: "any" };
      const refRaw = resolveRef(raw.$ref);
      if (!refRaw) return { type: "any" };
      return convert(refRaw, depth + 1, inline);
    }
    if (Array.isArray(raw.allOf)) {
      const merged = { type: "object", fields: {} };
      for (const sub of raw.allOf) {
        const s = convert(sub, depth + 1, true);
        if (s.type === "object" && s.fields) Object.assign(merged.fields, s.fields);
      }
      return merged;
    }
    if (Array.isArray(raw.anyOf) || Array.isArray(raw.oneOf)) {
      const variants = (raw.anyOf ?? raw.oneOf).map((s) => convert(s, depth + 1));
      const types2 = [...new Set(variants.map((v) => v.type))];
      if (types2.length === 1) return variants[0];
      return { type: "union", unionTypes: types2 };
    }
    const oaType = typeof raw.type === "string" ? raw.type : "";
    const required = Array.isArray(raw.required) ? raw.required : [];
    if (oaType === "object" || !oaType && raw.properties) {
      const fields = {};
      for (const [k, v] of Object.entries(raw.properties ?? {})) {
        const fs = convert(v, depth + 1);
        if (!required.includes(k)) fs.optional = true;
        if (v.nullable === true) fs.nullable = true;
        fields[k] = fs;
      }
      return { type: "object", fields };
    }
    if (oaType === "array") {
      const itemSchema = raw.items ? convert(raw.items, depth + 1) : { type: "any" };
      return { type: "array", itemType: itemSchema };
    }
    if (oaType === "string") {
      const s = { type: "string" };
      if (Array.isArray(raw.enum)) s.enumValues = raw.enum.map(String);
      const fmt = raw.format ?? "";
      if (fmt === "date-time") s.format = "datetime";
      else if (fmt === "date") s.format = "date";
      else if (fmt === "email") s.format = "email";
      else if (fmt === "uri" || fmt === "url") s.format = "url";
      else if (fmt === "uuid") s.format = "uuid";
      return s;
    }
    if (oaType === "integer") return { type: "number", format: "int" };
    if (oaType === "number") {
      const s = { type: "number" };
      if (raw.format === "float" || raw.format === "double") s.format = "float";
      return s;
    }
    if (oaType === "boolean") return { type: "boolean" };
    return { type: "any" };
  }
  const result = [];
  for (const [name, raw] of Object.entries(rawSchemas)) {
    inProgress.add(name);
    const schema2 = convert(raw);
    inProgress.delete(name);
    schema2._isTypeMorphSchema = true;
    result.push({ name, schema: schema2 });
  }
  return result;
}

// ../../src/lib/jsonschema-parser.ts
function isJSONSchema(obj) {
  if (typeof obj !== "object" || obj === null || Array.isArray(obj)) return false;
  const o = obj;
  const s = String(o.$schema ?? "");
  return s.includes("json-schema.org") || /^https?:\/\/.*\/schema/.test(s);
}
function parseJSONSchema(root) {
  const defs = root.$defs ?? root.definitions ?? {};
  function resolveRef(ref) {
    if (!ref.startsWith("#/")) return null;
    const parts = ref.slice(2).split("/");
    let node = root;
    for (const p of parts) {
      if (node == null) return null;
      node = node[p.replace(/~1/g, "/").replace(/~0/g, "~")];
    }
    return node ?? null;
  }
  function defName(ref) {
    return ref.split("/").pop() ?? "";
  }
  function convert(raw, depth = 0, inline = false) {
    if (depth > 20 || !raw || typeof raw !== "object") return { type: "any" };
    if (typeof raw.$ref === "string") {
      const name = defName(raw.$ref);
      if (!inline && defs[name] !== void 0) {
        return { type: "object", _sharedTypeName: name };
      }
      const resolved = resolveRef(raw.$ref);
      if (!resolved) return { type: "any" };
      return convert(resolved, depth + 1, inline);
    }
    if (Array.isArray(raw.allOf)) {
      const merged = { type: "object", fields: {} };
      for (const sub of raw.allOf) {
        const s = convert(sub, depth + 1, true);
        if (s.type === "object" && s.fields) Object.assign(merged.fields, s.fields);
      }
      if (raw.properties) {
        const req = Array.isArray(raw.required) ? raw.required : [];
        for (const [k, v] of Object.entries(raw.properties)) {
          const fs = convert(v, depth + 1);
          if (!req.includes(k)) fs.optional = true;
          merged.fields[k] = fs;
        }
      }
      return merged;
    }
    if (Array.isArray(raw.anyOf) || Array.isArray(raw.oneOf)) {
      const variants = raw.anyOf ?? raw.oneOf;
      const nonNull = variants.filter((v) => v.type !== "null" && !(typeof v.$ref === "string" && v.$ref === "#"));
      if (nonNull.length === 1) {
        const s = convert(nonNull[0], depth + 1, inline);
        if (nonNull.length < variants.length) s.nullable = true;
        return s;
      }
      const converted = nonNull.map((v) => convert(v, depth + 1));
      const types2 = [...new Set(converted.map((v) => v.type))];
      const result2 = types2.length === 1 ? converted[0] : { type: "union", unionTypes: types2 };
      if (nonNull.length < variants.length) result2.nullable = true;
      return result2;
    }
    let rawType = raw.type;
    let nullable = false;
    if (Array.isArray(rawType)) {
      const withoutNull = rawType.filter((t) => t !== "null");
      nullable = withoutNull.length < rawType.length;
      rawType = withoutNull[0] ?? "any";
    }
    const jsType = typeof rawType === "string" ? rawType : "";
    const required = Array.isArray(raw.required) ? raw.required : [];
    if (raw.const !== void 0) {
      const t = typeof raw.const;
      if (t === "string") return { type: "string", enumValues: [String(raw.const)] };
      if (t === "number") return { type: "number" };
      if (t === "boolean") return { type: "boolean" };
    }
    if (Array.isArray(raw.enum)) {
      const nonNullEnums = raw.enum.filter((e) => e !== null);
      const s = { type: "string", enumValues: nonNullEnums.map(String) };
      if (nonNullEnums.length < raw.enum.length) s.nullable = true;
      return s;
    }
    if (jsType === "object" || !jsType && raw.properties) {
      const fields = {};
      for (const [k, v] of Object.entries(raw.properties ?? {})) {
        const fs = convert(v, depth + 1);
        if (!required.includes(k)) fs.optional = true;
        fields[k] = fs;
      }
      const s = { type: "object", fields };
      if (nullable) s.nullable = true;
      return s;
    }
    if (jsType === "array") {
      const items = Array.isArray(raw.items) ? raw.items[0] : raw.items;
      const itemSchema = items ? convert(items, depth + 1) : { type: "any" };
      const s = { type: "array", itemType: itemSchema };
      if (nullable) s.nullable = true;
      return s;
    }
    if (jsType === "string") {
      const s = { type: "string" };
      const fmt = raw.format ?? "";
      if (fmt === "date-time") s.format = "datetime";
      else if (fmt === "date") s.format = "date";
      else if (fmt === "email") s.format = "email";
      else if (fmt === "uri" || fmt === "url") s.format = "url";
      else if (fmt === "uuid") s.format = "uuid";
      if (nullable) s.nullable = true;
      return s;
    }
    if (jsType === "integer") return { type: "number", format: "int", ...nullable ? { nullable } : {} };
    if (jsType === "number") return { type: "number", ...nullable ? { nullable } : {} };
    if (jsType === "boolean") return { type: "boolean", ...nullable ? { nullable } : {} };
    return { type: "any" };
  }
  const result = [];
  for (const [name, raw] of Object.entries(defs)) {
    const schema2 = convert(raw);
    schema2._isTypeMorphSchema = true;
    result.push({ name, schema: schema2 });
  }
  const hasStructure = root.type || root.properties || root.allOf || root.anyOf || root.oneOf || root.items;
  if (hasStructure) {
    const rootName = root.title ?? "Root";
    if (!result.find((r) => r.name === rootName)) {
      const schema2 = convert(root);
      schema2._isTypeMorphSchema = true;
      result.unshift({ name: rootName, schema: schema2 });
    }
  }
  return result;
}

// ../../src/lib/recursive.ts
function objectFieldNames(s) {
  if (s.type !== "object" || !s.fields) return null;
  return Object.keys(s.fields).sort();
}
function similarity(a, b) {
  if (a.length === 0 && b.length === 0) return 1;
  const setA = new Set(a);
  const intersection = b.filter((k) => setA.has(k)).length;
  const union = (/* @__PURE__ */ new Set([...a, ...b])).size;
  return union === 0 ? 0 : intersection / union;
}
function detectRecursiveTypes(schema2, rootName) {
  const [anchor, anchorName] = schema2.type === "array" && schema2.itemType?.type === "object" ? [schema2.itemType, `${rootName}Item`] : schema2.type === "object" ? [schema2, rootName] : [null, ""];
  if (!anchor || anchor.type !== "object" || !anchor.fields) return;
  const anchorFields = objectFieldNames(anchor);
  if (!anchorFields || anchorFields.length < 2) return;
  const fields = anchorFields;
  function visit(s, depth) {
    if (depth > 20 || !s) return;
    if (s._sharedTypeName || s._isTypeMorphSchema) return;
    if (s.type === "object" && s.fields && s !== anchor) {
      const candidateFields = objectFieldNames(s);
      if (candidateFields && candidateFields.length >= 1 && similarity(fields, candidateFields) >= 0.65) {
        s._sharedTypeName = anchorName;
        delete s.fields;
        return;
      }
      for (const v of Object.values(s.fields)) visit(v, depth + 1);
    } else if (s.type === "array" && s.itemType) {
      visit(s.itemType, depth + 1);
    }
  }
  for (const v of Object.values(anchor.fields)) {
    visit(v, 1);
  }
}

// ../../src/lib/engine.ts
var PRIMITIVE_TYPES = /* @__PURE__ */ new Set(["string", "number", "boolean"]);
var makeUnion = (a, b) => {
  const aTypes = a.type === "union" ? a.unionTypes ?? [] : [a.type];
  const bTypes = b.type === "union" ? b.unionTypes ?? [] : [b.type];
  const merged = Array.from(/* @__PURE__ */ new Set([...aTypes, ...bTypes]));
  if (merged.length === 1) return { type: merged[0] };
  return { type: "union", unionTypes: merged };
};
var MAX_DEPTH = 20;
var mergeSchemas = (s1, s2, depth = 0) => {
  if (depth > MAX_DEPTH) return { type: "any" };
  if (!s1) return s2;
  if (!s2) return s1;
  const optional = s1.optional || s2.optional;
  const nullable = s1.nullable || s2.nullable;
  if (s1.type === "any") return { ...s2, optional, nullable };
  if (s2.type === "any") return { ...s1, optional, nullable };
  if (s1.type !== s2.type) {
    if (PRIMITIVE_TYPES.has(s1.type) && PRIMITIVE_TYPES.has(s2.type)) {
      return { ...makeUnion(s1, s2), optional, nullable };
    }
    if (s1.type === "union" || s2.type === "union") {
      const otherType = s1.type === "union" ? s2.type : s1.type;
      if (otherType === "union" || PRIMITIVE_TYPES.has(otherType)) {
        return { ...makeUnion(s1, s2), optional, nullable };
      }
    }
    return { type: "any", optional, nullable };
  }
  if (s1.type === "union") {
    return { ...makeUnion(s1, s2), optional, nullable };
  }
  if (s1.type === "number" && s2.type === "number") {
    const format = s1.format === "float" || s2.format === "float" ? "float" : "int";
    return { ...s1, optional, nullable, format };
  }
  if (s1.type === "string" && s2.type === "string") {
    let enumValues = void 0;
    if (s1.enumValues || s2.enumValues) {
      const mergedEnum = Array.from(/* @__PURE__ */ new Set([...s1.enumValues ?? [], ...s2.enumValues ?? []]));
      if (mergedEnum.length <= 6) {
        enumValues = mergedEnum;
      }
    }
    if (s1.format === s2.format) {
      return { ...s1, optional, nullable, enumValues };
    }
    return { type: "string", optional, nullable, enumValues };
  }
  if (s1.type === "object" && s2.type === "object") {
    const s1Fields = s1.fields ?? {};
    const s2Fields = s2.fields ?? {};
    const allKeys = /* @__PURE__ */ new Set([...Object.keys(s1Fields), ...Object.keys(s2Fields)]);
    const fields = {};
    for (const k of allKeys) {
      const inS1 = k in s1Fields;
      const inS2 = k in s2Fields;
      if (inS1 && inS2) {
        fields[k] = mergeSchemas(s1Fields[k], s2Fields[k], depth + 1);
      } else if (inS1) {
        fields[k] = { ...s1Fields[k], optional: true };
      } else {
        fields[k] = { ...s2Fields[k], optional: true };
      }
    }
    return { type: "object", fields, optional, nullable };
  }
  if (s1.type === "array" && s2.type === "array") {
    return {
      type: "array",
      itemType: mergeSchemas(s1.itemType, s2.itemType, depth + 1),
      optional,
      nullable
    };
  }
  return { ...s1, optional, nullable };
};
var getFieldStringValues = (arr) => {
  const result = {};
  for (const item of arr) {
    if (item && typeof item === "object" && !Array.isArray(item)) {
      for (const [k, v] of Object.entries(item)) {
        if (typeof v === "string") {
          if (!result[k]) result[k] = [];
          result[k].push(v);
        }
      }
    }
  }
  return result;
};
var enumKeywordsSet = /* @__PURE__ */ new Set([
  // 既存
  "status",
  "type",
  "role",
  "gender",
  "state",
  "category",
  "mode",
  "level",
  "phase",
  "kind",
  "visibility",
  "scope",
  "method",
  "action",
  "currency",
  "priority",
  // 追加
  "tier",
  "plan",
  "severity",
  "permission",
  "provider",
  "platform",
  "environment",
  "locale",
  "theme",
  "layout",
  "variant",
  "direction",
  "alignment",
  "position"
]);
var calcEnumConfidence = (key, values, options) => {
  if (values.length === 0) return 0;
  let score = 0;
  const k = key.toLowerCase();
  const minSamples = options?.enumMinSamples ?? 3;
  const keywordMatch = Array.from(enumKeywordsSet).some((kw) => k.includes(kw));
  if (keywordMatch) {
    score += 0.4;
  }
  const unique = new Set(values);
  const uniqueRatio = unique.size / values.length;
  if (unique.size === 1) {
    score += 0.4;
  } else if (uniqueRatio <= 0.2) {
    score += 0.4;
  } else if (uniqueRatio <= 0.4 && values.length >= minSamples) {
    score += 0.2;
  }
  const maxUnique = options?.enumMaxUnique ?? 6;
  if (unique.size >= 2 && unique.size <= maxUnique) {
    score += 0.25;
  }
  if (values.length >= 10) score += 0.2;
  else if (values.length >= 5) score += 0.1;
  const commonConstants = /* @__PURE__ */ new Set(["yes", "no", "true", "false", "get", "post", "put", "delete", "active", "inactive", "pending", "success", "error", "failed"]);
  if (values.every((v) => commonConstants.has(v.toLowerCase()))) {
    score += values.length >= minSamples ? 0.5 : 0.2;
  }
  return Math.min(score, 1);
};
var isKeyEnum = (key, values, options) => {
  const threshold = options?.enumConfidenceThreshold ?? 0.6;
  return calcEnumConfidence(key, values, options) >= threshold;
};
var applyContextCorrections = (fields) => {
  const keys = Object.keys(fields);
  const hasCurrency = keys.some((k) => /currency|curr/i.test(k));
  if (hasCurrency) {
    for (const k of keys) {
      if (/amount|price|cost|fee|tax|total|subtotal/i.test(k) && fields[k].type === "number") {
        fields[k].format = "float";
      }
    }
  }
  const hasLat = keys.some((k) => /^lat(itude)?$/i.test(k));
  const hasLng = keys.some((k) => /^(lng|lon|longitude)$/i.test(k));
  if (hasLat && hasLng) {
    for (const k of keys) {
      if (/^lat(itude)?$|^(lng|lon|longitude)$/i.test(k) && fields[k].type === "number") {
        fields[k].format = "float";
      }
    }
  }
  const hasTimestamp = keys.some((k) => /created_?at|updated_?at/i.test(k));
  if (hasTimestamp) {
    for (const k of keys) {
      if (/created_?by|updated_?by/i.test(k) && fields[k].type === "string") {
        fields[k].format = "uuid";
      }
    }
  }
};
var inferSchema = (val, keyName, depth = 0, allowedEnumKeys, options) => {
  const maxDepth = options?.maxDepth ?? MAX_DEPTH;
  const addMeta = (s, reason, info) => {
    if (!options?.includeMeta) return s;
    s._meta = { reason, info };
    return s;
  };
  if (depth > maxDepth) return addMeta({ type: "any" }, "max_depth_exceeded");
  if (val === null) return addMeta({ type: "any", nullable: true }, "null_value");
  if (val === void 0) return addMeta({ type: "any", optional: true }, "undefined_value");
  if (Array.isArray(val)) {
    if (val.length === 0) return addMeta({ type: "array", itemType: { type: "any" } }, "empty_array");
    const len = val.length;
    const threshold = options?.arrayLargeThreshold ?? 1e3;
    const sampleCount = options?.arraySampleCount ?? 200;
    const prefixSample = options?.arrayPrefixSample ?? 10;
    const indicesSet = /* @__PURE__ */ new Set();
    if (len <= threshold) {
      for (let i = 0; i < len; i++) indicesSet.add(i);
    } else {
      const prefixCount = Math.min(prefixSample, len);
      for (let i = 0; i < prefixCount; i++) indicesSet.add(i);
      const remaining = Math.max(0, Math.min(sampleCount - prefixCount, len - prefixCount));
      if (remaining > 0) {
        const step = (len - prefixCount) / remaining;
        for (let j = 0; j < remaining; j++) {
          indicesSet.add(Math.min(len - 1, Math.floor(prefixCount + j * step)));
        }
      }
    }
    const sampledItems = Array.from(indicesSet).sort((a, b) => a - b).map((i) => val[i]);
    const allowed = /* @__PURE__ */ new Set();
    const stringFields = getFieldStringValues(sampledItems);
    for (const [k, v] of Object.entries(stringFields)) {
      if (isKeyEnum(k, v, options)) {
        allowed.add(k);
      }
    }
    let itemType = inferSchema(sampledItems[0], void 0, depth + 1, allowed, options);
    for (let si = 1; si < sampledItems.length; si++) {
      itemType = mergeSchemas(itemType, inferSchema(sampledItems[si], void 0, depth + 1, allowed, options), depth + 1);
    }
    if (options?.detectDiscriminatedUnions !== false && sampledItems.length >= 2) {
      const du = tryDetectDiscriminatedUnion(sampledItems, depth, options);
      if (du) {
        itemType = { ...itemType, discriminatorField: du.discriminatorField, discriminatedVariants: du.variants };
      }
    }
    return addMeta({ type: "array", itemType }, "array_inferred", { samples: len, sampled: sampledItems.length });
  }
  if (typeof val === "object") {
    const fields = {};
    for (const key in val) {
      fields[key] = inferSchema(val[key], key, depth + 1, allowedEnumKeys, options);
    }
    applyContextCorrections(fields);
    return addMeta({ type: "object", fields }, "object", { fieldCount: Object.keys(fields).length });
  }
  if (typeof val === "string") {
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)) return addMeta({ type: "string", format: "uuid" }, "format:uuid");
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) return addMeta({ type: "string", format: "email" }, "format:email");
    if (/^https?:\/\/[^\s]+$/.test(val)) return addMeta({ type: "string", format: "url" }, "format:url");
    if (/^\d{4}-\d{2}-\d{2}$/.test(val) && !isNaN(Date.parse(val))) return addMeta({ type: "string", format: "date" }, "format:date");
    if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(val) && !isNaN(Date.parse(val))) return addMeta({ type: "string", format: "datetime" }, "format:datetime");
    if (/^\d/.test(val) && val.includes("T") && !isNaN(Date.parse(val)) && val.length > 7) return addMeta({ type: "string", format: "datetime" }, "format:datetime");
    let isEnumCandidate = false;
    if (keyName) {
      const k = keyName.toLowerCase();
      const enumKeywords = Array.from(enumKeywordsSet);
      const floatKeyPattern = /price|amount|cost|fee|tax|rate|ratio|percent|score|weight|height|width|balance|salary|revenue/i;
      const uuidKeyPattern = /^id$|_id$|^uuid$|^guid$|^token$/i;
      const urlKeyPattern = /url|uri|href|link|src|endpoint|avatar|thumbnail|image|photo/i;
      const emailKeyPattern = /email|mail/i;
      if (uuidKeyPattern.test(keyName)) return addMeta({ type: "string", format: "uuid" }, "format:uuid:keyname");
      if (emailKeyPattern.test(keyName)) return addMeta({ type: "string", format: "email" }, "format:email:keyname");
      if (urlKeyPattern.test(keyName)) return addMeta({ type: "string", format: "url" }, "format:url:keyname");
      if (allowedEnumKeys) {
        isEnumCandidate = allowedEnumKeys.has(keyName);
      } else {
        if (enumKeywords.some((kw) => k.includes(kw))) {
          isEnumCandidate = true;
        } else {
          const commonConstants = /* @__PURE__ */ new Set(["yes", "no", "true", "false", "get", "post", "put", "delete", "active", "inactive", "pending", "success", "error", "failed"]);
          if (commonConstants.has(val.toLowerCase())) {
            isEnumCandidate = true;
          }
        }
      }
      if (!isEnumCandidate && floatKeyPattern.test(keyName)) {
        return addMeta({ type: "string" }, "format:float:keyname");
      }
    }
    if (isEnumCandidate && val.trim() !== "") {
      return addMeta({ type: "string", enumValues: [val] }, "enum_candidate", { sample: val });
    }
    return addMeta({ type: "string" }, "string");
  }
  if (typeof val === "number") {
    const isInt = Number.isInteger(val);
    return addMeta({ type: "number", format: isInt ? "int" : "float" }, "number");
  }
  const t = typeof val;
  if (t === "string" || t === "number" || t === "boolean" || t === "object") {
    return addMeta({ type: t }, "primitive");
  }
  return addMeta({ type: "any" }, "primitive");
};
var tryDetectDiscriminatedUnion = (items, depth, options) => {
  if (items.length < 2) return null;
  if (!items.every((item) => item !== null && typeof item === "object" && !Array.isArray(item))) return null;
  const firstKeys = Object.keys(items[0]);
  for (const candidateField of firstKeys) {
    if (!items.every((item) => typeof item[candidateField] === "string" && item[candidateField].length > 0)) continue;
    const uniqueValues = Array.from(new Set(items.map((item) => item[candidateField])));
    if (uniqueValues.length < 2 || uniqueValues.length > 8) continue;
    const variantSchemas = {};
    for (const val of uniqueValues) {
      const variantItems = items.filter((item) => item[candidateField] === val);
      if (variantItems.length === 0) continue;
      let vs = inferSchema(variantItems[0], void 0, depth + 1, void 0, options);
      for (let vi = 1; vi < variantItems.length; vi++) {
        vs = mergeSchemas(vs, inferSchema(variantItems[vi], void 0, depth + 1, void 0, options), depth + 1);
      }
      variantSchemas[val] = vs;
    }
    if (Object.keys(variantSchemas).length < 2) continue;
    const requiredFieldSets = Object.values(variantSchemas).map(
      (v) => new Set(Object.entries(v.fields ?? {}).filter(([, fv]) => !fv.optional).map(([fk]) => fk))
    );
    const allRequired = Array.from(new Set(requiredFieldSets.flatMap((s) => Array.from(s))));
    const variantSpecificCount = allRequired.filter((f) => !requiredFieldSets.every((set2) => set2.has(f))).length;
    if (variantSpecificCount >= 2) {
      return { discriminatorField: candidateField, variants: variantSchemas };
    }
  }
  return null;
};
var DEPENDENCY_COMMENTS = {
  // Languages
  "typescript": "// Required dependencies: npm install typescript\n\n",
  "zod": "// Required dependencies: npm install zod\n\n",
  "go": "// Go version 1.18+ required (supports generics)\n\n",
  "rust": '// Required Cargo dependencies:\n// serde = { version = "1.0", features = ["derive"] }\n\n',
  "java": "// Java version 8+ required (compatible with Jackson/Gson)\n\n",
  "sql": "// Prisma schema format (requires: npx prisma generate)\n\n",
  "php": "// PHP version 8.1+ required\n\n",
  "python": "# Required dependencies: pip install pydantic\n\n",
  "protobuf": "// Protocol Buffers v3 specification\n\n",
  "csharp": "// C# (.NET Core 6.0+) standard class model\n\n",
  "swift": "// Swift 5.0+ (Codable protocol compliant)\n\n",
  "kotlin": "// Kotlin standard library data class (compatible with kotlinx.serialization)\n\n",
  // SEO & Special Slugs
  "csv": "// CSV Data Format (Excel compatible)\n\n",
  "sql-insert": "// ANSI SQL standard compliant INSERT statement\n\n",
  "mysql": "-- MySQL / MariaDB compatible DDL (Requires MySQL 5.7+)\n\n",
  "postgres": "-- PostgreSQL compatible DDL (Requires PostgreSQL 10+)\n\n",
  "sqlite": "-- SQLite compatible DDL schema\n\n",
  "snowflake": "-- Snowflake Data Cloud compatible DDL table schema\n\n",
  "toml": "# TOML configuration format\n\n",
  "yaml": "# YAML standard data format\n\n",
  "env": "# Environment variables (.env template)\n\n",
  "env-validator": "// Required dependencies: npm install zod\n\n",
  "properties": "# Java .properties key-value configuration\n\n",
  "mongoose": "// Required dependencies: npm install mongoose\n\n",
  "sequelize": "// Required dependencies: npm install sequelize pg pg-hstore (or mysql2/sqlite3)\n\n",
  "typeorm": "// Required dependencies: npm install typeorm reflect-metadata\n// Note: Enable emitDecoratorMetadata and experimentalDecorators in tsconfig.json\n\n",
  "drizzle": "// Required dependencies: npm install drizzle-orm drizzle-kit\n\n",
  "kysely": "// Required dependencies: npm install kysely\n\n",
  "yup": "",
  // Already prepended by yupGen
  "joi": "",
  // Already prepended by joiGen
  "valibot": "",
  // Already prepended by valibotGen
  "superstruct": "",
  // Already prepended by superstructGen
  "react-props": "// Required dependencies: npm install react\n\n",
  "react-context": "// Required dependencies: npm install react\n\n",
  "redux-slice": "// Required dependencies: npm install @reduxjs/toolkit react-redux\n\n",
  "pinia-store": "// Required dependencies: npm install pinia\n\n",
  "vue-props": '// Vue 3 <script setup lang="ts"> standard format\n\n',
  "svelte-props": "// Svelte 3/4 TypeScript component props scaffold\n\n",
  "solid-props": "// Required dependencies: npm install solid-js\n\n",
  "arduino": "// Required libraries: ArduinoJson (v6 or v7)\n\n",
  "clojure": ";; Clojure clojure.spec/alpha definition\n\n",
  "elixir": "# Required dependencies: Ecto (mix ecto)\n\n",
  "elm": "-- Required Elm packages:\n-- elm install elm/json\n-- elm install elm-community/json-extra\n\n",
  "godot": "# Godot Engine 4.0+ GDScript class_name script\n\n",
  "haskell": "-- Required GHC extensions and packages: aeson\n\n",
  "django": "# Required dependencies: pip install django djangorestframework\n\n",
  "rails": "# Rails ActiveRecord Migration template\n\n",
  // Extended targets — previously missing entries
  "mongodb": "// Required dependencies: npm install mongoose\n\n",
  "dynamodb": "// AWS SDK required: npm install @aws-sdk/client-dynamodb\n\n",
  "bigquery": "// Required dependencies: npm install @google-cloud/bigquery\n\n",
  "openapi": "// OpenAPI 3.0 specification (YAML format)\n\n",
  "avro": "// Apache Avro schema format\n\n",
  "mermaid": "// Mermaid ER Diagram \u2014 paste into https://mermaid.live\n\n",
  "postman": "// Postman Collection v2.1 format\n\n",
  "http": "// HTTP file format (JetBrains IDE / VS Code REST Client compatible)\n\n",
  "vscode": "// VS Code snippet format \u2014 paste into .vscode/snippets.json\n\n",
  "curl": "// cURL command\n\n",
  "cobol": "* COBOL Copybook format\n\n",
  "scala": "// Scala case class\n\n",
  "solidity": "// SPDX-License-Identifier: MIT\n\n",
  "r-lang": "# R dataframe scaffold\n\n",
  "react-query": "// Required dependencies: npm install @tanstack/react-query\n\n",
  "api-route": "// Generated Next.js App Router API Route\n// Required: Next.js 13+ with App Router enabled\n\n",
  "nextjs-api": "// Generated Next.js App Router API Route\n// Required: Next.js 13+ with App Router enabled\n\n"
};
var cleanAndFormatCode = (code) => {
  const lines = code.split("\n").map((line) => line.trimEnd());
  const result = [];
  let prevWasEmpty = false;
  for (const line of lines) {
    if (line === "") {
      if (!prevWasEmpty) {
        result.push("");
        prevWasEmpty = true;
      }
    } else {
      result.push(line);
      prevWasEmpty = false;
    }
  }
  return result.join("\n").trim();
};
var structureHashCache = /* @__PURE__ */ new WeakMap();
var calculateStructureHash = (s) => {
  if (structureHashCache.has(s)) return structureHashCache.get(s);
  const build = (node) => {
    if (!node) return null;
    if (node.type === "object" && node.fields) {
      const keys = Object.keys(node.fields).sort((a, b) => a.localeCompare(b));
      const obj = {};
      for (const k of keys) {
        obj[k] = build(node.fields[k]);
      }
      return { type: "object", fields: obj };
    }
    if (node.type === "array" && node.itemType) {
      return { type: "array", item: build(node.itemType) };
    }
    const base = {
      type: node.type,
      optional: !!node.optional,
      nullable: !!node.nullable
    };
    if (node.enumValues && node.enumValues.length > 0) base.enum = [...node.enumValues].sort();
    if (node.format) base.format = node.format;
    return base;
  };
  const canonical = JSON.stringify(build(s));
  const hash = createHash("sha256").update(canonical).digest("hex");
  structureHashCache.set(s, hash);
  s._structureHash = hash;
  return hash;
};
var collectObjectNodes = (s, list = [], parentKey = "Root") => {
  if (s.type === "object" && s.fields) {
    list.push({ schema: s, parentKey });
    for (const [k, v] of Object.entries(s.fields)) {
      collectObjectNodes(v, list, k);
    }
  } else if (s.type === "array" && s.itemType) {
    collectObjectNodes(s.itemType, list, parentKey + "Item");
  }
};
var areFieldsIsomorphic = (s1, s2, visited = /* @__PURE__ */ new Set(), options = {}) => {
  if (s1.type !== "object" || s2.type !== "object") return false;
  if (!s1.fields || !s2.fields) return false;
  const keys1 = Object.keys(s1.fields);
  const keys2 = Object.keys(s2.fields);
  const minFields = options.minFieldsForIsomorphic ?? 2;
  if (keys1.length < minFields || keys2.length < minFields) return false;
  const s1Hash = s1._structureHash;
  const s2Hash = s2._structureHash;
  const pairKey = s1Hash && s2Hash ? `${s1Hash}-${s2Hash}` : void 0;
  if (pairKey && visited.has(pairKey)) return true;
  if (pairKey) visited.add(pairKey);
  const allKeys = Array.from(/* @__PURE__ */ new Set([...keys1, ...keys2]));
  let matchingKeys = 0;
  let typeMismatches = 0;
  let missingKeys = 0;
  for (const k of allKeys) {
    const f1 = s1.fields[k];
    const f2 = s2.fields[k];
    if (f1 && f2) {
      if (f1.type === "any" || f2.type === "any") {
        matchingKeys++;
      } else if (f1.type === f2.type) {
        if (f1.type === "object" && f1.fields && f2.fields) {
          if (areFieldsIsomorphic(f1, f2, visited, options)) {
            matchingKeys++;
          } else {
            typeMismatches++;
          }
        } else if (f1.type === "array" && f1.itemType && f2.itemType) {
          const item1 = f1.itemType;
          const item2 = f2.itemType;
          if (item1.type === "any" || item2.type === "any") {
            matchingKeys++;
          } else if (item1.type === "object" && item2.type === "object") {
            if (areFieldsIsomorphic(item1, item2, visited, options)) {
              matchingKeys++;
            } else {
              typeMismatches++;
            }
          } else if (item1.type === item2.type) {
            matchingKeys++;
          } else {
            typeMismatches++;
          }
        } else {
          matchingKeys++;
        }
      } else {
        typeMismatches++;
      }
    } else {
      const presentField = f1 || f2;
      if (presentField.optional || presentField.type === "any") {
        matchingKeys++;
      } else {
        missingKeys++;
      }
    }
  }
  const allCompared = matchingKeys + typeMismatches + missingKeys;
  if (allCompared === 0) return true;
  const matchRatio = matchingKeys / allCompared;
  const minMatchRatio = options.minMatchRatio ?? 0.5;
  const maxTypeMismatches = options.maxTypeMismatches ?? 0;
  return matchRatio >= minMatchRatio && typeMismatches <= maxTypeMismatches;
};
var mergeIsomorphicObjects = (target, source) => {
  if (!target.fields || !source.fields) return;
  for (const [k, v] of Object.entries(source.fields)) {
    if (!target.fields[k]) {
      target.fields[k] = { ...v, optional: true };
    } else {
      const t = target.fields[k];
      t.optional = t.optional || v.optional;
      t.nullable = t.nullable || v.nullable;
      if (t.type === "any") {
        target.fields[k] = { ...v, optional: t.optional, nullable: t.nullable };
      } else if (t.type === "string" && v.type === "string") {
        if (t.enumValues || v.enumValues) {
          const merged = Array.from(/* @__PURE__ */ new Set([...t.enumValues ?? [], ...v.enumValues ?? []]));
          t.enumValues = merged.length <= 6 ? merged : void 0;
        }
      } else if (t.type === "object" && v.type === "object") {
        mergeIsomorphicObjects(t, v);
      } else if (t.type === "array" && t.itemType && v.type === "array" && v.itemType) {
        if (t.itemType.type === "any") {
          t.itemType = { ...v.itemType };
        } else if (t.itemType.type === "object" && v.itemType.type === "object") {
          mergeIsomorphicObjects(t.itemType, v.itemType);
        } else if (t.itemType.type === v.itemType.type) {
          t.itemType = mergeSchemas(t.itemType, v.itemType);
        }
      }
    }
  }
  for (const k of Object.keys(target.fields)) {
    if (!source.fields[k]) {
      target.fields[k].optional = true;
    }
  }
};
var buildIsomorphicGroups = (nodes, options = {}) => {
  const prefix = options.sharedPrefix !== void 0 ? options.sharedPrefix : "Shared";
  const rawGroups = [];
  for (const node of nodes) {
    let found = false;
    for (const group of rawGroups) {
      if (areFieldsIsomorphic(node.schema, group[0], /* @__PURE__ */ new Set(), options)) {
        group.push(node.schema);
        found = true;
        break;
      }
    }
    if (!found) rawGroups.push([node.schema]);
  }
  const sharedNames = /* @__PURE__ */ new Set();
  const result = [];
  for (const group of rawGroups) {
    let counter = 1;
    if (group.length < 2) continue;
    group.sort((a, b) => Object.keys(b.fields || {}).length - Object.keys(a.fields || {}).length);
    const rep = group[0];
    const repNode = nodes.find((n) => n.schema === rep) || nodes.find((n) => group.includes(n.schema));
    const representativeKey = repNode?.parentKey || "Object";
    const fieldNames = Object.keys(rep.fields || {});
    let semanticName = "";
    if (fieldNames.includes("city") && (fieldNames.includes("street") || fieldNames.includes("zip"))) {
      semanticName = prefix ? `${prefix}Address` : "Address";
    } else if (fieldNames.includes("amount") && fieldNames.includes("currency")) {
      semanticName = prefix ? `${prefix}Money` : "Money";
    } else if (fieldNames.includes("created_at") && fieldNames.includes("updated_at")) {
      semanticName = prefix ? `${prefix}Metadata` : "Metadata";
    } else if (fieldNames.includes("name") && (fieldNames.includes("email") || fieldNames.includes("age") || fieldNames.includes("profile") || fieldNames.includes("role"))) {
      semanticName = prefix ? `${prefix}User` : "User";
    } else if (fieldNames.includes("id") && fieldNames.includes("profile") && fieldNames.includes("permissions")) {
      semanticName = prefix ? `${prefix}Member` : "Member";
    } else {
      const allParentKeys = group.map((s) => nodes.find((n) => n.schema === s)?.parentKey).filter((k) => !!k && k !== "Root" && k !== "Object");
      let bestKey = allParentKeys.length > 0 ? allParentKeys.sort((a, b) => a.length - b.length)[0] : representativeKey;
      const singularExceptions = /* @__PURE__ */ new Set(["status", "address", "business", "process", "class", "series", "species", "means", "news", "analysis", "basis", "crisis", "thesis", "oasis", "bonus", "genius", "campus", "focus", "corpus", "census", "consensus", "virus", "canvas", "atlas", "alias", "bias", "gas"]);
      if (bestKey.endsWith("s") && !bestKey.endsWith("ss") && !singularExceptions.has(bestKey.toLowerCase())) {
        bestKey = bestKey.slice(0, -1);
      }
      const camelKey = bestKey.replace(/(^\w|_\w)/g, (m) => m.replace(/_/, "").toUpperCase());
      semanticName = prefix ? `${prefix}${camelKey}` : camelKey;
    }
    let finalName = semanticName;
    while (sharedNames.has(finalName)) finalName = `${semanticName}${counter++}`;
    sharedNames.add(finalName);
    result.push({ group, semanticName: finalName });
  }
  return result;
};
var extractSharedTypes = (rootSchema, options = {}) => {
  const nodes = [];
  collectObjectNodes(rootSchema, nodes, "Root");
  for (const node of nodes) {
    node.schema._structureHash = calculateStructureHash(node.schema);
  }
  const groups = buildIsomorphicGroups(nodes, options);
  for (const { group, semanticName } of groups) {
    if (options.disabledUnifications?.includes(semanticName)) continue;
    const finalName = options.customTypeNames?.[semanticName] ?? semanticName;
    const rep = group[0];
    for (let i = 1; i < group.length; i++) mergeIsomorphicObjects(rep, group[i]);
    for (let i = 1; i < group.length; i++) group[i].fields = rep.fields;
    for (const s of group) s._sharedTypeName = finalName;
  }
};
var getDecisions = (json2, options = {}) => {
  const decisions = [];
  if (!json2 || typeof json2 !== "object") return decisions;
  try {
    const tempSchema = inferSchema(json2);
    const nodes = [];
    collectObjectNodes(tempSchema, nodes, "Root");
    for (const node of nodes) {
      node.schema._structureHash = calculateStructureHash(node.schema);
    }
    const groups = buildIsomorphicGroups(nodes, options);
    for (const { group, semanticName } of groups) {
      const isDisabled = !!options.disabledUnifications?.includes(semanticName);
      const displayName = options.customTypeNames?.[semanticName] ?? semanticName;
      const rep = group[0];
      decisions.push({
        id: `unify_${semanticName}`,
        type: "unification",
        title: `Unify similar objects as ${displayName}`,
        description: `Detected ${group.length} objects with similar fields. Unified them into ${displayName} to avoid duplicate class definitions.`,
        meta: {
          semanticName: displayName,
          originalName: semanticName,
          count: group.length,
          fields: Object.keys(rep.fields || {}),
          disabled: isDisabled
        }
      });
    }
    const timestampFields = ["createdAt", "updatedAt", "deletedAt", "created_at", "updated_at", "deleted_at"];
    let timestampApplicable = false;
    for (const node of nodes) {
      if (node.schema.type === "object" && node.schema.fields) {
        const found = Object.keys(node.schema.fields).filter((f) => timestampFields.includes(f));
        if (found.length >= 2) {
          timestampApplicable = true;
          break;
        }
      }
    }
    if (timestampApplicable) {
      const isDisabled = options.extractTimestamps === false;
      decisions.push({
        id: "timestamp_inheritance",
        type: "timestamp",
        title: "Timestamp Inheritance",
        description: "Automatically extracts audit trails (createdAt, updatedAt) to a common TimestampModel base class.",
        meta: {
          disabled: isDisabled
        }
      });
    }
    let flatteningApplicable = false;
    for (const node of nodes) {
      if (node.schema.type === "object" && node.schema.fields) {
        const keys = Object.keys(node.schema.fields);
        if (keys.length === 1) {
          const child = node.schema.fields[keys[0]];
          if (child.type === "object") {
            flatteningApplicable = true;
            break;
          }
        }
      }
    }
    if (flatteningApplicable) {
      const isDisabled = options.flattenWrappers === false;
      decisions.push({
        id: "wrapper_flattening",
        type: "flattening",
        title: "Flatten Single-Field Wrappers",
        description: "Removes redundant nested single-key objects and merges their fields directly into the parent model.",
        meta: {
          disabled: isDisabled
        }
      });
    }
  } catch (e) {
    console.error("Error analyzing decisions:", e);
  }
  return decisions;
};
var inferSchemaAsync = async (json2, options = {}) => {
  try {
    if (typeof window === "undefined") {
      const runPath = ["..", "..", "server", "worker", "runInferenceInWorker"].join("/");
      const dynamicLoad = async (p) => {
        try {
          const m = await import(
            /* webpackIgnore: true */
            p
          );
          return m && (m.runInferenceInWorker ? m : m.default || m);
        } catch (e) {
          if (typeof __require !== "undefined") {
            try {
              const m = __require(p);
              return m;
            } catch (e2) {
              throw e;
            }
          }
          throw e;
        }
      };
      const mod = await dynamicLoad(runPath);
      const runFn = mod?.runInferenceInWorker ?? (typeof mod === "function" ? mod : void 0);
      if (typeof runFn === "function") {
        return await runFn(json2, options);
      }
      trackInferenceFallback("worker_unavailable");
      return inferSchema(json2, void 0, 0, void 0, options);
    }
    return inferSchema(json2, void 0, 0, void 0, options);
  } catch (e) {
    trackInferenceError("infer_schema_async_error", {
      message: e instanceof Error ? e.name : "unknown",
      stage: "async_fallback"
    });
    return inferSchema(json2, void 0, 0, void 0, options);
  }
};
var runEngine = (json2, lang, slug = "", options = {}) => {
  try {
    if (!options._openAPIComponent && isOpenAPISpec(json2)) {
      const components = parseOpenAPIComponents(json2);
      if (components.length > 0) {
        const parts = components.map(
          ({ name, schema: schema3 }, idx) => runEngine(schema3, lang, slug, { ...options, rootName: name, _openAPIComponent: idx > 0 })
        ).filter((p) => typeof p === "string" && p.trim());
        return parts.join("\n\n");
      }
    }
    if (!options._openAPIComponent && isJSONSchema(json2)) {
      const components = parseJSONSchema(json2);
      if (components.length > 0) {
        const parts = components.map(
          ({ name, schema: schema3 }, idx) => runEngine(schema3, lang, slug, { ...options, rootName: name, _openAPIComponent: idx > 0 })
        ).filter((p) => typeof p === "string" && p.trim());
        return parts.join("\n\n");
      }
    }
    const isOAComp = !!options._openAPIComponent;
    const schema2 = json2 && json2._isTypeMorphSchema ? json2 : inferSchema(json2);
    const rootName = options.rootName ?? "Root";
    if (!isOAComp && !json2?._isTypeMorphSchema) detectRecursiveTypes(schema2, rootName);
    if (!isOAComp) extractSharedTypes(schema2, options);
    let out = "";
    let matchedKey = "";
    const s = (lang || slug || "").toLowerCase();
    matchedKey = s;
    const rootNameLower = rootName.charAt(0).toLowerCase() + rootName.slice(1);
    if (s === "typescript" || s === "ts") {
      const pfx = isOAComp ? "" : `/**
 * TypeMorph Generated TypeScript Interface
 */
`;
      out = pfx + tsGen.generate(schema2, rootName, options);
    } else if (s === "zod") {
      const pfx = isOAComp ? "" : `import { z } from "zod";

`;
      out = pfx + zodGen.generate(schema2, rootNameLower, options);
    } else if (s === "go" || s === "golang") {
      out = goGen.generate(schema2, rootName, options);
    } else if (s === "rust") {
      out = rustGen.generate(schema2, rootName, options);
    } else if (s === "java") {
      out = javaGen.generate(schema2, rootName, options);
    } else if (s === "python") {
      const pfx = isOAComp ? "" : `from pydantic import BaseModel

`;
      out = pfx + pythonGen.generate(schema2, rootName, options);
    } else if (s === "php") {
      const pfx = isOAComp ? "" : `<?php

`;
      out = pfx + phpGen.generate(schema2, rootName, options);
    } else if (s === "sql" || s === "prisma") {
      out = prismaGen.generate(schema2, rootName, options);
    } else if (s === "proto" || s === "protobuf") {
      const pfx = isOAComp ? "" : `// Protocol Buffers v3 specification

syntax = "proto3";

`;
      out = pfx + protoGen.generate(schema2, rootName, options);
    } else if (s === "graphql" || s === "gql") {
      out = gqlGen.generate(schema2, rootName, options);
    } else if (s.includes("csv")) out = csvGen.generate(schema2);
    else if (s.includes("sql-insert")) out = sqlInsertGen.generate(schema2, "table_name");
    else if (s.includes("mysql")) out = mysqlGen.generate(schema2, "Root");
    else if (s.includes("postgres")) out = postgresGen.generate(schema2, "Root");
    else if (s.includes("sqlite")) out = sqliteGen.generate(schema2, "Root");
    else if (s.includes("snowflake")) out = snowflakeGen.generate(schema2, "Root");
    else if (s.includes("mongodb") || s.includes("mongoose")) out = mongooseGen.generate(schema2, "Root");
    else if (s.includes("ruby") || s.includes("rails")) out = railsGen.generate(schema2, "Root");
    else if (s.includes("django")) out = djangoGen.generate(schema2, "Root");
    else if (s.includes("dart") || s.includes("flutter")) out = dartGen.generate(schema2, "Root", options);
    else if (s.includes("swift")) out = swiftGen.generate(schema2);
    else if (s.includes("kotlin")) out = kotlinGen.generate(schema2);
    else if (s.includes("csharp") || s.includes("c-sharp")) out = csharpGen.generate(schema2);
    else if (s.includes("openapi")) out = openApiGen.generate(schema2, "Root");
    else if (s.includes("jsonschema")) out = jsonSchemaGen.generate(schema2);
    else if (s.includes("yup")) out = yupGen.generate(schema2, "root");
    else if (s.includes("joi")) out = joiGen.generate(schema2, "root");
    else if (s.includes("valibot")) out = valibotGen.generate(schema2, "root");
    else if (s.includes("react-props")) out = reactPropsGen.generate(schema2, "Component");
    else if (s.includes("vue-props")) out = vuePropsGen.generate(schema2, "Component");
    else if (s.includes("svelte-props")) out = sveltePropsGen.generate(schema2, "Component");
    else if (s.includes("solid-props")) out = solidPropsGen.generate(schema2, "Component");
    else if (s.includes("react-context")) out = reactContextGen.generate(schema2, "Root");
    else if (s.includes("react-query")) out = reactHookGen.generate(schema2, rootName);
    else if (s.includes("api-route") || s.includes("nextjs-api")) out = apiRouteGen.generate(schema2, rootName);
    else if (s.includes("redux-slice")) out = reduxSliceGen.generate(schema2, "root");
    else if (s.includes("pinia")) out = piniaStoreGen.generate(schema2, "root");
    else if (s.includes("sequelize")) out = sequelizeGen.generate(schema2, "Root");
    else if (s.includes("typeorm")) out = typeormGen.generate(schema2, "Root");
    else if (s.includes("drizzle")) out = drizzleGen.generate(schema2, "Root");
    else if (s.includes("kysely")) out = kyselyGen.generate(schema2, "Root");
    else if (s.includes("superstruct")) out = superstructGen.generate(schema2, "root");
    else if (s.includes("arduino")) out = arduinoGen.generate(schema2, "Data");
    else if (s.includes("mock")) out = mockGen.generate(schema2);
    else if (s.includes("ui")) out = uiGen.generate(schema2, "Component");
    else if (s.includes("asciidoc")) out = asciidocTableGen.generate(schema2);
    else if (s.includes("doc")) out = docGen.generate(schema2);
    else if (s.includes("avro")) out = avroGen.generate(schema2, "Root");
    else if (s.includes("toml")) out = tomlGen.generate(schema2, "config");
    else if (s.includes("yaml")) out = yamlOutputGen.generate(schema2);
    else if (s.includes("env-validator")) out = envValidatorGen.generate(schema2);
    else if (s.includes("env")) out = envGen.generate(schema2);
    else if (s.includes("properties")) out = propertiesGen.generate(schema2);
    else if (s.includes("markdown")) out = markdownTableGen.generate(schema2);
    else if (s.includes("latex")) out = latexTableGen.generate(schema2);
    else if (s.includes("mermaid")) out = mermaidERGen.generate(schema2, "Root");
    else if (s.includes("bigquery")) out = bigQueryGen.generate(schema2);
    else if (s.includes("dynamodb")) out = dynamoDBGen.generate(schema2, "Root");
    else if (s.includes("postman")) out = postmanGen.generate(schema2);
    else if (s.includes("http")) out = httpFileGen.generate(schema2);
    else if (s.includes("vscode")) out = vscodeSnippetGen.generate(schema2);
    else if (s.includes("curl")) out = curlOutputGen.generate(schema2);
    else if (s.includes("cobol")) out = cobolGen.generate(schema2, "ROOT");
    else if (s.includes("clojure")) out = clojureGen.generate(schema2, "Root");
    else if (s.includes("elixir")) out = elixirGen.generate(schema2, "Root");
    else if (s.includes("elm")) out = elmGen.generate(schema2, "Root");
    else if (s.includes("godot") || s.includes("gdscript")) out = godotGen.generate(schema2, "Root");
    else if (s.includes("haskell")) out = haskellGen.generate(schema2, "Root");
    else if (s.includes("r-lang") || s === "r") {
      out = rGen.generate(schema2, "Root");
      matchedKey = "r-lang";
    } else if (s.includes("scala")) out = scalaGen.generate(schema2, "Root");
    else if (s.includes("solidity")) out = solidityGen.generate(schema2, "Root");
    const KNOWN_TARGETS_EXACT = /* @__PURE__ */ new Set(["typescript", "ts", "zod", "go", "golang", "rust", "java", "python", "php", "sql", "prisma", "proto", "protobuf", "graphql", "gql", "json", "r"]);
    const KNOWN_TARGET_SUBSTR = ["csv", "sql-insert", "mysql", "postgres", "sqlite", "snowflake", "mongodb", "mongoose", "ruby", "rails", "django", "dart", "flutter", "swift", "kotlin", "csharp", "c-sharp", "openapi", "jsonschema", "yup", "joi", "valibot", "react-props", "vue-props", "svelte-props", "solid-props", "react-context", "react-query", "api-route", "nextjs-api", "redux-slice", "pinia", "sequelize", "typeorm", "drizzle", "kysely", "superstruct", "arduino", "mock", "ui", "doc", "avro", "toml", "yaml", "env-validator", "env", "properties", "markdown", "asciidoc", "latex", "mermaid", "bigquery", "dynamodb", "postman", "http", "vscode", "curl", "cobol", "clojure", "elixir", "elm", "godot", "gdscript", "haskell", "r-lang", "scala", "solidity"];
    const targetMatched = KNOWN_TARGETS_EXACT.has(s) || KNOWN_TARGET_SUBSTR.some((k) => s.includes(k));
    if (s === "json") {
      out = JSON.stringify(json2, null, 2);
    } else if (!out && targetMatched) {
      out = `// No output generated for "${lang || slug || s}". The input may be empty or lack the structure this format expects.`;
    } else if (!out) {
      matchedKey = "unsupported";
      trackUnsupportedOutputTarget(lang || slug || "unknown", s);
      out = `// Unsupported output target: "${lang || slug || "unknown"}"
// Supported targets include: typescript, zod, go, rust, java, python, php, sql, protobuf, graphql, swift, kotlin, jsonschema, mock, ui, doc, openapi, yup, joi, valibot, react-props, vue-props, svelte-props, solid-props, react-context, redux-slice, pinia, sequelize, typeorm, drizzle, kysely, superstruct, arduino, clojure, elixir, elm, godot, haskell, r, scala, solidity
`;
    }
    let depHeader = "";
    const lowerKey = matchedKey.toLowerCase();
    for (const [k, comment] of Object.entries(DEPENDENCY_COMMENTS)) {
      if (lowerKey === k) {
        depHeader = comment;
        break;
      }
    }
    const finalCode = depHeader && !isOAComp ? depHeader + out : out;
    return cleanAndFormatCode(finalCode);
  } catch (e) {
    return "// Error: " + String(e);
  }
};

// ../../src/lib/quality.ts
var SEMANTIC_STRING = /email|url|link|href|website|endpoint|uuid|guid|^id$|_id$|Id$|ID$|date|_at$|At$|time|timestamp|phone|tel|zip|postal|ip$|ip_|token|hash/i;
var FREE_TEXT = /^(name|label|title|description|desc|summary|body|content|text|message|note|notes|comment|comments|bio|about|reason|details|info|caption|heading|subtitle|excerpt|overview|remark|remarks|placeholder|hint|tooltip|instruction|instructions|query|search|address|street|city|country|state|province|slug|tag|category|type|status|kind|mode|locale|lang|language|currency|unit|format|source|target|key|value|data)$/i;
var SENSITIVE = /password|passwd|secret|token|apikey|api_key|auth|credential|private/i;
var FORMAT_KEYWORDS = {
  email: /email/i,
  url: /url|link|href|website|endpoint/i,
  uuid: /uuid|guid/i,
  id: /^id$|_id$|Id$|ID$/,
  date: /date|_at$|At$|time|timestamp/i,
  phone: /phone|tel/i,
  ip: /^ip$|ip_|ipAddr|ip_address/i
};
function isCamel(s) {
  return /^[a-z][a-zA-Z0-9]*$/.test(s) && s !== s.toUpperCase();
}
function isSnake(s) {
  return /^[a-z][a-z0-9_]*$/.test(s) && s.includes("_");
}
function isPascal(s) {
  return /^[A-Z][a-zA-Z0-9]*$/.test(s);
}
function classifyName(name) {
  if (isSnake(name)) return "snake_case";
  if (isPascal(name)) return "PascalCase";
  if (isCamel(name)) return "camelCase";
  return "other";
}
function collectFields(schema2, path, depth, stats, issues) {
  if (depth > 20) return;
  stats.maxDepth = Math.max(stats.maxDepth, depth);
  if (schema2.type === "object" && schema2.fields) {
    for (const [key, field] of Object.entries(schema2.fields)) {
      const fieldPath = path ? `${path}.${key}` : key;
      stats.total++;
      stats.nameCounts[classifyName(key)] = (stats.nameCounts[classifyName(key)] ?? 0) + 1;
      if (field.type === "any") {
        stats.anyCount++;
        issues.push({ severity: "warning", message: "Has `any` type \u2014 add a specific type", path: fieldPath });
      }
      if (field.optional) {
        stats.optionalCount++;
      } else {
        stats.requiredCount++;
      }
      if (field.type === "string") {
        const hasExplicitFormat = !!field.format;
        const hasNameHint = Object.values(FORMAT_KEYWORDS).some((re) => re.test(key));
        if (hasExplicitFormat || hasNameHint) {
          stats.formattedCount++;
        } else if (SEMANTIC_STRING.test(key) && !FREE_TEXT.test(key)) {
          stats.semanticUnformatted.push({ path: fieldPath });
        }
        if (SENSITIVE.test(key)) {
          issues.push({ severity: "info", message: "May contain sensitive data \u2014 consider hashing or omitting", path: fieldPath });
        }
      }
      collectFields(field, fieldPath, depth + 1, stats, issues);
    }
  } else if (schema2.type === "array" && schema2.itemType) {
    collectFields(schema2.itemType, `${path}[]`, depth + 1, stats, issues);
  }
}
function dominantStyle(counts) {
  const entries = Object.entries(counts).filter(([, n]) => n > 0);
  if (entries.length === 0) return "unknown";
  entries.sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const [topStyle, topCount] = entries[0];
  if (topCount / total >= 0.8) return topStyle;
  return "mixed";
}
function scoreGrade(score) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}
function analyzeQuality(schema2) {
  const issues = [];
  const stats = {
    total: 0,
    anyCount: 0,
    formattedCount: 0,
    semanticUnformatted: [],
    optionalCount: 0,
    requiredCount: 0,
    nameCounts: { camelCase: 0, snake_case: 0, PascalCase: 0, other: 0 },
    maxDepth: 0
  };
  collectFields(schema2, "", 0, stats, issues);
  let score = 100;
  if (stats.total > 0) {
    const anyRatio = stats.anyCount / stats.total;
    const anyPenalty = Math.round(anyRatio * 50);
    if (anyPenalty > 0) score -= anyPenalty;
  }
  if (stats.semanticUnformatted.length > 0) {
    const formatPenalty = Math.min(20, stats.semanticUnformatted.length * 5);
    score -= formatPenalty;
    for (const { path } of stats.semanticUnformatted.slice(0, 3)) {
      issues.push({
        severity: "info",
        message: "Looks like it needs a format constraint (uuid, email, datetime\u2026)",
        path
      });
    }
    if (stats.semanticUnformatted.length > 3) {
      issues.push({
        severity: "info",
        message: `${stats.semanticUnformatted.length - 3} more fields may need format constraints`
      });
    }
  }
  const style = dominantStyle(stats.nameCounts);
  if (style === "mixed" && stats.total >= 3) {
    score -= 15;
    issues.push({ severity: "warning", message: "Field names mix camelCase and snake_case \u2014 pick one style consistently" });
  }
  if (stats.maxDepth > 4) {
    const depthPenalty = Math.min(10, (stats.maxDepth - 4) * 2);
    score -= depthPenalty;
    if (stats.maxDepth > 6) {
      issues.push({ severity: "warning", message: `Schema is ${stats.maxDepth} levels deep \u2014 consider flattening or splitting` });
    }
  }
  if (stats.total >= 3 && stats.requiredCount === 0) {
    score -= 10;
    issues.push({ severity: "warning", message: "All fields are optional \u2014 mark required fields to improve type safety" });
  }
  if (stats.total === 1) {
    issues.push({ severity: "info", message: "Only 1 field \u2014 quality score is based on limited data" });
  }
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    grade: scoreGrade(score),
    issues,
    stats: {
      totalFields: stats.total,
      anyFields: stats.anyCount,
      formattedFields: stats.formattedCount,
      optionalFields: stats.optionalCount,
      requiredFields: stats.requiredCount,
      maxDepth: stats.maxDepth,
      namingStyle: style
    }
  };
}

// ../../src/lib/diff.ts
function compareSchemaTypes(oldSchema, newSchema, rootPath = "root") {
  const diffs = [];
  function compare(old, next, p) {
    const display = p.replace(/^root\.?/, "") || "root";
    if (old.type !== next.type) {
      diffs.push({
        path: display,
        type: "type_changed",
        oldType: old.type,
        newType: next.type,
        severity: "error",
        description: `'${display}' changed type from '${old.type}' to '${next.type}'.`
      });
      return;
    }
    if (!old.optional && next.optional) {
      diffs.push({
        path: display,
        type: "required_changed",
        severity: "warning",
        description: `'${display}' changed from required to optional. Consumers must handle undefined.`
      });
    }
    if (old.optional && !next.optional) {
      diffs.push({
        path: display,
        type: "required_changed",
        severity: "error",
        description: `'${display}' changed from optional to required. Existing payloads missing this field will be invalid.`
      });
    }
    if (!old.nullable && next.nullable) {
      diffs.push({
        path: display,
        type: "nullable_changed",
        severity: "info",
        description: `'${display}' became nullable. Add null-checks if needed.`
      });
    }
    if (old.nullable && !next.nullable) {
      diffs.push({
        path: display,
        type: "nullable_changed",
        severity: "warning",
        description: `'${display}' is no longer nullable. Existing null values will be invalid.`
      });
    }
    if ((old.format ?? "") !== (next.format ?? "")) {
      diffs.push({
        path: display,
        type: "format_changed",
        oldType: old.format ?? "none",
        newType: next.format ?? "none",
        severity: old.format && !next.format ? "warning" : "info",
        description: `'${display}' format changed from '${old.format ?? "none"}' to '${next.format ?? "none"}'.`
      });
    }
    const oldEnums = old.enumValues ?? [];
    const newEnums = next.enumValues ?? [];
    if (oldEnums.length > 0 || newEnums.length > 0) {
      const removed = oldEnums.filter((v) => !newEnums.includes(v));
      const added = newEnums.filter((v) => !oldEnums.includes(v));
      if (removed.length > 0) {
        diffs.push({
          path: display,
          type: "enum_changed",
          severity: "error",
          description: `Enum values removed from '${display}': ${removed.map((v) => `"${v}"`).join(", ")}. Existing data with these values will be invalid.`
        });
      }
      if (added.length > 0) {
        diffs.push({
          path: display,
          type: "enum_changed",
          severity: "info",
          description: `New enum values added to '${display}': ${added.map((v) => `"${v}"`).join(", ")}.`
        });
      }
    }
    if (old.type === "object" && next.type === "object") {
      const oldFields = old.fields ?? {};
      const newFields = next.fields ?? {};
      for (const key of Object.keys(oldFields)) {
        if (!(key in newFields)) {
          const wasRequired = !oldFields[key].optional;
          diffs.push({
            path: `${display === "root" ? "" : display + "."}${key}`,
            type: "removed",
            oldType: oldFields[key].type,
            severity: wasRequired ? "error" : "warning",
            description: wasRequired ? `Required field '${key}' was removed. This is a breaking change.` : `Optional field '${key}' was removed.`
          });
        }
      }
      for (const key of Object.keys(newFields)) {
        if (!(key in oldFields)) {
          const isRequired = !newFields[key].optional;
          diffs.push({
            path: `${display === "root" ? "" : display + "."}${key}`,
            type: "added",
            newType: newFields[key].type,
            severity: isRequired ? "error" : "info",
            description: isRequired ? `New required field '${key}' added. Existing payloads missing this field will be invalid.` : `New optional field '${key}' added.`
          });
        }
      }
      for (const key of Object.keys(oldFields)) {
        if (key in newFields) {
          compare(oldFields[key], newFields[key], `${p}.${key}`);
        }
      }
    }
    if (old.type === "array" && next.type === "array" && old.itemType && next.itemType) {
      compare(old.itemType, next.itemType, `${p}[]`);
    }
  }
  compare(oldSchema, newSchema, rootPath);
  return diffs;
}
function compareSchemas(oldObj, newObj) {
  const diffs = [];
  function getTypeSignature(val) {
    if (val === null) return "null";
    if (Array.isArray(val)) {
      if (val.length === 0) return "any[]";
      const types2 = Array.from(new Set(val.map((item) => getTypeSignature(item))));
      return `(${types2.join(" | ")})[]`;
    }
    if (typeof val === "object") return "object";
    return typeof val;
  }
  function flattenSchema(obj, path = "root", registry = /* @__PURE__ */ new Map(), seen = /* @__PURE__ */ new Set()) {
    if (obj === null || obj === void 0) {
      registry.set(path, "null");
      return registry;
    }
    if (typeof obj === "object") {
      if (seen.has(obj)) return registry;
      seen.add(obj);
    }
    const currentType = getTypeSignature(obj);
    registry.set(path, currentType);
    if (Array.isArray(obj)) {
      const objectElements = obj.filter((x) => x !== null && typeof x === "object" && !Array.isArray(x));
      if (objectElements.length > 0) {
        const mergedObj = {};
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
        const nonObjectElements = obj.filter((x) => x === null || typeof x !== "object" || Array.isArray(x));
        if (nonObjectElements.length > 0) {
          const elementTypes = Array.from(new Set(nonObjectElements.map((x) => getTypeSignature(x)))).sort();
          const elementTypeSig = elementTypes.length === 1 ? elementTypes[0] : `(${elementTypes.join(" | ")})`;
          registry.set(`${path}[]`, elementTypeSig);
        }
      }
    } else if (typeof obj === "object") {
      for (const key of Object.keys(obj)) {
        flattenSchema(obj[key], `${path}.${key}`, registry, seen);
      }
    }
    return registry;
  }
  const oldFlat = flattenSchema(oldObj);
  const newFlat = flattenSchema(newObj);
  for (const [path, oldType] of oldFlat.entries()) {
    if (oldType === "object") continue;
    if (path.endsWith("[]")) {
      const hasSubfields = Array.from(oldFlat.keys()).some((k) => k.startsWith(path + "."));
      if (hasSubfields) continue;
    }
    const displayPath = path.replace(/^root\./, "");
    if (!newFlat.has(path)) {
      diffs.push({
        path: displayPath,
        type: "removed",
        oldType,
        severity: "error",
        description: `Field '${displayPath}' was removed. Frontend code referencing this property will break.`
      });
    } else {
      const newType = newFlat.get(path);
      if (newType === "object") continue;
      if (oldType !== newType) {
        let severity = "error";
        let desc = `Type changed from '${oldType}' to '${newType}'.`;
        if (newType === "null" || oldType + " | null" === newType || newType.includes("null")) {
          severity = "warning";
          desc = `Field '${displayPath}' became optional or nullable. Update frontend to use optional chaining (\`?.\`).`;
        } else if (oldType === "any[]" && newType !== "any[]") {
          severity = "info";
          desc = `Array '${displayPath}' resolved from empty array to type '${newType}'.`;
        } else {
          desc = `Field '${displayPath}' changed type from '${oldType}' to '${newType}'. Might break existing logic.`;
        }
        diffs.push({
          path: displayPath,
          type: "type_changed",
          oldType,
          newType,
          severity,
          description: desc
        });
      }
    }
  }
  for (const [path, newType] of newFlat.entries()) {
    if (newType === "object") continue;
    if (path.endsWith("[]")) {
      const hasSubfields = Array.from(newFlat.keys()).some((k) => k.startsWith(path + "."));
      if (hasSubfields) continue;
      const parentPath = path.replace(/\[\]$/, "");
      if (oldFlat.has(parentPath)) continue;
    }
    const displayPath = path.replace(/^root\./, "");
    if (!oldFlat.has(path)) {
      diffs.push({
        path: displayPath,
        type: "added",
        newType,
        severity: "info",
        description: `New field '${displayPath}' of type '${newType}' added.`
      });
    }
  }
  return diffs;
}

// ../../src/lib/targets.ts
var T = (key, label, tier, monaco) => ({ key, label, tier, monaco });
var OUTPUT_TARGETS = {
  // ─── Tier 1: 中核（テスト済み） ───────────────────────────────
  typescript: T("typescript", "TypeScript", 1, "typescript"),
  zod: T("zod", "Zod", 1, "typescript"),
  go: T("go", "Go", 1, "go"),
  rust: T("rust", "Rust", 1, "rust"),
  python: T("python", "Python", 1, "python"),
  java: T("java", "Java", 1, "java"),
  csharp: T("csharp", "C#", 1, "csharp"),
  swift: T("swift", "Swift", 1, "swift"),
  kotlin: T("kotlin", "Kotlin", 1, "kotlin"),
  php: T("php", "PHP", 1, "php"),
  dart: T("dart", "Dart", 1, "dart"),
  graphql: T("graphql", "GraphQL", 1, "graphql"),
  protobuf: T("protobuf", "Protobuf", 1, "protobuf"),
  jsonschema: T("jsonschema", "JSON Schema", 1, "json"),
  sql: T("sql", "Prisma", 1, "prisma"),
  // ─── Tier 2: スキャフォールド / 近似出力 ──────────────────────
  mongoose: T("mongoose", "Mongoose", 2, "typescript"),
  mysql: T("mysql", "MySQL", 2, "sql"),
  postgres: T("postgres", "PostgreSQL", 2, "sql"),
  sqlite: T("sqlite", "SQLite", 2, "sql"),
  snowflake: T("snowflake", "Snowflake", 2, "sql"),
  bigquery: T("bigquery", "BigQuery", 2, "sql"),
  dynamodb: T("dynamodb", "DynamoDB", 2, "json"),
  sequelize: T("sequelize", "Sequelize", 2, "typescript"),
  typeorm: T("typeorm", "TypeORM", 2, "typescript"),
  drizzle: T("drizzle", "Drizzle", 2, "typescript"),
  kysely: T("kysely", "Kysely", 2, "typescript"),
  "sql-insert": T("sql-insert", "SQL INSERT", 2, "sql"),
  yup: T("yup", "Yup", 2, "typescript"),
  joi: T("joi", "Joi", 2, "typescript"),
  valibot: T("valibot", "Valibot", 2, "typescript"),
  superstruct: T("superstruct", "Superstruct", 2, "typescript"),
  "react-props": T("react-props", "React Props", 2, "typescript"),
  "react-context": T("react-context", "React Context", 2, "typescript"),
  "react-query": T("react-query", "React Query", 2, "typescript"),
  "vue-props": T("vue-props", "Vue Props", 2, "typescript"),
  "svelte-props": T("svelte-props", "Svelte Props", 2, "typescript"),
  "solid-props": T("solid-props", "Solid Props", 2, "typescript"),
  "redux-slice": T("redux-slice", "Redux Slice", 2, "typescript"),
  pinia: T("pinia", "Pinia", 2, "typescript"),
  "api-route": T("api-route", "Next.js API", 2, "typescript"),
  django: T("django", "Django", 2, "python"),
  rails: T("rails", "Rails", 2, "ruby"),
  openapi: T("openapi", "OpenAPI", 2, "yaml"),
  postman: T("postman", "Postman", 2, "json"),
  http: T("http", "HTTP File", 2, "http"),
  curl: T("curl", "cURL", 2, "shell"),
  vscode: T("vscode", "VS Code Snippet", 2, "json"),
  avro: T("avro", "Avro", 2, "json"),
  toml: T("toml", "TOML", 2, "ini"),
  yaml: T("yaml", "YAML", 2, "yaml"),
  env: T("env", ".env", 2, "shell"),
  "env-validator": T("env-validator", "Env Validator", 2, "typescript"),
  properties: T("properties", ".properties", 2, "ini"),
  markdown: T("markdown", "Markdown", 2, "markdown"),
  asciidoc: T("asciidoc", "AsciiDoc", 2, "markdown"),
  latex: T("latex", "LaTeX", 2, "latex"),
  mermaid: T("mermaid", "Mermaid", 2, "markdown"),
  csv: T("csv", "CSV", 2, "plaintext"),
  cobol: T("cobol", "COBOL", 2, "plaintext"),
  clojure: T("clojure", "Clojure", 2, "clojure"),
  elixir: T("elixir", "Elixir", 2, "elixir"),
  elm: T("elm", "Elm", 2, "elm"),
  godot: T("godot", "GDScript", 2, "plaintext"),
  haskell: T("haskell", "Haskell", 2, "haskell"),
  "r-lang": T("r-lang", "R", 2, "r"),
  scala: T("scala", "Scala", 2, "scala"),
  solidity: T("solidity", "Solidity", 2, "sol"),
  arduino: T("arduino", "Arduino", 2, "cpp")
};
var ALIASES = [
  // --- validation libraries ---
  [/valibot/, "valibot"],
  [/superstruct/, "superstruct"],
  [/\bzod\b|-zod\b/, "zod"],
  [/\byup\b/, "yup"],
  [/\bjoi\b/, "joi"],
  // --- ORM / database (specific) ---
  [/mongoose|mongodb/, "mongoose"],
  [/sequelize/, "sequelize"],
  [/typeorm/, "typeorm"],
  [/drizzle/, "drizzle"],
  [/kysely/, "kysely"],
  [/prisma/, "sql"],
  [/mariadb|mysql/, "mysql"],
  [/postgres/, "postgres"],
  [/sqlite/, "sqlite"],
  [/snowflake/, "snowflake"],
  [/bigquery/, "bigquery"],
  [/dynamodb/, "dynamodb"],
  [/sql-insert|csv-to-sql/, "sql-insert"],
  // --- frontend frameworks (specific) ---
  [/react-context/, "react-context"],
  [/react-query|tanstack/, "react-query"],
  [/react-props|react-native|^react|reactprops/, "react-props"],
  [/vue-props|^vue|pinia-store/, "vue-props"],
  [/svelte/, "svelte-props"],
  [/solid/, "solid-props"],
  [/redux/, "redux-slice"],
  [/\bpinia\b/, "pinia"],
  [/nextjs-api|api-route/, "api-route"],
  // --- backend frameworks (before generic language) ---
  [/django/, "django"],
  [/rails|ruby/, "rails"],
  [/laravel|php/, "php"],
  [/spring-boot|nestjs-dto|java/, "java"],
  // --- documents / data formats ---
  [/openapi|swagger|asyncapi/, "openapi"],
  [/postman/, "postman"],
  [/http-file|\bhttp\b/, "http"],
  [/\bcurl\b/, "curl"],
  [/vscode/, "vscode"],
  [/avro/, "avro"],
  [/hugo-toml|\btoml\b/, "toml"],
  [/jekyll-yaml|\byaml\b/, "yaml"],
  [/env-validator|env-zod/, "env-validator"],
  [/dotenv|\benv\b/, "env"],
  [/properties/, "properties"],
  [/markdown/, "markdown"],
  [/asciidoc/, "asciidoc"],
  [/latex/, "latex"],
  [/mermaid/, "mermaid"],
  [/\bcsv\b/, "csv"],
  // --- languages (generic, last) ---
  [/protobuf|proto/, "protobuf"],
  [/graphql|gql/, "graphql"],
  [/jsonschema/, "jsonschema"],
  [/cobol/, "cobol"],
  [/clojure/, "clojure"],
  [/elixir/, "elixir"],
  [/\belm\b/, "elm"],
  [/godot|gdscript/, "godot"],
  [/haskell/, "haskell"],
  [/r-dataframe|r-lang|\br\b/, "r-lang"],
  [/scala/, "scala"],
  [/solidity/, "solidity"],
  [/arduino/, "arduino"],
  [/pydantic|dataclass|sqlalchemy|marshmallow|pandas|pytorch|tensorflow|python/, "python"],
  [/golang|gorm|go-fiber|go-struct|go-map|\bgo\b/, "go"],
  [/rust/, "rust"],
  [/flutter|dart/, "dart"],
  [/kotlin|jetpack-compose/, "kotlin"],
  [/swiftui|swift/, "swift"],
  [/unity|csharp|c-sharp|\bcs\b/, "csharp"],
  [/typescript|\bts\b/, "typescript"]
];
function resolveSlugTarget(slug) {
  if (!slug) return null;
  const lower = slug.toLowerCase();
  const tail = lower.includes("-to-") ? lower.split("-to-").pop() : lower;
  for (const [re, key] of ALIASES) {
    if (re.test(tail)) return OUTPUT_TARGETS[key] ?? null;
  }
  return null;
}
function monacoLanguageForTarget(targetId) {
  return OUTPUT_TARGETS[targetId]?.monaco ?? targetId;
}
export {
  OUTPUT_TARGETS,
  analyzeQuality,
  compareSchemaTypes,
  compareSchemas,
  getDecisions,
  inferSchema,
  inferSchemaAsync,
  isJSONSchema,
  isOpenAPISpec,
  monacoLanguageForTarget,
  parseCurl,
  parseEnvFile,
  parseJSONSchema,
  parseOpenAPIComponents,
  parseXML,
  parseYAML,
  resolveSlugTarget,
  runEngine
};
