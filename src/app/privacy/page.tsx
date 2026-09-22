import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata = {
  title: 'Privacy Manifesto - TypeMorph',
  description: 'How local conversion, signed-in cloud history, sharing, and external services handle your data.',
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
            <Lock size={12} /> Your Data Choices
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

          <h2>1. Local Conversion & Signed-In Cloud History</h2>
          <p>
            Parsing, type inference, and code generation run in your browser. You can use the workbench without signing in; in that mode, conversion history stays in your browser and is not uploaded to cloud history. If you sign in, automatic cloud history is enabled by default, unless you have disabled it in Settings. After a short idle period, the workbench sends your input text and generated output, together with your user ID and converter identifier, to Supabase.
          </p>

          <p>
            For local conversion history, stay signed out. You can also turn off cloud history in Settings &gt; Privacy &amp; Data Control to stop future history saves. Signing out or disabling cloud history does not delete records already stored in the cloud. The clear-local-history button only clears browser history. Sharing and URL import are separate features described below.
          </p>

          <h2>2. Analytics & External Services</h2>
          <p>
            The website uses Google Analytics for page views and usage events, including converter identifiers and output formats. Our conversion events do not include the input text or generated output. The editor loads assets from an external CDN. Signing in uses Supabase authentication, and license verification uses Gumroad. Local conversion does not mean the website makes no network requests.
          </p>

          <h2>3. Feedback You Submit</h2>
          <p>
            TypeMorph includes an optional in-app feedback form. If you choose to submit feedback, the text you enter is sent to our Cloudflare D1 database and stored so we can read it. Submission is always voluntary and initiated by you. Feedback also includes its source and, for inline feedback, your vote and the tool context. Input and generated output are not automatically attached. Anything you put in the message is sent as written.
          </p>

          <h2>4. URL Import & What Leaves Your Browser</h2>
          <p>
            TypeMorph can load schemas directly from a URL. Here is exactly what happens in each case:
          </p>
          <ul>
            <li>Schema conversion runs in your browser. Signed-in cloud history and explicit cloud sharing can store schema content separately from conversion.</li>
            <li>Direct fetch (CORS-allowed URLs). Your browser contacts the requested server directly, without a TypeMorph proxy. This is the default path for most public OpenAPI specs.</li>
            <li>Proxy fetch — explicit opt-in only. When a URL is blocked by CORS, TypeMorph stops and shows a warning. It does <em>not</em> silently route the request through a server. If you choose to click &quot;Try via proxy,&quot; the URL is sent to our Cloudflare Worker, which fetches the content on your behalf and returns it. Do not use the proxy for internal, authenticated, or otherwise sensitive URLs.</li>
          </ul>
          <p>
            URL import makes a network request even while signed out. The proxy is used only when you choose it. Avoid sharing sensitive URLs or entering sensitive information in feedback.
          </p>

          <h2>5. Sharing Links</h2>
          <p>
            Clicking Share selects a sharing method based on the resulting link length. Small links contain compressed input, the selected output tab, and settings in the URL fragment; this sharing method does not upload the payload to Supabase. If the link exceeds 2,000 characters and cloud sharing is configured, Share uploads that compressed data to Supabase and copies a link containing its ID. This can happen without signing in and is independent of the cloud-history setting. Compression is not encryption. Only share data you intend recipients of the link to see.
          </p>

          <h2>6. Cookies & Local Storage</h2>
          <p>
            The browser stores preferences, recent conversion history, and your saved schema library locally. These local copies are separate from any signed-in cloud history. Authentication and analytics may also use browser storage or cookies. Clearing local history does not delete cloud records or shared links.
          </p>

          <blockquote>
            &quot;Our philosophy is simple: Developer tools should solve problems, not create security vulnerabilities. Your code is yours.&quot;
          </blockquote>

          <p className="text-sm text-slate-400 mt-12">
            Last Updated: September 22, 2026
          </p>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
