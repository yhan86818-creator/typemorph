# TypeMorph for VS Code

Convert JSON, YAML, OpenAPI, and JSON Schema into 160+ output formats — without leaving your editor.

## Features

- **Convert any schema** — paste JSON or YAML, pick a target format, get code instantly in a side panel
- **160+ output formats** — TypeScript, Zod, Go, Rust, Python, Prisma, SQL, React Props, and more
- **Schema Quality Score** — grades your schema A–F and flags issues (missing types, naming inconsistency, deep nesting)
- **OpenAPI & JSON Schema aware** — automatically detects and parses multi-component specs
- **100% local** — no network requests, no API keys, no data leaves your machine

## Usage

### Convert a schema

1. Open a JSON or YAML file (or paste schema content into any file)
2. Press `Ctrl+Shift+T` (`Cmd+Shift+T` on Mac) — or right-click → **TypeMorph: Convert Schema…**
3. Pick a target format from the list
4. Output appears in a side panel with syntax highlighting

You can also select a portion of a file and convert just that selection.

### Check schema quality

Right-click → **TypeMorph: Check Schema Quality**

Returns a grade (A–F) and a list of issues such as:
- Fields typed as `any`
- Missing format constraints (uuid, email, datetime…)
- Mixed camelCase / snake_case naming
- Overly deep nesting

## Supported Input Formats

| Format | Example |
|---|---|
| JSON | `{ "id": 1, "name": "Alice" }` |
| YAML | `id: 1\nname: Alice` |
| OpenAPI 3.x | Full spec with `components/schemas` |
| JSON Schema | `{ "$schema": "...", "properties": {...} }` |

## Popular Output Formats

**Tier 1 — fully tested**

TypeScript · Zod · Go · Rust · Python (Pydantic) · Java · C# · Swift · Kotlin · PHP · Dart · GraphQL · Protobuf · JSON Schema · Prisma

**Tier 2 — scaffold output**

MySQL · PostgreSQL · SQLite · Mongoose · TypeORM · Drizzle · Kysely · Sequelize · Yup · Joi · Valibot · React Props · React Query · Vue Props · Pinia · Redux Slice · Next.js API Route · Django · Rails · OpenAPI · Postman · cURL · Mermaid · and more

## Commands

| Command | Shortcut | Description |
|---|---|---|
| TypeMorph: Convert Schema… | `Ctrl+Shift+T` | Convert current file or selection |
| TypeMorph: Check Schema Quality | — | Grade the schema and list issues |

## Web Version

Need more formats or want to share a conversion? Try the full web app at **[typemorph.dev](https://typemorph.dev)** — same engine, browser-based, no install required.

## License

MIT
