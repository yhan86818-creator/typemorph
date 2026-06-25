import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle, Clock } from 'lucide-react';
import { useCases } from '@/data/use-cases';

export async function generateStaticParams() {
  return useCases.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const uc = useCases.find((u) => u.slug === slug);
  if (!uc) return {};
  const url = `https://typemorph.dev/use-cases/${slug}`;
  return {
    title: uc.title,
    description: uc.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: uc.title,
      description: uc.description,
      url,
      siteName: 'TypeMorph',
      type: 'article',
    },
  };
}

const LANG_LABEL: Record<string, string> = {
  bash: 'Terminal',
  typescript: 'TypeScript',
  yaml: 'YAML',
  json: 'JSON',
};

export default async function UseCasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const uc = useCases.find((u) => u.slug === slug);
  if (!uc) return notFound();

  const related = uc.relatedSlugs
    ?.map((s) => useCases.find((u) => u.slug === s))
    .filter(Boolean);

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: uc.h1,
    description: uc.description,
    totalTime: `PT${uc.timeEstimate.replace(' ', '')}`,
    step: uc.steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.heading,
      text: s.body,
    })),
  };

  const faqJsonLd = uc.faqs && {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: uc.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] pt-32 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="max-w-4xl mx-auto px-6">
        <Link
          prefetch={false}
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 mb-12 hover:underline"
        >
          <ArrowLeft size={16} /> Back to TypeMorph
        </Link>

        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-8">
          <Link prefetch={false} href="/" className="hover:text-blue-600">Home</Link>
          <span>/</span>
          <Link prefetch={false} href="/use-cases" className="hover:text-blue-600">Use Cases</Link>
          <span>/</span>
          <span className="text-blue-600">{uc.h1}</span>
        </nav>

        <header className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400">
              <Clock size={12} /> {uc.timeEstimate}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
              Updated <time dateTime={uc.updated}>{uc.updated}</time>
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-5 leading-tight">
            {uc.h1}
          </h1>
          <p className="text-lg text-slate-800 font-semibold leading-relaxed max-w-2xl mb-4 border-l-4 border-blue-500 pl-5">
            {uc.directAnswer}
          </p>
        </header>

        {/* Problem / Solution */}
        <section className="mb-12 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-red-100 bg-red-50/50 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-red-400 mb-3">The problem</p>
            <p className="text-slate-700 leading-relaxed text-sm">{uc.problem}</p>
          </div>
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-blue-500 mb-3">The solution</p>
            <p className="text-slate-700 leading-relaxed text-sm">{uc.solution}</p>
          </div>
        </section>

        {/* Steps */}
        <section className="mb-14">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-8">Step-by-step</h2>
          <ol className="space-y-10">
            {uc.steps.map((step, i) => (
              <li key={i} className="flex gap-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white font-black text-sm flex items-center justify-center mt-0.5">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-black text-slate-900 mb-2">{step.heading}</h3>
                  <p className="text-slate-600 leading-relaxed mb-4 text-sm">{step.body}</p>
                  {step.code && (
                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                      <p className="px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 bg-slate-50">
                        {LANG_LABEL[step.code.lang] ?? step.code.lang}
                      </p>
                      <pre className="p-5 text-xs leading-relaxed overflow-x-auto text-slate-800">
                        <code>{step.code.content}</code>
                      </pre>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Web alternative */}
        {uc.webAlternative && (
          <section className="mb-14 rounded-2xl border border-slate-200 bg-white p-7">
            <h2 className="text-lg font-black text-slate-900 mb-2">{uc.webAlternative.heading}</h2>
            <p className="text-slate-600 leading-relaxed text-sm mb-4">{uc.webAlternative.body}</p>
            <Link
              prefetch={false}
              href="/?view=app"
              className="inline-flex items-center gap-2 text-sm font-bold text-blue-600 hover:underline"
            >
              Open TypeMorph Workbench <ArrowRight size={14} />
            </Link>
          </section>
        )}

        {/* FAQ */}
        {uc.faqs && uc.faqs.length > 0 && (
          <section className="mb-14">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-6">Frequently asked</h2>
            <div className="space-y-4">
              {uc.faqs.map((f, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="font-bold text-slate-900 mb-2">{f.q}</p>
                  <p className="text-slate-600 leading-relaxed text-sm">{f.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related use cases */}
        {related && related.length > 0 && (
          <section className="mb-14">
            <h2 className="text-xl font-black tracking-tight text-slate-900 mb-5">Related guides</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {related.map((r) => r && (
                <Link
                  key={r.slug}
                  prefetch={false}
                  href={`/use-cases/${r.slug}`}
                  className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <p className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1 text-sm">
                    {r.h1}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={11} /> {r.timeEstimate}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <footer className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold mb-2">Try TypeMorph — free, no signup</h3>
            <p className="text-slate-400 text-sm">
              Runs 100% in your browser. Paste JSON, get Zod, TypeScript, Go, and 160+ more formats instantly.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link
              prefetch={false}
              href="/?view=app"
              className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-colors text-center"
            >
              Open Workbench
            </Link>
            <a
              href="https://marketplace.visualstudio.com/items?itemName=TypeMorph.typemorph-vscode"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white/10 rounded-xl font-bold hover:bg-white/20 transition-colors text-center"
            >
              VS Code Extension
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
