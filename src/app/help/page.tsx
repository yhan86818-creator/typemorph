import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, GitBranch, Cpu, Code, ShieldCheck } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata = {
  title: 'How to Use TypeMorph | Help Guide & Documentation',
  description: 'Learn how to master the local-first schema transformation workbench, including the interactive graph editor and AST logic engine.',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <Link prefetch={false} href="/" className="inline-flex items-center gap-2 text-sm font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-12 hover:text-slate-900 dark:hover:text-white hover:gap-3 transition-all">
          <ArrowLeft size={16} /> Back to Hub
        </Link>

        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-bold text-[10px] uppercase tracking-widest mb-6 border border-slate-200 dark:border-white/10">
            <BookOpen size={12} /> Workbench Documentation
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-[1.1]">
            How to Use TypeMorph.
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Welcome to the developer documentation. TypeMorph is a 100% local-first, privacy-respecting schema engineering workbench.
          </p>
        </div>

        <div className="prose prose-slate lg:prose-lg max-w-none dark:prose-invert
          prose-headings:font-mono prose-headings:tracking-tight
          prose-p:font-medium prose-p:leading-relaxed
          prose-blockquote:border-l-4 prose-blockquote:border-slate-300 dark:prose-blockquote:border-slate-700 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic">

          <h2>1. Quick Start Guide</h2>
          <p>
            Using TypeMorph is straightforward. The workbench operates on a dual-pane editor system:
          </p>
          <ul>
            <li>Input Pane (Left): Paste your raw data or schemas (JSON payloads, SQL DDL dumps, cURL commands, CSV, XML, etc.).</li>
            <li>Output Pane (Right): Instantly view strongly-typed generated outputs. Use the top tab bar to switch output targets dynamically (TypeScript, Zod, Rust, Go, SQL, Python, etc.).</li>
          </ul>

          <h2>2. Interactive Relationship Graph Editor</h2>
          <p>
            When converting complex nesting structures (like JSON to TypeScript/Zod), the engine compiles the schema into an abstract AST and visualizes it inside the Graph tab.
          </p>
          <blockquote>
            Pro-Tip: Direct Schema Editing<br />
            You can click directly on any field name inside the interactive node graph to rename it.
            Once you press <code>Enter</code>, the change propagates dynamically and instantly rewrites the output code in all generated programming languages and schemas (TypeScript, Go, Prisma, Rust, SQL, etc.).
          </blockquote>

          <h2>3. Refactoring with &quot;Explainable Logic&quot;</h2>
          <p>
            If you paste a payload containing nested, repeated object structures, our AST engine automatically detects structural unification candidates:
          </p>
          <ul>
            <li>Unification: The engine automatically merges structurally identical sub-objects into a single shared type (e.g. <code>SharedUser</code>) to keep your code DRY.</li>
            <li>Split / Customize: If you do not want them unified, click the Decisions banner above the output code to Split them back into distinct custom structures or manually rename the extracted types.</li>
          </ul>

          <h2>4. Privacy & Local Processing</h2>
          <p>
            TypeMorph is built around complete data sovereignty:
          </p>
          <ul>
            <li>100% Client-Side Processing: All parsing, compilation, and output generation runs locally in your browser. No schema content is ever sent to our servers.</li>
            <li>URL Import: You can load schemas directly from a public URL. If a URL is blocked by CORS, you can opt in to fetch it through our Cloudflare Worker proxy — but this is never done silently.</li>
          </ul>

          <h2>5. Schema Change Impact</h2>
          <p>
            The Impact tab (accessible via the &quot;More&quot; menu in the output panel) lets you compare two versions of a JSON structure and see exactly what breaks.
          </p>
          <ul>
            <li>Paste your <strong>Before</strong> JSON and <strong>After</strong> JSON side by side.</li>
            <li>Click <strong>Analyze Impact</strong>. TypeMorph traces the change through every class in the type graph and color-codes the result: <em>changed</em> (red), <em>impacted</em> (orange), <em>safe</em> (gray).</li>
            <li>The language grid shows which of the 15 output targets need to be regenerated. Everything runs locally — no data is sent to any server.</li>
          </ul>

          <h2>6. PWA (Progressive Web App) Offline Mode</h2>
          <p>
            TypeMorph can be installed directly onto your OS. On supported browsers (desktop Chrome and Edge), an <strong>Install App</strong> button appears in the top navigation. Once installed, it works completely offline, making it a permanent local development tool on your workstation.
          </p>

          <p className="text-sm text-slate-400 mt-12">
            Last Updated: June 2026
          </p>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
