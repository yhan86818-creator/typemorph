import { MetadataRoute } from 'next';
import { converters } from '@/data/converters';

export const dynamic = 'force-static';

const blogPosts = [
  'security-risks-of-online-converters',
  'nextjs-type-safety-workflow',
  'schema-first-engineering-future',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://typeflow-pro.pages.dev';

  const toolEntries = converters.map((c) => ({
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

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    ...blogEntries,
    ...toolEntries,
  ];
}
