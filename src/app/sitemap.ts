import { MetadataRoute } from 'next';
import { converters } from '@/data/converters';
import { alternatives } from '@/data/alternatives';
import { BASE_URL, INDEXED_EN_SLUGS, INDEXED_JP_SLUGS, resolveCanonicalSlug } from '@/lib/seo';

export const dynamic = 'force-static';

const blogPosts = [
  'security-risks-of-online-converters',
  'nextjs-type-safety-workflow',
  'schema-first-engineering-future',
  'json-to-typescript-complete-guide',
  'local-first-tools-for-fintech',
  'zod-vs-yup-vs-valibot',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = BASE_URL;

  const toolEntries = converters
    .filter((c) => INDEXED_EN_SLUGS.has(c.slug) && resolveCanonicalSlug(c.slug) === c.slug)
    .map((c) => ({
      url: `${baseUrl}/converters/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }));

  const blogEntries = blogPosts.map((slug) => ({
    url: `${baseUrl}/blog/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.9,
  }));

  const toolEntriesJP = converters
    .filter((c) => INDEXED_JP_SLUGS.has(c.slug))
    .map((c) => ({
      url: `${baseUrl}/jp/converters/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/finance`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly' as const,
      priority: 0.3,
    },
    ...blogEntries,
    ...toolEntries,
    ...toolEntriesJP,
    ...alternatives.map((a) => ({
      url: `${baseUrl}/alternatives/${a.slug}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
