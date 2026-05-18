import React from 'react';
import { converters } from '@/data/converters';
import Link from 'next/link';
import { ArrowRight, Zap, ShieldCheck, Layers } from 'lucide-react';

export const metadata = {
  title: 'All Developer Tools & Converters Directory - TypeFlow Pro',
  description: 'Browse our complete library of 170+ local-first developer tools, including JSON to TypeScript, SQL to Zod, and more. Secure, fast, and professional.',
};

export default function ConvertersDirectory() {
  // Group converters by category if possible, or just alphabetical
  const sorted = [...converters].sort((a, b) => a.title.localeCompare(b.title));

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Simple Header */}
      <div className="bg-white border-b border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-black text-blue-600 uppercase tracking-widest mb-8 hover:gap-3 transition-all">
            ← Back to Workbench
          </Link>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">
            Developer <span className="text-blue-600">Directory.</span>
          </h1>
          <p className="text-lg text-slate-500 font-medium max-w-2xl leading-relaxed">
            A comprehensive index of all 170+ professional tools engineered for the modern full-stack workflow. 100% Local-First. 100% Private.
          </p>
        </div>
      </div>

      {/* Grid of Links - Using simple text links for speed */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-4">
          {sorted.map((tool) => (
            <Link 
              key={tool.slug}
              href={`/converters/${tool.slug}`}
              className="group flex items-center justify-between py-3 border-b border-slate-100 hover:border-blue-200 transition-all"
            >
              <span className="text-sm font-bold text-slate-600 group-hover:text-blue-600 transition-colors">
                {tool.title.split(' - ')[0]}
              </span>
              <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      {/* Quality Footer Message */}
      <div className="max-w-6xl mx-auto px-6 pb-32">
        <div className="p-12 rounded-[3rem] bg-white border border-slate-200 shadow-sm">
          <div className="grid md:grid-cols-3 gap-12">
            <div>
              <div className="flex items-center gap-2 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-4">
                <ShieldCheck size={14} /> Security First
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Every tool in this directory processes data entirely in your browser. No server uploads. No data leaks.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-purple-600 font-black text-[10px] uppercase tracking-widest mb-4">
                <Zap size={14} /> AI Powered
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                Leverage Gemini 2.5 Flash to refactor, clean, and architect your data structures with unmatched precision.
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-blue-700 font-black text-[10px] uppercase tracking-widest mb-4">
                <Layers size={14} /> 170+ Formats
              </div>
              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                From JSON to Rust to SQL. One ecosystem for every engineering transformation you need.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
