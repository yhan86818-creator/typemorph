import React from 'react';
import Link from 'next/link';
import TypeMorphApp from '../../page';
import { converters } from '@/data/converters';
import fs from 'fs';
import path from 'path';
import { notFound } from 'next/navigation';
import { ShieldCheck, Crown, ArrowRight, BookOpen, Activity } from 'lucide-react';
import { getConverterSeo } from '@/lib/seo';

const blogPosts = [
  {
    slug: 'security-risks-of-online-converters',
    title: 'The Hidden Security Risks of Online JSON Converters',
    excerpt: 'Why pasting proprietary company data into third-party web tools is a major liability, and how to stay safe.',
    category: 'Security Analysis',
    categoryColor: 'text-blue-600',
    keywords: ['json', 'security', 'typescript', 'zod', 'prisma', 'env', 'sql'],
  },
  {
    slug: 'nextjs-type-safety-workflow',
    title: 'Ultimate Type-Safe Workflow for Next.js 15',
    excerpt: 'A deep dive into combining Zod, React Query, and TypeScript for bulletproof API integration.',
    category: 'Engineering Guide',
    categoryColor: 'text-purple-600',
    keywords: ['typescript', 'zod', 'react', 'nextjs', 'query', 'prisma', 'graphql'],
  },
  {
    slug: 'schema-first-engineering-future',
    title: 'Beyond Code Generation: Why Schema-First Engineering is the Future',
    excerpt: 'Code generation is just the beginning. Discover how a schema-first approach can eliminate 90% of your integration bugs.',
    category: 'Architectural Insight',
    categoryColor: 'text-blue-600',
    keywords: ['architecture', 'schema', 'zod', 'typescript', 'automation'],
  },
];

