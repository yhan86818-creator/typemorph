import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata = {
  title: 'Privacy Manifesto - TypeMorph',
  description: 'Our commitment to zero-trace, local-first engineering.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <Link prefetch={false} href="/" className="inline-flex items-center gap-2 text-sm font-mono text-blue-700 dark:text-blue-400 uppercase tracking-widest mb-12 hover:gap-3 transition-all">
          <ArrowLeft size={16} /> Back to Hub
        </Link>

        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-6 border border-blue-100 dark:border-blue-900">
            <Lock size={12} /> The Zero-Trace Promise
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-[1.1]">
            Privacy <span className="text-blue-600">Manifesto.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            We built TypeMorph because we were tired of risking proprietary schemas by pasting them into random online converters.
          </p>
        </div>

        <div className="prose prose-slate lg:prose-lg max-w-none dark:prose-invert
          prose-headings:font-mono prose-headings:tracking-tight
          prose-p:font-medium prose-p:leading-relaxed
          prose-strong:text-blue-700 dark:prose-strong:text-blue-400 prose-strong:font-bold
          prose-a:text-blue-700 hover:prose-a:text-blue-700
          prose-blockquote:border-l-4 prose-blockquote:border-blue-600 prose-blockquote:bg-blue-50 dark:prose-blockquote:bg-blue-950/10 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic">
          
          <h2>1. 100% Local-First Execution</h2>
          <p>
            When you paste a 10,000-line JSON payload or a highly confidential PostgreSQL dump into TypeMorph, <strong>it never leaves your machine.</strong> All parsing, AST generation, and AI inference happens strictly within the secure sandbox of your web browser. We do not have a backend database to store your inputs.
          </p>

          <h2>2. What We Actually Collect</h2>
          <p>
            We use Google Analytics to collect aggregated analytical data such as page views and usage. <strong>We do not collect personally identifiable information, and we do not use it for retargeting advertising or data sales.</strong>
          </p>

          <h2>3. Third-Party Integrations</h2>
          <p>
            If you opt-in to use the &quot;AI Smart Repair&quot; features, the specific block of code you request to be repaired may be routed through our secure Gemini API proxy. However, this is strictly initiated by user action, and the data is transiently processed without retention.
          </p>

          <h2>4. URL Import & What Leaves Your Browser</h2>
          <p>
            TypeMorph can load schemas directly from a URL. Here is exactly what happens in each case:
          </p>
          <ul>
            <li><strong>Schema conversion — always local.</strong> Parsing, type inference, and code generation happen entirely in your browser. The schema content is never sent to any server.</li>
            <li><strong>Direct fetch (CORS-allowed URLs).</strong> Your browser fetches the URL directly. No server is involved. This is the default path for most public OpenAPI specs.</li>
            <li><strong>Proxy fetch — explicit opt-in only.</strong> When a URL is blocked by CORS, TypeMorph stops and shows a warning. It does <em>not</em> silently route the request through a server. If you choose to click &quot;Try via proxy,&quot; the URL is sent to our Cloudflare Worker, which fetches the content on your behalf and returns it. <strong>Do not use the proxy for internal, authenticated, or otherwise sensitive URLs.</strong></li>
          </ul>
          <p>
            The short version: if you never click &quot;Try via proxy,&quot; nothing beyond standard page analytics ever leaves your machine.
          </p>

          <h2>5. Cookies & Local Storage</h2>
          <p>
            We use your browser&apos;s Local Storage to save your UI preferences (like Dark Mode) and temporarily cache your last clipboard text so you don&apos;t lose work if you accidentally refresh the page. This data lives on your hard drive, not ours.
          </p>

          <blockquote>
            &quot;Our philosophy is simple: Developer tools should solve problems, not create security vulnerabilities. Your code is yours.&quot;
          </blockquote>

          <p className="text-sm text-slate-400 mt-12">
            Last Updated: June 2026
          </p>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
