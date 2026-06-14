"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));

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
var import_crypto = require("crypto");

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

// ../../src/lib/analytics.ts
function gtagEvent(event, params) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", event, params);
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
  const hash = (0, import_crypto.createHash)("sha256").update(canonical).digest("hex");
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

// src/extension.ts
function buildPickItems() {
  const tier1 = Object.values(OUTPUT_TARGETS).filter((t) => t.tier === 1);
  const tier2 = Object.values(OUTPUT_TARGETS).filter((t) => t.tier === 2);
  return [
    { label: "Popular", kind: vscode.QuickPickItemKind.Separator },
    ...tier1.map((t) => ({ label: t.label, description: t.key })),
    { label: "More", kind: vscode.QuickPickItemKind.Separator },
    ...tier2.map((t) => ({ label: t.label, description: t.key }))
  ];
}
function parseInput(text) {
  let obj;
  try {
    obj = JSON.parse(text);
  } catch {
    try {
      obj = parseYAML(text);
    } catch {
      return null;
    }
  }
  if (isOpenAPISpec(obj)) {
    const schemas = parseOpenAPIComponents(obj);
    return { json: obj, schemas };
  }
  if (isJSONSchema(obj)) {
    const schemas = parseJSONSchema(obj);
    return { json: obj, schemas };
  }
  return { json: obj, schemas: [{ name: "Root", schema: inferSchema(obj) }] };
}
function vscodeLang(key) {
  return OUTPUT_TARGETS[key]?.monaco ?? "plaintext";
}
async function cmdConvert() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("TypeMorph: Open a file first.");
    return;
  }
  const sel = editor.selection;
  const text = editor.document.getText(sel.isEmpty ? void 0 : sel).trim();
  if (!text) {
    vscode.window.showErrorMessage("TypeMorph: No content to convert.");
    return;
  }
  const parsed = parseInput(text);
  if (!parsed) {
    vscode.window.showErrorMessage("TypeMorph: Input is not valid JSON or YAML.");
    return;
  }
  const picked = await vscode.window.showQuickPick(buildPickItems(), {
    placeHolder: "Convert to\u2026",
    matchOnDescription: true
  });
  if (!picked || picked.kind === vscode.QuickPickItemKind.Separator) return;
  const targetKey = picked.description;
  const output = runEngine(parsed.json, targetKey);
  if (!output || output.startsWith("// Unsupported")) {
    vscode.window.showErrorMessage(`TypeMorph: Format "${targetKey}" is not supported for this input.`);
    return;
  }
  const doc = await vscode.workspace.openTextDocument({ content: output, language: vscodeLang(targetKey) });
  await vscode.window.showTextDocument(doc, vscode.ViewColumn.Beside);
}
async function cmdQuality() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return;
  const text = editor.document.getText().trim();
  const parsed = parseInput(text);
  if (!parsed) {
    vscode.window.showErrorMessage("TypeMorph: Input is not valid JSON or YAML.");
    return;
  }
  const schema2 = parsed.schemas[0]?.schema ?? inferSchema(parsed.json);
  const result = analyzeQuality(schema2);
  const icon = result.grade === "A" ? "$(pass)" : result.grade === "B" ? "$(info)" : "$(warning)";
  const msg = `${icon} Schema Quality: ${result.grade}  (${result.score}/100)`;
  const detail = result.issues.length ? result.issues.map((i) => `\u2022 ${i.message}`).join("\n") : "No issues found.";
  vscode.window.showInformationMessage(msg, { detail, modal: false });
}
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand("typemorph.convert", cmdConvert),
    vscode.commands.registerCommand("typemorph.quality", cmdQuality)
  );
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
