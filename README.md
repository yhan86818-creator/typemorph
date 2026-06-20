# TypeMorph

> **100% browser-local schema conversion workbench.**

[![Live](https://img.shields.io/badge/Live-typemorph.dev-3B82F6?style=for-the-badge&logo=cloudflare&logoColor=white)](https://typemorph.dev)
[![VS Code](https://img.shields.io/badge/VS%20Code-Extension-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](https://marketplace.visualstudio.com/items?itemName=TypeMorph.typemorph-vscode)
[![npm](https://img.shields.io/npm/v/typemorph-cli?style=for-the-badge&logo=npm&color=CB3837)](https://www.npmjs.com/package/typemorph-cli)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)

Paste any JSON, YAML, OpenAPI spec, or JSON Schema — TypeMorph infers the schema and converts it across 160+ converters covering 17 fully-tested core formats (plus more in beta), entirely inside your browser.

---

## Features

- **160+ converters** — across 17 fully-tested core targets (TypeScript, Zod, Go, Rust, Python, Java, Kotlin, Swift, C#, Dart, PHP, GraphQL, Prisma, Protobuf, SQL, Mermaid) plus additional scaffold/beta targets
- **Schema Quality Score** — A–F grading with field-level feedback
- **Breaking Change Detector** — semantic diff between two schema versions with severity scoring
- **VS Code Extension** — convert schemas without leaving your editor (`Ctrl+Shift+T`)
- **CLI** — `typemorph-cli` on npm for scripting and CI pipelines
- **Local-first conversion** — all schema inference and code generation run in your browser; your data is never uploaded unless you explicitly click Share

---

## How it works

```
Input (JSON / YAML / SQL / OpenAPI / TypeScript)
  └─► inferSchema()  →  Schema AST
        └─► generators  →  TypeScript, Zod, Go, Rust, Python … (17 core targets + beta)
```

All parsing and code generation runs in your browser via a single AST pipeline. Your schema never leaves your machine unless you explicitly use the Share feature (which uploads a compressed copy so the link can be opened elsewhere).

---

## VS Code Extension

Install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=TypeMorph.typemorph-vscode).

- `Ctrl+Shift+T` — convert current file or selection
- Right-click → **TypeMorph: Check Schema Quality**

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
