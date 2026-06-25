# TypeMorph — JSON to Zod / TypeScript / Go · 160+ Schema Formats · Runs in Your Browser

> Convert JSON, YAML, OpenAPI, or JSON Schema to Zod, TypeScript, Go, Rust, Prisma, and 160+ more formats.  
> Real type inference — detects `email`, `uuid`, `url`, `datetime`, enums, and `int` vs `float` from your actual data.  
> 100% browser-local. No sign-up. No upload.

[![Live](https://img.shields.io/badge/Live-typemorph.dev-3B82F6?style=for-the-badge&logo=cloudflare&logoColor=white)](https://typemorph.dev)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=TypeMorph.typemorph-vscode)
[![npm](https://img.shields.io/npm/v/typemorph-cli?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/typemorph-cli)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

![TypeMorph — paste JSON, get Zod with real type inference](https://raw.githubusercontent.com/yhan86818-creator/typemorph/main/public/readme-screenshot.png)

---

## What makes TypeMorph different

Most JSON-to-schema converters output `z.string()` for everything. TypeMorph reads your actual values:

```
Input JSON                TypeMorph output           Other tools
─────────────────────    ────────────────────────    ────────────────
"id": "a1b2-c3d4..."  →  z.uuid()                   z.string()
"email": "x@y.com"   →  z.email()                   z.string()
"site": "https://…"  →  z.url()                     z.string()
"ts": "2024-01-01T…" →  z.iso.datetime()             z.string()
"age": 25            →  z.number().int().min(0)      z.number()
"role": "admin"      →  z.enum(["admin","user"])     z.string()
```

---

## Features

### Schema Conversion (160+ formats)
- **JSON / YAML / OpenAPI / JSON Schema** → any output format
- **TypeScript, Zod v4, Yup, Joi, Valibot** — validation-ready schemas
- **Go, Rust, Java, Python, Kotlin, Swift, C#, Dart, PHP** — backend structs
- **Prisma, Drizzle, Kysely, Mongoose, Sequelize, TypeORM** — ORM schemas
- **MySQL, Postgres, SQLite, DynamoDB, BigQuery, MongoDB** — database schemas
- **OpenAPI, GraphQL, Protobuf, JSON Schema** — API specs
- **MCP tool, OpenAI function calling, Vercel AI SDK tool** — AI agent tool definitions

### CI / Monitoring
- **`check`** — detect API schema drift from live responses, no OpenAPI spec needed
- **`envdiff`** — compare staging vs production API schemas directly
- **`diff`** — semantic breaking change detection between two schema files
- **`validate`** — validate LLM/API JSON outputs against a Zod schema

### Developer Tools
- **Schema Quality Score** — A–F grading with field-level improvement suggestions
- **VS Code Extension** — convert schemas with `Ctrl+Shift+T` without leaving your editor
- **CLI** — `typemorph-cli` on npm for scripting and CI pipelines
- **Reverse** — generate JSON samples from TypeScript interfaces

---

## Quick start

**Web (no install):** [typemorph.dev](https://typemorph.dev)

**VS Code Extension:**
```
ext install TypeMorph.typemorph-vscode
```
Open any `.json`, `.yaml`, or `.ts` file → `Ctrl+Shift+T` → pick your output format.

**CLI:**
```bash
npx typemorph-cli zod schema.json --root User
npx typemorph-cli typescript schema.json
npx typemorph-cli go schema.json > models.go
npx typemorph-cli mcp-tool schema.json --root SearchTool
```

---

## Use cases

### API response → Zod schema in seconds
```bash
curl -s https://api.example.com/users/1 | npx typemorph-cli zod --root User
```
Paste any API response and get a production-ready Zod schema with semantic validators.

### Detect API schema drift in CI (no OpenAPI spec needed)
```bash
# Save baseline on first run
curl -s https://api.example.com/users/1 \
  | npx typemorph-cli check --baseline .typemorph/users.json

# Future runs compare against baseline — exits 1 on breaking changes
curl -s https://api.example.com/users/1 \
  | npx typemorph-cli check --baseline .typemorph/users.json
```
Works with any JSON API, including third-party ones without OpenAPI specs.

### Compare staging vs production
```bash
npx typemorph-cli envdiff \
  --a https://staging.api.com/users/1 \
  --b https://prod.api.com/users/1
```

### Generate AI tool definitions
```bash
# MCP tool definition
npx typemorph-cli mcp-tool schema.json --root SearchProducts

# OpenAI function calling
npx typemorph-cli openai-function schema.json --root GetOrder

# Vercel AI SDK
npx typemorph-cli vercel-ai-tool schema.json --root FetchUser
```

### Database schema from JSON
```bash
npx typemorph-cli prisma api-response.json --root User > schema.prisma
npx typemorph-cli drizzle api-response.json > schema.ts
npx typemorph-cli postgres api-response.json > migration.sql
```

### Microservice schema sharing
Convert a shared JSON contract to Go structs, TypeScript interfaces, and Protobuf in one command:
```bash
npx typemorph-cli go       contract.json > models.go
npx typemorph-cli typescript contract.json > types.ts
npx typemorph-cli proto    contract.json > schema.proto
```

---

## GitHub Actions — API drift detection

```yaml
name: API Schema Check
on: [push, pull_request]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check /users endpoint for schema drift
        run: |
          curl -s https://api.example.com/users/1 | \
          npx typemorph-cli check \
            --baseline .typemorph/users.json \
            --format github >> $GITHUB_STEP_SUMMARY
```

---

## VS Code Extension

**Install:** [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=TypeMorph.typemorph-vscode)

- `Ctrl+Shift+T` — convert current file or selection to any format
- Right-click → **TypeMorph: Check Schema Quality**
- Works with `.json`, `.yaml`, `.ts`, OpenAPI specs

---

## CLI reference

```bash
typemorph <format>   [file]              # convert to target format
typemorph quality    [file]              # schema quality score (A–F)
typemorph diff       <old> <new>         # breaking change detection
typemorph check      --baseline <file>   # API drift detection
typemorph envdiff    --a <url> --b <url> # compare two live environments
typemorph validate   <schema> <outputs>  # validate LLM/API outputs
typemorph reverse    [file.ts]           # TypeScript → JSON sample
typemorph list                           # all supported formats
```

Full docs: [npmjs.com/package/typemorph-cli](https://www.npmjs.com/package/typemorph-cli)

---

## How it works

```
Input (JSON / YAML / OpenAPI / JSON Schema / TypeScript)
  └─► inferSchema()  →  Schema AST  →  160+ generators
        └─► Zod, TypeScript, Go, Rust, Prisma, MCP, OpenAI …
```

All inference and code generation run in your browser (or Node.js for the CLI). Your data never leaves your machine.

---

## Local development

```bash
git clone https://github.com/yhan86818-creator/typemorph.git
cd typemorph
npm install
npm run dev        # http://localhost:3000
npx vitest run     # run tests
npm run build      # static export → out/
```

---

## Tech stack

Next.js · Tailwind CSS v4 · Monaco Editor · Vitest · esbuild · Cloudflare Pages

---

## License

MIT — see [LICENSE](LICENSE).
