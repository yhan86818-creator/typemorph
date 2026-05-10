import React from 'react';
import TypeFlowApp from '../../page';
import { converters } from '@/data/converters';
import fs from 'fs';
import path from 'path';

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

      {/* SEO Long-form Content Section */}
      <div className="max-w-4xl mx-auto px-6 py-20 border-t border-slate-200 mt-20">
        <h1 className="text-4xl font-black tracking-tight mb-8 text-slate-900">{converter.h1 || converter.title}</h1>
        <div 
          className="prose prose-slate lg:prose-lg max-w-none 
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
          prose-p:text-slate-600 prose-p:leading-relaxed
          prose-strong:text-slate-900
          prose-ul:list-disc prose-li:text-slate-600"
          dangerouslySetInnerHTML={{ __html: contentToDisplay }}
        />
        
        <div className="mt-16 p-8 rounded-3xl bg-white border border-slate-200 shadow-sm">
          <h3 className="text-xl font-bold mb-4">Frequently Asked Questions</h3>
          <div className="space-y-6">
            <div>
              <p className="font-bold text-slate-900">Is my data safe?</p>
              <p className="text-sm text-slate-500">Yes. TypeFlow processes everything in your browser. No data is sent to our servers. Ever.</p>
            </div>
            <div>
              <p className="font-bold text-slate-900">How much does it cost?</p>
              <p className="text-sm text-slate-500">The core features are 100% free. Pro features are available for a <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" rel="noopener noreferrer" className="text-blue-600 font-bold hover:underline">one-time lifetime license of $9 (Early Bird)</a>.</p>
            </div>
          </div>
        </div>
        <div className="mt-20 pt-20 border-t border-slate-200">
          <h2 className="text-2xl font-black mb-8">Related Utilities</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {converters
              .filter(c => c.slug !== slug)
              .sort((a, b) => {
                // Score based on shared keywords in the slug (e.g., 'json', 'typescript')
                const currentWords = slug.split('-');
                const aScore = a.slug.split('-').filter(w => currentWords.includes(w)).length;
                const bScore = b.slug.split('-').filter(w => currentWords.includes(w)).length;
                if (aScore !== bScore) return bScore - aScore;
                
                // Deterministic pseudo-random tie-breaker to spread links across all tools
                const hashA = a.slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const hashB = b.slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                const currentHash = slug.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
                return (hashA ^ currentHash) - (hashB ^ currentHash);
              })
              .slice(0, 8) // Display 8 related tools instead of 4
              .map(tool => (
                <a 
                  key={tool.slug}
                  href={`/converters/${tool.slug}`}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 transition-all text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center justify-center text-center h-full"
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
