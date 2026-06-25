import React from 'react';
import Link from 'next/link';
import { ArrowRight, Clock } from 'lucide-react';
import { useCases } from '@/data/use-cases';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Use Cases — TypeMorph',
  description:
    'Step-by-step guides for common TypeMorph workflows: API response to Zod, API drift detection, GitHub Actions CI, staging vs production diff, and MCP tool generation.',
  alternates: { canonical: 'https://typemorph.dev/use-cases' },
  robots: { index: true, follow: true },
};

export default function UseCasesIndexPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] pt-32 pb-20">
      <div className="max-w-4xl mx-auto px-6">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-4">
            Use Cases
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed max-w-2xl">
            Step-by-step guides for real workflows. Each guide includes CLI commands,
            code examples, and a web-based alternative.
          </p>
        </header>

        <div className="grid gap-4">
          {useCases.map((uc) => (
            <Link
              key={uc.slug}
              prefetch={false}
              href={`/use-cases/${uc.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-black text-slate-900 group-hover:text-blue-600 transition-colors mb-2">
                    {uc.h1}
                  </h2>
                  <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">
                    {uc.directAnswer}
                  </p>
                </div>
                <ArrowRight
                  size={18}
                  className="flex-shrink-0 text-slate-300 group-hover:text-blue-500 transition-colors mt-1"
                />
              </div>
              <p className="text-xs text-slate-400 font-bold flex items-center gap-1 mt-3">
                <Clock size={11} /> {uc.timeEstimate}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
