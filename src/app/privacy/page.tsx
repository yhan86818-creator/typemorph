import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata = {
  title: 'Privacy Manifesto - TypeMorph',
  description: 'Our commitment to zero-trace, local-first engineering.',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <Link prefetch={false} href="/" className="inline-flex items-center gap-2 text-sm font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-12 hover:text-slate-900 dark:hover:text-white hover:gap-3 transition-all">
          <ArrowLeft size={16} /> Back to Hub
        </Link>

        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-bold text-[10px] uppercase tracking-widest mb-6 border border-slate-200 dark:border-white/10">
            <Lock size={12} /> The Zero-Trace Promise
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-[1.1]">
            Privacy Manifesto.
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            We built TypeMorph because we were tired of risking proprietary schemas by pasting them into random online converters.
          </p>
        </div>

        <div className="prose prose-slate lg:prose-lg max-w-none dark:prose-invert
          prose-headings:font-mono prose-headings:tracking-tight
          prose-p:font-medium prose-p:leading-relaxed
          prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-700 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic">

          <h2>1. 100% Local-First Execution</h2>
          <p>
            When you paste a 10,000-line JSON payload or a highly confidential PostgreSQL dump into TypeMorph, it never leaves your machine. All parsing, type inference, and code generation happens strictly within the secure sandbox of your web browser. We do not have a backend database to store your inputs. The two exceptions are covered in sections 3 and 4 below — both require explicit action from you.
          </p>

          <h2>2. What We Actually Collect</h2>
          <p>
            We use Google Analytics to collect aggregated analytical data such as page views and usage. We do not collect personally identifiable information, and we do not use it for retargeting advertising or data sales.
          </p>

          <h2>3. Feedback You Submit</h2>
          <p>
            TypeMorph includes an optional in-app feedback form. If you choose to submit feedback, the text you enter is sent to our Cloudflare D1 database and stored so we can read it. Submission is always voluntary and initiated by you. No schema content, no code, and no personal identifiers are included — only the message you type.
          </p>

          <h2>4. URL Import & What Leaves Your Browser</h2>
          <p>
            TypeMorph can load schemas directly from a URL. Here is exactly what happens in each case:
          </p>
          <ul>
            <li>Schema conversion — always local. Parsing, type inference, and code generation happen entirely in your browser. The schema content is never sent to any server.</li>
            <li>Direct fetch (CORS-allowed URLs). Your browser fetches the URL directly. No server is involved. This is the default path for most public OpenAPI specs.</li>
            <li>Proxy fetch — explicit opt-in only. When a URL is blocked by CORS, TypeMorph stops and shows a warning. It does <em>not</em> silently route the request through a server. If you choose to click &quot;Try via proxy,&quot; the URL is sent to our Cloudflare Worker, which fetches the content on your behalf and returns it. Do not use the proxy for internal, authenticated, or otherwise sensitive URLs.</li>
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
