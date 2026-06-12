/**
 * SEO index policy: only whitelisted slugs are indexed.
 * Duplicate/near-duplicate slugs canonicalize to a primary slug.
 * JP pages are noindex unless listed in INDEXED_JP_SLUGS (original content, not translation).
 */

export const BASE_URL = 'https://typemorph.dev';

/** Primary EN converter pages — safe to index (unique editorial content). */
export const INDEXED_EN_SLUGS = new Set([
  // Tier 1: Core Web & Safety
  'json-to-typescript',
  'json-to-zod',
  'curl-to-fetch',
  'json-to-valibot',
  'json-to-arktype',
  'typescript-to-zod',
  'typescript-to-json-schema',

  // Tier 2: Databases & ORMs
  'sql-to-zod',
  'json-to-prisma-schema',
  'json-to-drizzle-schema',
  'json-to-kysely-schema',
  'json-to-mongoose-model',
  'json-to-postgres-schema',
  'json-to-mysql-schema',
  'json-to-sqlite-schema',
  'json-to-mongodb-schema',

  // Tier 3: Languages (High Demand)
  'json-to-go-struct',
  'json-to-rust-struct',
  'json-to-java-class',
  'json-to-python-dataclass',
  'json-to-dart-class',
  'json-to-kotlin-class',
  'json-to-swift-struct',
  'json-to-elixir-struct',
  'json-to-lua-table',

  // Tier 4: FinTech & Protocols
  'fix-to-typescript',
  'fix-to-json',
  'swift-to-typescript',
  'swift-mt103-to-json',
  'iso-20022-to-typescript',
  'protobuf-to-typescript',
  'graphql-to-typescript',

  // Tier 5: API Documentation & Config
  'json-to-openapi-3',
  'json-to-openapi-definition',
  'json-to-asyncapi-definition',
  'json-to-json-api-spec',
  'json-to-yaml',
  'json-to-toml',
  'dotenv-to-json',
  'env-to-typescript',

  // Tier 6: Testing & QA
  'json-to-jest-test',
  'json-to-playwright-test',
  'json-to-cypress-test',
  'json-to-postman-collection',
  'json-to-insomnia-export',

  // Tier 7: Utility Data
  'csv-to-json',
  'csv-to-typescript',
  'xml-to-json',
  'xml-to-typescript',
  'csv-to-sql',

  // Strategic Niche Expansion (Long-tail SEO)
  'json-to-bigquery-schema',
  'json-to-terraform-resource',
  'json-to-snowflake-table',
  'json-to-docker-compose',
  'json-to-swiftui-preview',
  'json-to-jetpack-compose-preview',
  'json-to-styled-components',
  'json-to-tailwind-config',
  'json-to-avro-avsc',
  'json-to-clickhouse-table',
  'json-to-neo4j-cypher',
  'json-to-pydantic',
  'json-to-laravel-migration',
  'json-to-django-model',
  'json-to-rails-migration',
  'json-to-mermaid',
  'json-to-latex-table',
  'json-to-markdown-table',
  'json-to-proto-definition',
  'json-to-grpc-web',

  // Niche Communities (Low Competition, High Rankability)
]);

/**
 * JP pages with hand-written original articles (not EN translation).
 * All other /jp/converters/* → noindex + canonical to EN.
 */
export const INDEXED_JP_SLUGS = new Set([
  'json-to-typescript',
  'json-to-zod',
  'sql-to-zod',
  'fix-to-typescript',
  'swift-to-typescript',
]);

/** Near-duplicate slugs → canonical primary (both get noindex if not primary). */
export const CANONICAL_SLUG: Record<string, string> = {
  'json-to-typescript-interface': 'json-to-typescript',
  'json-to-typescript-type': 'json-to-typescript',
  'json-to-typescript-zod': 'json-to-zod',
  'json-to-zod-schema': 'json-to-zod',
  'sql-to-typescript-interface': 'sql-to-zod',
};

export function resolveCanonicalSlug(slug: string): string {
  return CANONICAL_SLUG[slug] ?? slug;
}

export function shouldIndexEn(slug: string): boolean {
  const canonical = resolveCanonicalSlug(slug);
  return slug === canonical && INDEXED_EN_SLUGS.has(canonical);
}

export function shouldIndexJp(slug: string): boolean {
  const canonical = resolveCanonicalSlug(slug);
  return slug === canonical && INDEXED_JP_SLUGS.has(canonical);
}

export function enConverterUrl(slug: string): string {
  return `${BASE_URL}/converters/${resolveCanonicalSlug(slug)}`;
}

export function jpConverterUrl(slug: string): string {
  return `${BASE_URL}/jp/converters/${slug}`;
}

export type ConverterSeo = {
  index: boolean;
  canonical: string;
  robots: { index: boolean; follow: boolean };
};

export function getConverterSeo(slug: string, locale: 'en' | 'jp'): ConverterSeo {
  const canonicalSlug = resolveCanonicalSlug(slug);

  if (locale === 'jp') {
    const index = shouldIndexJp(slug);
    return {
      index,
      canonical: index ? jpConverterUrl(slug) : enConverterUrl(canonicalSlug),
      robots: { index, follow: true },
    };
  }

  const index = shouldIndexEn(slug);
  return {
    index,
    canonical: enConverterUrl(canonicalSlug),
    robots: { index, follow: true },
  };
}
