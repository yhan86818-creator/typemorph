# typemorph-cli

**Convert JSON to Zod, TypeScript, Go, and 40+ more — with real type inference.** Most converters dump every field to `z.string()`. typemorph reads your actual JSON and detects emails, UUIDs, URLs, datetimes, enums, and `int` vs `float` — then converts to any language, grades schema quality, and catches breaking API changes in CI.

[![npm](https://img.shields.io/npm/v/typemorph-cli)](https://www.npmjs.com/package/typemorph-cli)
[![npm downloads](https://img.shields.io/npm/dm/typemorph-cli)](https://www.npmjs.com/package/typemorph-cli)
[![node](https://img.shields.io/node/v/typemorph-cli)](https://nodejs.org)
[![license](https://img.shields.io/npm/l/typemorph-cli)](LICENSE)

**Web UI:** [typemorph.dev](https://typemorph.dev)

---

## Why typemorph-cli

- **Real inference, not `z.string()`** — detects `email`, `uuid`, `url`, `datetime`, enums, and `int` vs `float` from your real JSON, plus shared and nested types.
- **One input → 40+ outputs** — JSON / YAML / SQL / OpenAPI / JSON Schema → Zod, TypeScript, Go, Rust, Prisma, Drizzle, and more.
- **No OpenAPI spec required** — `check` detects API schema drift directly from live responses. No spec file, no config, no vendor lock-in.
- **CI-ready & 100% local** — `check` and `diff` block breaking API changes in CI; `validate` checks LLM/API outputs against your schema. Nothing is uploaded.

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

# Watch a live API for schema drift — no spec file needed
curl -s https://api.example.com/users/1 | typemorph check --baseline .typemorph/users.json
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

### `typemorph check [file] --baseline <path>`

Detect API schema drift against a saved baseline — **no OpenAPI spec required**. On the first run it saves a baseline snapshot. On subsequent runs it compares the live response against that snapshot and exits with code 1 if breaking changes are found.

Works with any JSON API: your own services, third-party APIs, or LLM structured outputs.

```bash
# First run: saves baseline
curl -s https://api.example.com/users/1 | typemorph check --baseline .typemorph/users.json

# Subsequent runs: compares against baseline
curl -s https://api.example.com/users/1 | typemorph check --baseline .typemorph/users.json

# File input instead of URL
typemorph check response.json --baseline .typemorph/users.json

# With authentication
curl -s -H "Authorization: Bearer $TOKEN" https://api.example.com/me | \
  typemorph check --baseline .typemorph/me.json

# Update baseline without failing (useful for intentional changes)
curl -s https://api.example.com/users/1 | typemorph check --baseline .typemorph/users.json --update

# GitHub Actions PR comment format
curl -s https://api.example.com/users/1 | typemorph check --baseline .typemorph/users.json --format github
```

```
  API Schema Drift Check  ✖ 2 breaking changes

  email
    ✖  Required field 'email' was removed. This is a breaking change.
  id
    ✖  'id' changed type from 'number' to 'string'.

  2 breaking  ·  0 warnings  ·  0 info
  baseline: .typemorph/users.json
```

**Options:**

| Flag | Description |
|------|-------------|
| `--baseline <file>` | Path to baseline snapshot (required) |
| `--update` | Update baseline instead of failing on drift |
| `--header <Key: Value>` | HTTP header, repeatable (for auth) |
| `--format <fmt>` | `pretty` (default), `json`, or `github` |

**Commit your baselines to Git** (`.typemorph/*.json`) so every CI run compares against the same reference point.

---

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
| **AI Tools** | `mcp-tool`, `openai-function`, `vercel-ai-tool` |
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

### Detect live API drift (no spec file needed)

Commit your baseline once, then let CI catch any drift:

```yaml
# .github/workflows/api-check.yml
name: API Schema Check
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check /users endpoint
        run: |
          curl -s https://api.example.com/users/1 | \
          npx typemorph-cli check \
            --baseline .typemorph/users.json \
            --format github >> $GITHUB_STEP_SUMMARY
```

### Detect breaking changes between spec files

```yaml
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

**JSON → MCP tool definition:**
```bash
echo '{"userId":"usr_123","query":"laptops","limit":10}' | typemorph mcp-tool --root SearchProducts
```
```typescript
server.tool(
  "searchProducts",
  "Auto-generated MCP tool — replace with a meaningful description",
  {
    userId: z.uuid().describe('Unique identifier'),
    query: z.string().describe('query'),
    limit: z.number().int().describe('limit'),
  },
  async (args) => ({ content: [{ type: "text", text: JSON.stringify(args) }] })
);
```

**JSON → OpenAI function calling schema:**
```bash
echo '{"userId":"usr_123","query":"laptops","limit":10}' | typemorph openai-function --root SearchProducts
```

**JSON → Vercel AI SDK tool:**
```bash
echo '{"userId":"usr_123","query":"laptops","limit":10}' | typemorph vercel-ai-tool --root SearchProducts
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
