# TypeMorph

> **100% browser-local schema engineering workbench.**

[![Live](https://img.shields.io/badge/Live-typemorph.dev-3B82F6?style=for-the-badge&logo=cloudflare&logoColor=white)](https://typemorph.dev)
[![npm](https://img.shields.io/npm/v/typemorph-cli?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/typemorph-cli)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

Paste any JSON, YAML, SQL DDL, OpenAPI spec, or TypeScript interface — TypeMorph infers the schema once and compiles it to 18+ typed outputs simultaneously, entirely inside your browser.

---

## Features

- **18+ output formats** — TypeScript, Zod, Go, Rust, Python, Java, Kotlin, Swift, C#, Dart, PHP, GraphQL, Prisma, Protobuf, JSON Schema, Mock JSON, SQL, Mermaid ER
- **Schema Quality Score** — local rule-based grading (A–F) with field-level feedback
- **Breaking Change Detector** — semantic diff between two schema versions with severity scoring
- **Schema Library** — save and restore schemas across sessions (localStorage, 50 slots)
- **CLI** — `typemorph-cli` on npm for scripting and CI pipelines
- **100% local** — no server, no upload endpoint, no cloud processing

---

## How it works

```
Input (JSON / YAML / SQL / OpenAPI / TypeScript)
  └─► inferSchema()  →  Schema AST
        └─► generators  →  TypeScript, Zod, Go, Rust, Python … (18 targets)
```

All parsing and code generation runs in your browser via a single AST pipeline. Your schema never leaves your machine.

---

## CLI

```bash
npm install -g typemorph-cli

typemorph zod schema.json          # convert to Zod
typemorph typescript schema.json   # convert to TypeScript
typemorph quality schema.json      # schema quality score
typemorph diff v1.json v2.json     # breaking change detection
typemorph list                     # list all supported formats
```

---

## Local development

```bash
git clone https://github.com/yhan86818-creator/typemorph.git
cd typemorph
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Run tests:**
```bash
npx vitest run
```

**Build static export:**
```bash
npm run build
# output → out/
```

**Deploy to Cloudflare Pages:**
```bash
npx wrangler pages deploy out --project-name your-project
```

---

## Tech stack

- Next.js (static export)
- Tailwind CSS v4
- Monaco Editor
- Vitest
- esbuild (CLI bundler)
- Cloudflare Pages

---

## License

MIT — see [LICENSE](LICENSE).