export async function generateStaticParams() {
  return converters.map((c) => ({
    slug: c.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const converter = converters.find((c) => c.slug === slug);
  const seo = getConverterSeo(slug, 'en');

  return {
    title: converter?.title || 'Developer Converter Tool',
    description: converter?.description || 'Secure local-first developer utility.',
    alternates: {
      canonical: seo.canonical,
    },
    robots: seo.robots,
    openGraph: {
      title: converter?.title,
      description: converter?.description,
      url: seo.canonical,
      siteName: 'TypeMorph',
      type: 'website',
    },
  };
}

export default async function ConverterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const converter = converters.find((c) => c.slug === slug);

  if (!converter) return notFound();

  let fileContent = '';
  try {
    const contentPath = path.join(process.cwd(), 'src', 'data', 'content', `${slug}.html`);
    fileContent = fs.readFileSync(contentPath, 'utf8');
  } catch (e) {
    console.error(`Content not found for ${slug}`);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": converter.title,
    "description": converter.description,
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://typemorph.dev" },
      { "@type": "ListItem", "position": 2, "name": "Converters", "item": "https://typemorph.dev/converters" },
      { "@type": "ListItem", "position": 3, "name": converter.title, "item": `https://typemorph.dev/converters/${slug}` }
    ]
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": `Is ${converter.title} free to use?`,
        "acceptedAnswer": { "@type": "Answer", "text": "Yes. TypeMorph's core conversion engine is 100% free with no account required." }
      },
      {
        "@type": "Question",
        "name": `Does ${converter.title} send my data to a server?`,
        "acceptedAnswer": { "@type": "Answer", "text": "No. TypeMorph is local-first. All processing happens entirely in your browser using Web Workers. Your data never leaves your machine." }
      },
      {
        "@type": "Question",
        "name": `Can I use ${converter.title} for enterprise or GDPR-sensitive data?`,
        "acceptedAnswer": { "@type": "Answer", "text": "Absolutely. Because TypeMorph operates in a local-first architecture with zero server transmission, it is suitable for GDPR-compliant and SOC2-compliant workflows." }
      }
    ]
  };

  // Safe fallback content generator (Build-time only)
  const generateFallbackContent = (c: any) => {
    const name = c.title.split(' - ')[0];
    const tech = c.slug.split('-').pop()?.toUpperCase();
    
    return `
      <p>The <strong>${c.title}</strong> is a specialized utility designed to seamlessly transform data structures securely within your browser.</p>
      
      <h2>Local-First Processing</h2>
      <p>Unlike server-based tools, this converter uses the <strong>${name}</strong> engine to process everything locally. Your JSON, SQL, or API data never leaves your machine, ensuring full privacy and compliance with enterprise security standards.</p>
      
      <h2>Core Features</h2>
      <ul>
        <li><strong>Instant Conversion:</strong> The ${tech} output is generated in real-time as you type or paste your data.</li>
        <li><strong>Privacy Guaranteed:</strong> Zero data transmission. All processing happens in an isolated Web Worker.</li>
        <li><strong>Professional Syntax:</strong> The generated code adheres strictly to standard ${tech} idioms and best practices.</li>
      </ul>
    `;
  };

  const contentToDisplay = fileContent || generateFallbackContent(converter);

  return (
    <div className="relative bg-[#F8FAFC]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      {/* Re-using the main app logic but initialized for this specific context */}
      {/* Breadcrumbs at top */}
      <div className="max-w-7xl mx-auto px-6 pt-12 -mb-12 relative z-10">
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <Link prefetch={false} href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link prefetch={false} href="/converters" className="hover:text-blue-600">Converters</Link>
          <span>/</span>
          <span className="text-blue-600">{converter.category}</span>
        </nav>
      </div>

      <TypeMorphApp defaultView="app" initialSlug={slug} />

      {/* Technical Manual / Documentation Section */}
      <div className="max-w-4xl mx-auto px-6 py-32 border-t border-slate-100 mt-24">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-6">
            <ShieldCheck size={12} /> {converter.category} • Engineering Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-slate-900 leading-tight">
            {converter.h1 || converter.title}
          </h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
            This technical guide provides an in-depth analysis of the <strong>{converter.slug.replace(/-/g, ' ')}</strong> engine, best practices for implementation, and data security standards.
          </p>
        </div>

        {converter.category === "Financial Engineering" && (
          <div className="mb-16 p-10 rounded-[3rem] bg-emerald-900 text-white relative overflow-hidden shadow-2xl shadow-emerald-900/20">
            <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
              <Activity size={180} />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[10px] uppercase tracking-widest mb-6 border border-emerald-500/30">
                <Crown size={12} /> Institutional Grade Utility
              </div>
              <h2 className="text-3xl font-black mb-4 tracking-tight">Need Advanced Financial Parsing?</h2>
              <p className="text-emerald-100/70 font-medium text-lg mb-8 max-w-xl leading-relaxed">
                Unlock the full power of the <strong>FinFlow Pro</strong> workbench. Specifically designed for FIX, SWIFT MT/MX, and ISO 20022 message inspection with industrial-grade accuracy.
              </p>
              <a 
                href="https://finflow-pro.pages.dev" 
                target="_blank"
                className="inline-flex items-center gap-3 bg-emerald-500 text-emerald-950 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-white transition-all shadow-xl shadow-emerald-500/20"
              >
                Launch FinFlow Pro <ArrowRight size={16} />
              </a>
            </div>
          </div>
        )}

        <div 
          className="prose prose-slate lg:prose-lg max-w-none 
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
          prose-p:text-slate-600 prose-p:leading-relaxed prose-p:font-medium
          prose-strong:text-slate-900 prose-strong:font-black
          prose-ul:list-disc prose-li:text-slate-600 prose-li:font-medium
          prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:bg-blue-50/50 prose-blockquote:p-8 prose-blockquote:rounded-r-3xl prose-blockquote:not-italic
          prose-img:rounded-3xl prose-img:shadow-2xl"
          dangerouslySetInnerHTML={{ __html: contentToDisplay }}
        />
        
        <div className="mt-24 p-12 rounded-[3rem] bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Crown size={120} />
          </div>
          <h3 className="text-2xl font-black mb-8 text-slate-900">Developer FAQ</h3>
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <p className="font-black text-slate-900 mb-2">Is the processing local-only?</p>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">Absolutely. TypeMorph operates entirely within your browser&apos;s sandbox. We use Web Workers for high-performance computation without ever transmitting your JSON, SQL, or API data to a remote server.</p>
            </div>
            <div>
              <p className="font-black text-slate-900 mb-2">Can I use this for enterprise projects?</p>
              <p className="text-sm text-slate-500 leading-relaxed font-medium">Yes. The tool is designed for professional software engineers who require GDPR compliance and data privacy. It is trusted by developers at top-tier startups and financial institutions.</p>
            </div>
          </div>
        </div>
        {/* Blog Articles Section */}
        {(() => {
          const slugWords = slug.split('-');
          const relatedPosts = blogPosts.filter(post =>
            post.keywords.some(kw => slugWords.includes(kw))
          );
          if (relatedPosts.length === 0) return null;
          return (
            <div className="mt-20 pt-20 border-t border-slate-200">
              <div className="flex items-center gap-3 mb-8">
                <BookOpen size={20} className="text-blue-600" />
                <h2 className="text-2xl font-black">From the Engineering Blog</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {relatedPosts.map(post => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group p-8 rounded-[2rem] bg-white border border-slate-200 hover:border-blue-400 transition-all shadow-sm hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className={`text-[10px] font-black uppercase tracking-widest mb-4 ${post.categoryColor}`}>{post.category}</div>
                    <h3 className="text-lg font-black text-slate-900 mb-3 group-hover:text-blue-600 transition-colors leading-tight">{post.title}</h3>
                    <p className="text-sm text-slate-500 font-medium mb-6 line-clamp-2">{post.excerpt}</p>
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">
                      Read Article <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Related Utilities */}
        <div className="mt-20 pt-20 border-t border-slate-200">
          <h2 className="text-2xl font-black mb-8">Related Utilities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {converters
              .filter(c => c.slug !== slug)
              .sort((a, b) => {
                const currentWords = slug.split('-');
                const aScore = a.slug.split('-').filter(w => currentWords.includes(w)).length;
                const bScore = b.slug.split('-').filter(w => currentWords.includes(w)).length;
                if (aScore !== bScore) return bScore - aScore;
                const hashA = a.slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const hashB = b.slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const currentHash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                return (hashA ^ currentHash) - (hashB ^ currentHash);
              })
              .slice(0, 8)
              .map(tool => (
                <Link 
                  key={tool.slug}
                  href={`/converters/${tool.slug}`}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 transition-all text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center text-center"
                >
                  {tool.title.split(' - ')[0]}
                </Link>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
