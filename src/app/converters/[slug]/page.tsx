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
  const baseUrl = 'https://typeflow.dev'; // Replace with actual domain
  
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
        <h1 className="text-4xl font-black tracking-tight mb-8 text-slate-900">{converter.h1}</h1>
        <div 
          className="prose prose-slate lg:prose-lg max-w-none 
          prose-headings:font-black prose-headings:tracking-tight prose-headings:text-slate-900
          prose-p:text-slate-600 prose-p:leading-relaxed
          prose-strong:text-slate-900
          prose-ul:list-disc prose-li:text-slate-600"
          dangerouslySetInnerHTML={{ __html: fileContent }}
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
              .slice(0, 4)
              .map(tool => (
                <a 
                  key={tool.slug}
                  href={`/converters/${tool.slug}`}
                  className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-300 transition-all text-xs font-bold text-slate-600 hover:text-blue-600"
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
