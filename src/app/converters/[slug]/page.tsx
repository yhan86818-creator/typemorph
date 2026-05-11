import React from 'react';
import TypeFlowApp from '../../page';
import { converters } from '@/data/converters';
import fs from 'fs';
import path from 'path';
import { ShieldCheck, Crown, ArrowRight, BookOpen } from 'lucide-react';

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
];

export async function generateStaticParams() {
  return converters.map((c) => ({
    slug: c.slug,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const converter = converters.find((c) => c.slug === slug);
  const baseUrl = 'https://typeflow-pro.pages.dev';
  
  return {
    title: converter?.title || 'Developer Converter Tool',
    description: converter?.description || 'Secure local-first developer utility.',
    alternates: {
      canonical: `${baseUrl}/converters/${slug}`,
    },
    openGraph: {
      title: converter?.title,
      description: converter?.description,
      url: `${baseUrl}/converters/${slug}`,
      siteName: 'TypeFlow',
      type: 'website',
    }
  };
}

export default async function ConverterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const converter = converters.find((c) => c.slug === slug);

  if (!converter) return <div>Converter not found</div>;

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

  // Safe fallback content generator (Build-time only)
  const generateFallbackContent = (c: any) => {
    const name = c.title.split(' - ')[0];
    const tech = c.slug.split('-').pop()?.toUpperCase();
    
    return `
      <p>In the rapidly evolving landscape of modern software engineering, the ability to transform data structures quickly and accurately is more than just a convenience—it is a competitive necessity. Our <strong>${c.title}</strong> is engineered to meet the highest standards of professional development, providing a seamless, secure, and local-first bridge between disparate data formats.</p>
      
      <h2>The Shift Toward Local-First Development Tools</h2>
      <p>For years, developers have relied on cloud-based converters that process sensitive JSON, SQL, or API payloads on remote servers. However, as data privacy regulations like GDPR and SOC2 become stricter, sending proprietary schemas to third-party backends has become a significant security liability. TypeFlow Pro was born from the need to eliminate this risk. By executing all conversion logic 100% locally in your browser using the <strong>${name}</strong> engine, we ensure that your intellectual property and customer data never leave your secure environment.</p>
      
      <h2>Why use ${name}?</h2>
      <p>Whether you are working on a massive legacy migration or building a greenfield project with ${tech}, the manual effort required to map types, classes, and schemas is prone to human error. Our ${name} utility automates this process, maintaining perfect structural integrity while adhering to the idiomatic patterns of your target language. If you are converting JSON to ${tech}, the tool intelligently infers optionality, nested relations, and naming conventions automatically.</p>
      
      <h2>Advanced Features of the ${name} Workbench</h2>
      <ul>
        <li><strong>Zero-Latency Processing:</strong> Unlike server-side alternatives, our local engine provides instant feedback. As you type, the ${tech} output is generated in real-time, allowing for rapid iteration and debugging.</li>
        <li><strong>AI-Powered Structural Cleaning:</strong> Integrated with Google Gemini 1.5, the 'Smart Parse' feature can take messy, broken, or deeply nested inputs and flatten them into clean, convertible structures before the ${tech} generation even begins.</li>
        <li><strong>Enterprise-Grade Syntax Highlighting:</strong> Powered by the Monaco Editor (the same core as VS Code), giving you familiar shortcuts, auto-indentation, and a professional-grade workspace.</li>
        <li><strong>Comprehensive Export Options:</strong> Beyond basic types, Pro users can generate advanced Zod schemas, React Query hooks, and Prisma models in a single click.</li>
      </ul>

      <h2>Optimizing Your Engineering Workflow</h2>
      <p>Integrating the <strong>${c.title}</strong> into your daily routine can save hours of repetitive manual coding. Imagine receiving a complex API response from a third-party service; instead of spending thirty minutes writing interfaces by hand, you simply paste the payload here and get production-ready ${tech} code in seconds. This speed allows your team to focus on business logic rather than boilerplate management.</p>
      
      <h3>Security and Compliance</h3>
      <p>Because TypeFlow Pro requires no account and no data upload, it is fully compatible with air-gapped development environments and high-security enterprise networks. We believe that developer tools should empower users without compromising the integrity of their data pipelines.</p>

      <h2>Comparison: TypeFlow Pro vs. Legacy Converters</h2>
      <p>Standard converters often output generic, "flat" code that requires significant cleanup. Our <strong>${name}</strong> logic understands complex data types, handles polymorphic structures, and generates idiomatic code that follows the official documentation for ${tech}. From proper casing to correct attribute decoration (like Rust Serde or Java Lombok), we've tuned the engine for real-world production use.</p>
      
      <blockquote>
        "TypeFlow Pro has redefined how we handle data modeling. The combination of local-first privacy and AI-driven parsing makes it the gold standard for modern developers."
      </blockquote>
      
      <h3>Future-Proofing Your Tech Stack</h3>
      <p>As you move between different languages—perhaps migrating from Python to Go, or from a SQL-heavy backend to a GraphQL frontend—TypeFlow Pro remains your constant companion. With support for over 117+ converters, including specialized formats for ${tech}, you are always prepared for the next architectural shift in your career.</p>
      
      <p>Start using the <strong>${name}</strong> today and experience the difference that a professional, local-first engineering workbench can make in your productivity.</p>
    `;
  };

  const contentToDisplay = fileContent || generateFallbackContent(converter);

  return (
    <div className="relative bg-[#F8FAFC]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Re-using the main app logic but initialized for this specific context */}
      <TypeFlowApp defaultView="app" initialSlug={slug} />

      {/* Technical Manual / Documentation Section */}
      <div className="max-w-4xl mx-auto px-6 py-32 border-t border-slate-100 mt-24">
        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-widest mb-6">
            <ShieldCheck size={12} /> Engineering Documentation
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-6 text-slate-900 leading-tight">
            {converter.h1 || converter.title}
          </h1>
          <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
            This technical guide provides an in-depth analysis of the <strong>{converter.slug.replace(/-/g, ' ')}</strong> engine, best practices for implementation, and data security standards.
          </p>
        </div>

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
              <p className="text-sm text-slate-500 leading-relaxed font-medium">Absolutely. TypeFlow Pro operates entirely within your browser's sandbox. We use Web Workers for high-performance computation without ever transmitting your JSON, SQL, or API data to a remote server.</p>
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
                  <a
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
                  </a>
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
                <a 
                  key={tool.slug}
                  href={`/converters/${tool.slug}`}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 transition-all text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center text-center"
                >
                  {tool.title.split(' - ')[0]}
                </a>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}
