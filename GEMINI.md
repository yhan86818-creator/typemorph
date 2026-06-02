# TypeFlow Pro - Engineering Standards

## Project Context
TypeFlow Pro is a high-performance, local-first schema engineering workbench. Its core value proposition is **100% private**, local data processing combined with professional-grade code generation.

## Core Mandates
1. **Security**: No data should ever leave the browser unless explicitly requested (e.g., via the user's BYOK Gemini API key).
2. **"Real-World Test" Protocol (Mandatory)**: 
   - Every change to the inference engine (`engine.ts`) or any generator (`generators.ts`, `generators-extended.ts`) must be validated using the established integration test pattern.
   - Use `vitest` to verify output across major target languages (Rust, Go, Prisma, SQL, etc.) using a complex JSON payload.
   - Assert for language-specific professional details: reserved keyword escaping, correct numeric types (`Int` vs `Float`), and relation definitions.
3. **AST-Driven Architecture**:
   - Always prefer modifying the AST conversion logic (`ast.ts`) for structural optimizations (e.g., shared type extraction).
   - Reserve language-specific "syntax" fixes for the individual generators.

## Recent Architectural Improvements (2026-06-02)
- **Unified Routing**: The inference engine uses a unified routing logic that handles both explicit language names and SEO-slugs, preventing fallbacks to raw JSON.
- **Strict Numeric Inference**: Numbers are now categorized as `int` or `float` at the schema level, enabling precise mapping to `i64/f64`, `BIGINT/DOUBLE`, etc.
- **Reserved Keyword Safety**: Rust and Go generators automatically handle naming collisions with language keywords.
- **Prisma Relations**: Nested object structures are automatically converted to valid Prisma `@relation` definitions.

## Deployment Workflow
- **Build**: `npm run build` (Ensures static page generation for 600+ paths).
- **Verify**: Always run `npm test` before deploying.
- **Deploy**: `npx wrangler pages deploy out --project-name typeflow-pro` (Cloudflare Pages).
