import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata = {
  title: 'Privacy Manifesto - TypeFlow Pro',
  description: 'Our commitment to zero-trace, local-first engineering.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-12 hover:gap-3 transition-all">
          <ArrowLeft size={16} /> Back to Hub
        </Link>

        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-6 border border-blue-100 dark:border-blue-900">
            <Lock size={12} /> The Zero-Trace Promise
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-[1.1]">
            Privacy <span className="text-blue-600">Manifesto.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            We built TypeFlow Pro because we were tired of risking proprietary schemas by pasting them into random online converters.
          </p>
        </div>

        <div className="prose prose-slate lg:prose-lg max-w-none dark:prose-invert
          prose-headings:font-black prose-headings:tracking-tight
          prose-p:font-medium prose-p:leading-relaxed
          prose-strong:text-blue-600 dark:prose-strong:text-blue-400 prose-strong:font-black
          prose-a:text-blue-600 hover:prose-a:text-blue-700
          prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-900/10 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic">
          
          <h2>1. 100% Local-First Execution</h2>
          <p>
            When you paste a 10,000-line JSON payload or a highly confidential PostgreSQL dump into TypeFlow Pro, <strong>it never leaves your machine.</strong> All parsing, AST generation, and AI inference happens strictly within the secure sandbox of your web browser. We do not have a backend database to store your inputs.
          </p>

          <h2>2. What We Actually Collect</h2>
          <p>
            We only collect completely anonymous, aggregated analytics (e.g., page views) to understand which tools are popular and ensure the platform is running smoothly. <strong>We do not use tracking cookies for retargeting, and we do not sell data to data brokers.</strong>
          </p>

          <h2>3. Third-Party Integrations</h2>
          <p>
            If you opt-in to use the "AI Smart Repair" features, the specific block of code you request to be repaired may be routed through our secure Gemini API proxy. However, this is strictly initiated by user action, and the data is transiently processed without retention.
          </p>

          <h2>4. Cookies & Local Storage</h2>
          <p>
            We use your browser's Local Storage to save your UI preferences (like Dark Mode) and temporarily cache your last clipboard text so you don't lose work if you accidentally refresh the page. This data lives on your hard drive, not ours.
          </p>

          <blockquote>
            "Our philosophy is simple: Developer tools should solve problems, not create security vulnerabilities. Your code is yours."
          </blockquote>
          
          <p className="text-sm text-slate-400 mt-12">
            Last Updated: May 2026
          </p>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
