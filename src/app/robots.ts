import { MetadataRoute } from 'next';
import { INDEXED_EN_SLUGS, INDEXED_JP_SLUGS } from '@/lib/seo';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  // Allow only indexed converter slugs. All other /converters/* pages are
  // noindex but still crawlable by default — blocking them here prevents
  // Googlebot from reading thin/unfinished content that could hurt domain quality.
  const allowedEnConverters = Array.from(INDEXED_EN_SLUGS).map(
    (slug) => `/converters/${slug}`
  );
  const allowedJpConverters = Array.from(INDEXED_JP_SLUGS).map(
    (slug) => `/jp/converters/${slug}`
  );

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          ...allowedEnConverters,
          ...allowedJpConverters,
        ],
        disallow: [
          '/admin',
          '/converters/',
          '/jp/converters/',
        ],
      },
    ],
    sitemap: 'https://typemorph.dev/sitemap.xml',
  };
}
