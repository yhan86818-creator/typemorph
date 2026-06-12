import React from 'react';
import Link from 'next/link';
import { ArrowLeft, BookOpen, HelpCircle, GitBranch, Cpu, Code, ShieldCheck, Zap } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

export const metadata = {
  title: 'How to Use TypeMorph | Help Guide & Documentation',
  description: 'Learn how to master the local-first schema transformation workbench, including the interactive graph editor and AST logic engine.',
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-6 py-24">
        <Link prefetch={false} href="/" className="inline-flex items-center gap-2 text-sm font-mono text-indigo-700 dark:text-indigo-400 uppercase tracking-widest mb-12 hover:gap-3 transition-all">
          <ArrowLeft size={16} /> Back to Hub
        </Link>

        <div className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] uppercase tracking-widest mb-6 border border-indigo-100 dark:border-indigo-900">
            <BookOpen size={12} /> Workbench Documentation
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-[1.1]">
            How to Use <span className="text-indigo-600">TypeMorph.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Welcome to the developer documentation. TypeMorph is a 100% local-first, privacy-respecting schema engineering workbench.
          </p>
        </div>

        <div className="prose prose-slate lg:prose-lg max-w-none dark:prose-invert
          prose-headings:font-mono prose-headings:tracking-tight
          prose-p:font-medium prose-p:leading-relaxed
          prose-strong:text-indigo-700 dark:prose-strong:text-indigo-400 prose-strong:font-bold
          prose-blockquote:border-l-4 prose-blockquote:border-indigo-600 prose-blockquote:bg-indigo-50 dark:prose-blockquote:bg-indigo-950/10 prose-blockquote:p-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic">
          
          <h2>1. Quick Start Guide</h2>
          <p>
            Using TypeMorph is straightforward. The workbench operates on a dual-pane editor system:
          </p>
          <ul>
            <li><strong>Input Pane (Left):</strong> Paste your raw data or schemas (JSON payloads, SQL DDL dumps, cURL commands, CSV, XML, etc.).</li>
            <li><strong>Output Pane (Right):</strong> Instantly view strongly-typed generated outputs. Use the top tab bar to switch output targets dynamically (TypeScript, Zod, Rust, Go, SQL, Python, etc.).</li>
          </ul>

          <h2>2. Interactive Relationship Graph Editor</h2>
          <p>
            When converting complex nesting structures (like JSON to TypeScript/Zod), the engine compiles the schema into an abstract AST and visualizes it inside the <strong>Graph</strong> tab.
          </p>
          <blockquote>
            <strong>💡 Pro-Tip: Direct Schema Editing</strong><br />
            You can click directly on any field name inside the interactive node graph to rename it. 
            Once you press <code>Enter</code>, the change propagates dynamically and instantly rewrites the output code in all generated programming languages and schemas (TypeScript, Go, Prisma, Rust, SQL, etc.).
          </blockquote>

          <h2>3. Refactoring with &quot;Explainable Logic&quot;</h2>
          <p>
            If you paste a payload containing nested, repeated object structures, our AST engine automatically detects structural unification candidates:
          </p>
          <ul>
            <li><strong>Unification:</strong> The engine automatically merges structurally identical sub-objects into a single shared type (e.g. <code>SharedUser</code>) to keep your code DRY.</li>
            <li><strong>Split / Customize:</strong> If you do not want them unified, click the <strong>Decisions</strong> banner above the output code to Split them back into distinct custom structures or manually rename the extracted types.</li>
          </ul>

          <h2>4. Privacy & API Key Settings (BYOK)</h2>
          <p>
            We believe in complete corporate data sovereignty.
          </p>
          <ul>
            <li><strong>100% Client-Side Processing:</strong> Standard parsing, compilation, and output generation run locally using Web Workers. No code is sent to our servers.</li>
            <li><strong>Bring Your Own Key (BYOK) AI:</strong> For advanced AI data synthesis or mock schema repair, enter your Google Gemini API key in the top nav cockpit. All AI calls communicate directly with Google's API from your browser—no third-party proxy, no interception.</li>
          </ul>

          <h2>5. PWA (Progressive Web App) Offline Mode</h2>
          <p>
            TypeMorph can be installed directly onto your OS. Simply click the <strong>Install App</strong> button in the top cockpit navigation. Once installed, it works completely offline, making it a permanent local development tool on your workstation.
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
