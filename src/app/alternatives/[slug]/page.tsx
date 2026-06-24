import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { alternatives } from '@/data/alternatives';
import { AlternativeZodDemo } from '@/components/AlternativeZodDemo';

export async function generateStaticParams() {
  return alternatives.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const alt = alternatives.find((a) => a.slug === slug);
  if (!alt) return {};
  const url = `https://typemorph.dev/alternatives/${slug}`;
  return {
    title: alt.title,
    description: alt.description,
    alternates: { canonical: url },
    robots: { index: true, follow: true },
    openGraph: {
      title: alt.title,
      description: alt.description,
      url,
      siteName: 'TypeMorph',
      type: 'website',
    },
  };
}

function Cell({ value }: { value: boolean | string }) {
  if (value === true) return <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />;
  if (value === false) return <XCircle className="w-5 h-5 text-slate-300 mx-auto" />;
  return <span className="font-semibold text-slate-900">{value}</span>;
}

export default async function AlternativePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const alt = alternatives.find((a) => a.slug === slug);
  if (!alt) return notFound();

  return (
    <main className="min-h-screen bg-[#F8FAFC] pt-32 pb-20">
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
          <span className="text-blue-600">Alternatives</span>
          <span>/</span>
          <span className="text-blue-600">{alt.competitor}</span>
        </nav>

        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-6 leading-tight">
            {alt.h1}
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">{alt.intro}</p>
        </header>

        {/* Verdict */}
        <section className="mb-14 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-6">
            <p className="text-xs font-black uppercase tracking-widest text-blue-500 mb-3">Use TypeMorph if</p>
            <p className="text-slate-700 leading-relaxed">{alt.verdict.useTypemorph}</p>
            <Link
              prefetch={false}
              href="/?view=app"
              className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-blue-600 hover:underline"
            >
              Try TypeMorph free <ArrowRight size={14} />
            </Link>
          </div>
          <div className="rounded-2xl border-2 border-slate-200 bg-white p-6">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Use {alt.competitor} if
            </p>
            <p className="text-slate-700 leading-relaxed">{alt.verdict.useCompetitor}</p>
            <a
              href={alt.competitorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-4 text-sm font-bold text-slate-500 hover:underline"
            >
              Visit {alt.competitor} <ArrowRight size={14} />
            </a>
          </div>
        </section>

        {/* Real before/after code diff */}
        {alt.codeDiff && (
          <section className="mb-14">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-6">Same JSON, different Zod</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <p className="px-5 py-3 text-[11px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">
                  {alt.codeDiff.competitorLabel}
                </p>
                <pre className="p-5 text-xs leading-relaxed overflow-x-auto text-slate-700">
                  <code>{alt.codeDiff.competitorCode}</code>
                </pre>
              </div>
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/40 overflow-hidden">
                <p className="px-5 py-3 text-[11px] font-black uppercase tracking-widest text-blue-500 border-b border-blue-100">
                  TypeMorph
                </p>
                <pre className="p-5 text-xs leading-relaxed overflow-x-auto text-slate-900">
                  <code>{alt.codeDiff.typemorphCode}</code>
                </pre>
              </div>
            </div>
            {alt.codeDiff.note && (
              <p className="text-sm text-slate-500 mt-4 leading-relaxed">{alt.codeDiff.note}</p>
            )}
          </section>
        )}

        {/* Live Zod demo — quicktype only */}
        {alt.slug === 'quicktype' && <AlternativeZodDemo />}

        {/* Comparison table */}
        <section className="mb-14">
          <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-6">Feature Comparison</h2>
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-6 py-4 font-black text-slate-700">Feature</th>
                  <th className="text-center px-6 py-4 font-black text-blue-600">TypeMorph</th>
                  <th className="text-center px-6 py-4 font-black text-slate-500">{alt.competitor}</th>
                </tr>
              </thead>
              <tbody>
                {alt.table.map((row, i) => (
                  <tr key={i} className={`border-b border-slate-100 ${i % 2 === 0 ? '' : 'bg-slate-50/50'}`}>
                    <td className="px-6 py-3 text-slate-700">{row.feature}</td>
                    <td className="px-6 py-3 text-center">
                      <Cell value={row.typemorph} />
                    </td>
                    <td className="px-6 py-3 text-center">
                      <Cell value={row.competitor} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Strengths */}
        <section className="mb-14 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 mb-4">
              Where TypeMorph stands out
            </h2>
            <ul className="space-y-3">
              {alt.typemorphStrengths.map((s, i) => (
                <li key={i} className="flex gap-3 text-slate-600 leading-relaxed">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight text-slate-900 mb-4">
              Where {alt.competitor} stands out
            </h2>
            <ul className="space-y-3">
              {alt.competitorStrengths.map((s, i) => (
                <li key={i} className="flex gap-3 text-slate-600 leading-relaxed">
                  <CheckCircle className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* FAQ + FAQPage structured data for rich results */}
        {alt.faqs && alt.faqs.length > 0 && (
          <section className="mb-14">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-6">Frequently asked</h2>
            <div className="space-y-4">
              {alt.faqs.map((f, i) => (
                <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6">
                  <p className="font-bold text-slate-900 mb-2">{f.q}</p>
                  <p className="text-slate-600 leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'FAQPage',
                  mainEntity: alt.faqs.map((f) => ({
                    '@type': 'Question',
                    name: f.q,
                    acceptedAnswer: { '@type': 'Answer', text: f.a },
                  })),
                }),
              }}
            />
          </section>
        )}

        {/* CTA */}
        <footer className="p-8 rounded-3xl bg-slate-900 text-white flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold mb-2">Try TypeMorph — free, no signup</h3>
            <p className="text-slate-400 text-sm">
              Paste JSON. Get TypeScript, Zod, Prisma, and 160+ more formats instantly.
              Runs 100% in your browser.
            </p>
          </div>
          <Link
            prefetch={false}
            href="/?view=app"
            className="px-6 py-3 bg-blue-600 rounded-xl font-bold hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            Open TypeMorph
          </Link>
        </footer>
      </div>
    </main>
  );
}
