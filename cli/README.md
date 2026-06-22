# typemorph-cli

Schema engineering CLI — convert JSON, YAML, SQL, and OpenAPI to 40+ typed code formats, grade schema quality, and detect breaking changes between API versions.

[![npm](https://img.shields.io/npm/v/typemorph-cli)](https://www.npmjs.com/package/typemorph-cli)
[![npm downloads](https://img.shields.io/npm/dm/typemorph-cli)](https://www.npmjs.com/package/typemorph-cli)
[![node](https://img.shields.io/node/v/typemorph-cli)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/typemorph-cli)](LICENSE)

**Web UI:** [typemorph.dev](https://typemorph.dev)

---

## Install

```bash
npm install -g typemorph-cli
```

Or run without installing:

```bash
npx typemorph-cli typescript schema.json
```

---

## Quick Start

```bash
# Convert a JSON file to TypeScript interfaces
typemorph typescript user.json

# Pipe from curl or cat
curl -s https://api.example.com/users/1 | typemorph zod --root User

# Save output to a file
typemorph go schema.json --root Order > models.go

# Grade your schema quality
typemorph quality api-response.json

# Detect breaking changes between API versions
typemorph diff v1.json v2.json
```

---

## Commands

### `typemorph <format> [file]`

Convert JSON/YAML/OpenAPI to a target format. Reads from `[file]` or stdin.

```bash
typemorph typescript  schema.json
typemorph zod         schema.json --root User
typemorph go          schema.json > models.go
typemorph prisma      schema.json --root Post
cat payload.json | typemorph rust --root Event
```

**Options:**

| Flag | Short | Description |
|------|-------|-------------|
| `--root <name>` | `-r` | Root class/struct/type name (default: `Root`) |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

### `typemorph quality [file]`

Grade your schema on a 0–100 scale (A–F). Reports any issues: vague field names, implicit `any`, overly deep nesting, inconsistent naming.

```bash
typemorph quality schema.json
```

```
  Schema Quality Score  A  92/100

  Fields: 12  |  any: 0  |  optional: 3  |  naming: camelCase  |  depth: 2

  ✓ No issues found
```

### `typemorph diff <old> <new>`

Detect breaking changes between two JSON/schema files. Exits with code 1 if breaking changes are found (useful in CI).

```bash
typemorph diff v1.json v2.json
typemorph diff v1.json v2.json --breaking-only
```

```
  Breaking Change Detector  Compatibility 70/100  (−15/breaking · −5/warning)

  .userId
    ✖  Field type changed from string → number (breaking)
  .email
    ⚠  Field changed from required → optional

  1 breaking  ·  1 warnings  ·  0 info
```

**Options:**

| Flag | Description |
|------|-------------|
| `--breaking-only` | Only show breaking changes (severity: error) |

### `typemorph validate <schema> <outputs>`

Validate real JSON outputs (LLM structured output, API responses) against a Zod schema. Reports per-record pass/fail with human-readable diagnosis. Exits with code 1 if any output fails — useful in CI. 100% local: nothing is uploaded.

```bash
# Validate a batch of logged outputs against your schema
typemorph validate schema.ts responses.jsonl

# No schema yet? Infer one from known-good outputs
typemorph validate --infer good-responses.jsonl --out schema.ts
```

```
  TypeMorph validate  10 outputs

  ✓ 8 passed   ✗ 2 failed

  ✗ output #3
      "confidence": expected number, got string ("0.92")
        → model returned a quoted number → use z.coerce.number()
  ✗ output #7
      missing required field "sources" (expected string[])

  wrong type ×1  ·  missing field ×1
```

`<schema>` is a Zod source file (`.ts`/`.js`) or a JSON Schema. `<outputs>` is a JSON array, a single JSON object, or `.jsonl` (one object per line).

**Options:**

| Flag | Description |
|------|-------------|
| `--infer` | Infer a Zod schema from the outputs instead of validating |
| `--out <file>` | Write the inferred schema to a file (with `--infer`) |
| `--strict` | Treat warnings (extra fields, enum/format drift) as failures |
| `--format <fmt>` | Report format: `pretty` (default), `json`, or `github` (PR-comment markdown) |

Structural + advisory: it checks types, required fields, nulls, and shapes, and flags enum/format drift as warnings (never hard-failing an unknown value). A fast safety net — not a replacement for the Zod schema you own.

### `typemorph list`

Print all available output formats.

---

## Supported Formats

| Category | Formats |
|----------|---------|
| **TypeScript / Validation** | `typescript`, `zod`, `yup`, `joi`, `valibot` |
| **Backend languages** | `go`, `rust`, `java`, `csharp`, `python`, `swift`, `kotlin`, `php`, `dart` |
| **Databases & ORMs** | `prisma`, `mysql`, `postgres`, `sqlite`, `mongoose`, `sequelize`, `typeorm`, `drizzle`, `dynamodb`, `bigquery`, `mongodb` |
| **API / Schema** | `openapi`, `graphql`, `proto`, `jsonschema` |
| **Data / Markup** | `csv`, `sql`, `toml`, `yaml`, `avro` |
| **Docs / Mock** | `doc`, `mock` |

---

## Input Formats

TypeMorph CLI auto-detects the input type:

- **JSON** — plain JSON objects or arrays
- **YAML** — YAML documents
- **OpenAPI 3.x** — extracts component schemas
- **JSON Schema** — parses `$defs` / `definitions`

---

## CI Integration

Use `typemorph diff` in CI to block deployments when an API change breaks consumers:

```yaml
# GitHub Actions example
- name: Check for breaking API changes
  run: typemorph diff api/v1.json api/v2.json --breaking-only
```

Exit code `0` = no breaking changes. Exit code `1` = breaking changes detected.

---

## Examples

**JSON → Zod v4 schema with custom root name:**
```bash
echo '{"id":"abc","email":"x@y.com","score":42}' | typemorph zod --root User
```
```typescript
import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  email: z.email(),
  score: z.number(),
});

export type User = z.infer<typeof userSchema>;
```

**OpenAPI spec → Go structs:**
```bash
typemorph go openapi.yaml --root Pet > pet.go
```

**Batch convert (shell loop):**
```bash
for f in schemas/*.json; do
  typemorph typescript "$f" > "types/$(basename "$f" .json).ts"
done
```

---

## Requirements

- Node.js >= 18

---

## Links

- **Web UI:** [typemorph.dev](https://typemorph.dev)
- **GitHub:** [github.com/yhan86818-creator/typemorph](https://github.com/yhan86818-creator/typemorph)
- **npm:** [npmjs.com/package/typemorph-cli](https://www.npmjs.com/package/typemorph-cli)
