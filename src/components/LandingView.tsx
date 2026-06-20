'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Sparkles, Zap, ShieldCheck, Layers, 
  ArrowRight, X, Command, Cpu, Terminal, ChevronRight,
  Database, FileCode, CheckCircle2, FolderOpen, Trash2, EyeOff
} from 'lucide-react';
import { converters } from '@/data/converters';
import GlobalFooter from '@/components/GlobalFooter';
import { VisualDemo } from './VisualDemo';

interface LandingViewProps {
  onSelect: (slug: string) => void;
}

export function LandingView({ onSelect }: LandingViewProps) {
  const [search, setSearch] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'TEXTAREA' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simple heuristic for real-time analysis before hitting AI
  useEffect(() => {
    if (search.length > 30) {
      const trimmed = search.trim();
      let type = 'Unknown';
      let suggestion = 'json-to-typescript';
      let icon = <Cpu size={16} />;

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        type = 'JSON Structure';
        suggestion = 'json-to-typescript';
        icon = <FileCode className="text-slate-600 dark:text-slate-400" size={16} />;
      } else if (trimmed.includes('CREATE TABLE') || trimmed.includes('SELECT')) {
        type = 'SQL DDL / Query';
        suggestion = 'sql-to-typescript';
        icon = <Database className="text-indigo-500" size={16} />;
      } else if (trimmed.includes('curl ')) {
        type = 'cURL Command';
        suggestion = 'curl-to-fetch';
        icon = <Terminal className="text-green-500" size={16} />;
      }

      if (type !== 'Unknown') {
        setTimeout(() => setAiAnalysis({ type, suggestion, icon }), 0);
      } else {
        setTimeout(() => setAiAnalysis(null), 0);
      }
    } else {
      setTimeout(() => setAiAnalysis(null), 0);
    }
  }, [search]);
  
  const filtered = converters.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.slug.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 48);

  const handleMagicExtract = () => {
    localStorage.setItem('typemorph_magic_data', search);
    onSelect(aiAnalysis?.suggestion || 'json-to-typescript');
  };

  return (
    <div className="min-h-full bg-white dark:bg-[#0A0A0A] p-8 pb-32 transition-colors duration-500 relative overflow-x-hidden">

      <div className="max-w-6xl mx-auto pt-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-24"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 text-[11px] font-mono font-bold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" />
            The most accurate JSON → Zod converter
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-6 text-slate-900 dark:text-white leading-[0.9]">
            JSON to Zod.<br />
            Done right.
          </h1>

          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-xl mx-auto leading-relaxed mb-10">
            Other tools generate <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono">z.string()</code> for everything.
            TypeMorph reads field names and generates <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-700 dark:text-slate-200">z.email()</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-700 dark:text-slate-200">z.uuid()</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-slate-700 dark:text-slate-200">.min(0).max(150)</code> — validators that actually work.
          </p>

          <VisualDemo />

        </motion.div>

        {/* Search Cockpit */}
        <div className="relative max-w-3xl mx-auto mb-40">
          <div className={`relative transition-all duration-500 ${isFocused ? 'scale-[1.01]' : 'scale-100'}`}>
            {/* AI Insight Popover */}
            <AnimatePresence>
              {mounted && aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.98 }}
                  className="absolute -top-16 left-0 right-0 z-20"
                >
                  <div className="mx-auto w-fit flex items-center gap-4 px-5 py-2.5 bg-white dark:bg-[#111] rounded-xl border border-slate-200 dark:border-white/10 shadow-lg backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-slate-100 dark:bg-white/10 rounded-lg flex items-center justify-center text-slate-700 dark:text-white">
                        {aiAnalysis.icon}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400">[pattern-detected]</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{aiAnalysis.type}</p>
                      </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200 dark:bg-white/10" />
                    <button
                      onClick={handleMagicExtract}
                      className="flex items-center gap-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:opacity-80 transition-opacity"
                    >
                      Instant Synthesis <ChevronRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`relative bg-white dark:bg-[#111] rounded-2xl border transition-all duration-300 shadow-sm ${isFocused ? 'border-slate-900 dark:border-white ring-1 ring-slate-900/10 dark:ring-white/10' : 'border-slate-200 dark:border-white/10'}`}>
              <div className="p-1.5 flex items-start">
                <div className="p-4 text-slate-400">
                  {aiAnalysis ? <Zap className="text-slate-900 dark:text-white" size={20} /> : <Search size={20} />}
                </div>
                <textarea 
                  ref={inputRef}
                  placeholder="Paste raw schema (SQL DDL, JSON, cURL) or search 160+ tools..."
                  value={search}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none p-4 text-base font-bold text-slate-900 dark:text-white placeholder:text-slate-400 resize-none h-[72px] custom-scrollbar leading-relaxed"
                />
                <div className="p-3 flex flex-col gap-2">
                  {search ? (
                    <button onClick={() => setSearch('')} className="p-1.5 text-slate-300 hover:text-slate-500 transition-colors"><X size={16} /></button>
                  ) : (
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-mono text-slate-400">
                      <Command size={10} /> <span className="mt-0.5">K</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Visual Decor */}
            <div className="absolute -bottom-1 left-12 right-12 h-px bg-slate-200 dark:bg-white/10" />
          </div>

          {/* Quick Stats */}
          <div className="mt-6 flex justify-center gap-8">
            {[
              { label: 'Language Outputs', value: '18' },
              { label: 'Security Standard', value: 'Local-First' },
              { label: 'Inference Engine', value: '100% Browser' }
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">{s.label}</p>
                <p className="text-xs font-black text-slate-600 dark:text-slate-300">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Zod v3 → v4 Migration Banner */}
        <div className="mb-24">
          <div className="relative rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-3 border border-slate-200 dark:border-white/10">
                  New — Zod v4 released 2025
                </div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                  Migrating to Zod v4?
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-lg">
                  Zod v4 moves <code className="text-xs bg-white dark:bg-slate-800 px-1 py-0.5 rounded font-mono">.email()</code>, <code className="text-xs bg-white dark:bg-slate-800 px-1 py-0.5 rounded font-mono">.uuid()</code>, <code className="text-xs bg-white dark:bg-slate-800 px-1 py-0.5 rounded font-mono">.datetime()</code> and 14 more validators to new top-level syntax. TypeMorph migrates your schemas automatically.
                </p>
              </div>
              <div className="flex-shrink-0 flex flex-col gap-2 text-[11px] font-mono">
                {[
                  ['z.string().email()', 'z.email()'],
                  ['z.string().uuid()', 'z.uuid()'],
                  ['z.string().datetime()', 'z.iso.datetime()'],
                ].map(([from, to]) => (
                  <div key={from} className="flex items-center gap-2">
                    <span className="text-slate-400 line-through">{from}</span>
                    <ArrowRight size={10} className="text-slate-400" />
                    <span className="text-slate-900 dark:text-white font-bold">{to}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Three Core Stars (Z-Pattern Scroll Story) */}
        <div className="space-y-40 mb-40">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Beyond Zod — every schema format
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mt-4">
              The same semantic intelligence that powers Zod output also compiles to 17 other targets — TypeScript, Go, Rust, Prisma, and more.
            </p>
          </div>

          {/* Pillar 1: Multi-Language Output */}
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-5 space-y-6">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Paste Once. <br />
                <span>Compile Everywhere.</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Drop any JSON, YAML, or OpenAPI spec and TypeMorph emits typed code for every language your team uses — simultaneously, in the browser, with no server involved. The Zod output goes beyond types: field names are analysed semantically so <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">email</code> fields get <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.email()</code>, <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">id</code> fields get <code className="text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">.uuid()</code>.
              </p>
              <ul className="space-y-3 font-semibold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-slate-900 dark:text-white" />
                  18 generators from one AST — TypeScript, Go, Rust, Java, Swift, Kotlin, C#…
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-slate-900 dark:text-white" />
                  Semantic field inference: enums, formats, and constraints auto-detected
                </li>
              </ul>
            </div>
            <div className="md:col-span-7 relative group">
              <div className="relative p-[1px] bg-gradient-to-br from-slate-300/60 via-slate-200/20 to-slate-300/10 dark:from-slate-600/40 dark:via-slate-700/20 dark:to-slate-800/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                <div className="rounded-2xl overflow-hidden bg-slate-950 font-mono text-xs leading-relaxed">
                  {/* Tab bar */}
                  <div className="flex items-center gap-0 px-4 py-0 bg-slate-900 border-b border-slate-800">
                    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b-2 border-emerald-500">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">Zod</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b-2 border-transparent">
                      <span className="w-2 h-2 rounded-full bg-cyan-600" />
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Go</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-2.5 border-b-2 border-transparent">
                      <span className="w-2 h-2 rounded-full bg-orange-600" />
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Rust</span>
                    </div>
                    <span className="ml-auto text-[9px] text-slate-600">+ 15 more</span>
                  </div>
                  {/* Split: Zod left, Go right */}
                  <div className="grid grid-cols-2 divide-x divide-slate-800">
                    <pre className="p-4 overflow-x-auto text-[10px] leading-5">
<span className="text-slate-500">{'// Zod'}</span>{'\n'}
<span className="text-blue-400">import</span> <span className="text-slate-300">{'{ z }'}</span> <span className="text-blue-400">from</span> <span className="text-emerald-300">{"'zod'"}</span>{'\n\n'}
<span className="text-blue-400">export const</span> <span className="text-amber-300">userSchema</span>{'\n'}
{'  '}<span className="text-slate-400">= z.object({'({'}</span>{'\n'}
{'  '}<span className="text-slate-200">id</span><span className="text-slate-400">:</span> <span className="text-emerald-400">z.uuid()</span><span className="text-slate-500">,</span>{'\n'}
{'  '}<span className="text-slate-200">email</span><span className="text-slate-400">:</span> <span className="text-emerald-400">z.email()</span><span className="text-slate-500">,</span>{'\n'}
{'  '}<span className="text-slate-200">age</span><span className="text-slate-400">:</span> <span className="text-emerald-400">z.int().min(0).max(150)</span><span className="text-slate-500">,</span>{'\n'}
{'  '}<span className="text-slate-200">role</span><span className="text-slate-400">:</span> <span className="text-emerald-400">z.enum([</span>{'\n'}
{'    '}<span className="text-amber-300">{"'admin'"}</span><span className="text-slate-500">, </span><span className="text-amber-300">{"'user'"}</span><span className="text-slate-400">{'])'}</span><span className="text-slate-500">,</span>{'\n'}
<span className="text-slate-400">{'});'}</span>
                    </pre>
                    <pre className="p-4 overflow-x-auto text-[10px] leading-5">
<span className="text-slate-500">{'// Go'}</span>{'\n\n'}
<span className="text-blue-400">type</span> <span className="text-amber-300">User</span> <span className="text-blue-400">struct</span> <span className="text-slate-400">{'{'}</span>{'\n'}
{'  '}<span className="text-slate-200">ID</span>{'     '}<span className="text-cyan-400">string</span> <span className="text-emerald-600">{"`json:\"id\"`"}</span>{'\n'}
{'  '}<span className="text-slate-200">Email</span>{'  '}<span className="text-cyan-400">string</span> <span className="text-emerald-600">{"`json:\"email\"`"}</span>{'\n'}
{'  '}<span className="text-slate-200">Age</span>{'    '}<span className="text-cyan-400">int</span>{'    '}<span className="text-emerald-600">{"`json:\"age\"`"}</span>{'\n'}
{'  '}<span className="text-slate-200">Role</span>{'   '}<span className="text-cyan-400">string</span> <span className="text-emerald-600">{"`json:\"role\"`"}</span>{'\n'}
<span className="text-slate-400">{'}'}</span>{'\n\n'}
<span className="text-slate-500">{'// same input →'}</span>{'\n'}
<span className="text-slate-500">{'// Rust / Java / Kotlin'}</span>{'\n'}
<span className="text-slate-500">{'// Swift / C# / Python…'}</span>
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 2: Schema Intelligence (Right Text, Left Image) */}
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 md:order-1 relative group">
              <div className="relative p-[1px] bg-gradient-to-br from-slate-300/60 via-slate-200/20 to-slate-300/10 dark:from-slate-600/40 dark:via-slate-700/20 dark:to-slate-800/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                <div className="rounded-2xl overflow-hidden bg-slate-950 font-mono text-xs leading-relaxed">
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-slate-900 border-b border-slate-800">
                    <span className="w-3 h-3 rounded-full bg-red-500/70" />
                    <span className="w-3 h-3 rounded-full bg-amber-400/70" />
                    <span className="w-3 h-3 rounded-full bg-emerald-400/70" />
                    <span className="ml-3 text-[10px] text-slate-500 uppercase tracking-widest">14 languages · 1 click</span>
                  </div>
                  <div className="p-5 space-y-3">
                    {/* Quality score badge */}
                    <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl px-4 py-3">
                      <div className="flex flex-col items-center">
                        <span className="text-2xl font-black text-emerald-400">92</span>
                        <span className="text-[9px] text-emerald-600 uppercase tracking-widest font-bold">Grade A</span>
                      </div>
                      <div className="flex-1 text-[10px] text-slate-400 space-y-0.5">
                        <div className="flex gap-2"><span className="text-slate-300">12 fields</span><span>·</span><span>camelCase</span><span>·</span><span>depth 2</span></div>
                        <div className="text-emerald-500">✓ No issues found — schema looks good.</div>
                      </div>
                    </div>
                    {/* Recursive type detection */}
                    <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 text-[10px]">
                      <div className="text-amber-400 font-bold mb-1.5">⟳ Recursive type detected</div>
                      <pre className="text-slate-300 leading-5">
<span className="text-blue-400">interface</span> <span className="text-amber-300">TreeNode</span> <span className="text-slate-400">{'{'}</span>{'\n'}
{'  '}<span className="text-slate-200">id</span><span className="text-slate-400">: </span><span className="text-blue-300">number</span><span className="text-slate-500">;</span>{'\n'}
{'  '}<span className="text-slate-200">children</span><span className="text-slate-400">: </span><span className="text-amber-300">TreeNode</span><span className="text-blue-300">[]</span><span className="text-slate-500">;</span>{'\n'}
<span className="text-slate-400">{'}'}</span>
                      </pre>
                    </div>
                    {/* Language badges */}
                    <div className="flex flex-wrap gap-1.5">
                      {['TypeScript', 'Zod', 'Go', 'Rust', 'Python', 'Java', 'Swift', 'Kotlin', 'C#', 'Proto', 'GraphQL', 'Prisma', '+2'].map(l => (
                        <span key={l} className="text-[9px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50">{l}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-5 md:order-2 space-y-6">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Schema Intelligence: <br />
                <span>Quality Score & Recursive Types</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Paste any JSON, OpenAPI, or JSON Schema and TypeMorph scores it instantly — any-type ratio, naming consistency, format hints, depth. Self-referential types like trees and linked lists are detected automatically and emitted as clean recursive interfaces.
              </p>
              <ul className="space-y-3 font-semibold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-slate-900 dark:text-white" />
                  100% local rule-based quality scoring (0–100 / A–F)
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-slate-900 dark:text-white" />
                  Auto-detects recursive types (tree, linked list, graph)
                </li>
              </ul>
            </div>
          </div>

          {/* Pillar 3: Smart Diff (Left Text, Right Image) */}
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-5 space-y-6">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Breaking Change Detector: <br />
                <span>Semantic Schema Diff</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Paste two versions of a schema side-by-side and get a compatibility score instantly. TypeMorph detects breaking changes (type changes, optional→required, field removals), warnings (required→optional, format changes), and safe additions — across JSON, YAML, OpenAPI, and JSON Schema.
              </p>
              <ul className="space-y-3 font-semibold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-slate-900 dark:text-white" />
                  Compatibility score 0–100 with severity breakdown
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-slate-900 dark:text-white" />
                  Supports OpenAPI 3.x · Swagger 2.0 · JSON Schema · YAML
                </li>
              </ul>
            </div>
            <div className="md:col-span-7 relative group">
              <div className="relative p-[1px] bg-gradient-to-br from-slate-300/60 via-slate-200/20 to-slate-300/10 dark:from-slate-600/40 dark:via-slate-700/20 dark:to-slate-800/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                <div className="rounded-2xl overflow-hidden bg-slate-950 font-mono text-xs">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-200">Breaking Change Detector</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">JSON · YAML · OpenAPI · JSON Schema</div>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 text-slate-300 text-[9px] font-bold rounded-lg hover:bg-slate-800">
                      ⇄ Compare <span className="text-[8px] opacity-40 border border-slate-600 px-1 py-0.5 rounded ml-1">⌘↵</span>
                    </div>
                  </div>
                  {/* Two editor panels */}
                  <div className="grid grid-cols-2 gap-2 px-3 pt-3 pb-2">
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 border-b border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider">Version A</span>
                        <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">JSON</span>
                      </div>
                      <pre className="p-2.5 text-[9px] leading-4 text-slate-400 bg-slate-950">
{`{ "id": number,\n  "role": "admin"? }`}
                      </pre>
                    </div>
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 border-b border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider">Version B</span>
                        <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-500">JSON</span>
                      </div>
                      <pre className="p-2.5 text-[9px] leading-4 text-slate-400 bg-slate-950">
{`{ "id": string,\n  "role": "admin" }`}
                      </pre>
                    </div>
                  </div>
                  {/* Results */}
                  <div className="px-3 pb-3 space-y-1.5">
                    <div className="flex items-center gap-2 py-1.5">
                      <span className="text-sm font-bold text-amber-400">62% compatible</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-900/40 text-red-400">2 breaking</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-yellow-900/30 text-yellow-400">1 warning</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-white/10 text-slate-400">1 info</span>
                    </div>
                    {[
                      { icon: '⊗', color: 'text-red-400', bg: 'bg-red-950/30 border-red-900/40', badge: 'type', badgeColor: 'bg-orange-900/30 text-orange-400', msg: 'user.id  number → string' },
                      { icon: '⊗', color: 'text-red-400', bg: 'bg-red-950/30 border-red-900/40', badge: 'required', badgeColor: 'bg-purple-900/30 text-purple-400', msg: 'user.role  optional → required' },
                      { icon: '△', color: 'text-yellow-400', bg: 'bg-yellow-950/20 border-yellow-900/30', badge: 'enum', badgeColor: 'bg-blue-900/30 text-blue-400', msg: 'user.status  "active" removed' },
                      { icon: '＋', color: 'text-slate-500', bg: 'bg-white/[0.03] border-white/10', badge: 'added', badgeColor: 'bg-green-900/30 text-green-400', msg: 'user.department  new field' },
                    ].map((d, i) => (
                      <div key={i} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-[9px] ${d.bg}`}>
                        <span className={`font-bold ${d.color}`}>{d.icon}</span>
                        <span className={`font-mono uppercase px-1 py-0.5 rounded text-[8px] ${d.badgeColor}`}>{d.badge}</span>
                        <span className="text-slate-400 font-mono">{d.msg}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 4: Impact Propagation (Right Text, Left Image) */}
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 md:order-1 relative group">
              <div className="relative p-[1px] bg-gradient-to-br from-slate-300/60 via-slate-200/20 to-slate-300/10 dark:from-slate-600/40 dark:via-slate-700/20 dark:to-slate-800/10 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden">
                <div className="rounded-2xl overflow-hidden bg-slate-950 font-mono text-xs">
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-200">Schema Change Impact</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">Before / After · 100% local</div>
                    </div>
                    <div className="text-[9px] font-mono px-2.5 py-1 rounded-lg bg-orange-950/40 border border-orange-900/40 text-orange-400">
                      9 of 15 targets affected
                    </div>
                  </div>
                  {/* Before / After inputs */}
                  <div className="grid grid-cols-2 gap-2 px-3 pt-3 pb-2">
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 border-b border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-slate-600" />
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider">Before</span>
                      </div>
                      <pre className="p-2.5 text-[9px] leading-4 text-slate-400 bg-slate-950">
{`{ "price": 10,\n  "qty": 2 }`}
                      </pre>
                    </div>
                    <div className="border border-slate-800 rounded-xl overflow-hidden">
                      <div className="flex items-center gap-1.5 px-2 py-1.5 bg-slate-900 border-b border-slate-800">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        <span className="text-[8px] text-slate-500 uppercase tracking-wider">After</span>
                      </div>
                      <pre className="p-2.5 text-[9px] leading-4 text-slate-400 bg-slate-950">
{`{ "price": "free",\n  "qty": 2, "sku": "A1" }`}
                      </pre>
                    </div>
                  </div>
                  {/* Stats bar */}
                  <div className="mx-3 mb-2 flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-900/60 border border-slate-800 text-[9px] font-mono">
                    <span><span className="font-bold text-red-400">1</span><span className="text-slate-500"> changed</span></span>
                    <span className="text-slate-700">·</span>
                    <span><span className="font-bold text-orange-400">1</span><span className="text-slate-500"> impacted</span></span>
                    <span className="text-slate-700">·</span>
                    <span><span className="font-bold text-slate-500">1</span><span className="text-slate-500"> safe</span></span>
                  </div>
                  {/* Class impact nodes */}
                  <div className="px-3 pb-2 flex flex-col gap-1.5">
                    {[
                      { name: 'Item', kind: 'changed', desc: 'price: number → string' },
                      { name: 'Order', kind: 'impacted', desc: 'references Item' },
                      { name: 'Customer', kind: 'safe', desc: 'unaffected' },
                    ].map(({ name, kind, desc }) => (
                      <div key={name} className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[9px] ${
                        kind === 'changed' ? 'bg-red-950/30 border-red-900/40' :
                        kind === 'impacted' ? 'bg-orange-950/30 border-orange-900/40' :
                        'bg-slate-900/50 border-slate-800'
                      }`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${
                          kind === 'changed' ? 'bg-red-500' :
                          kind === 'impacted' ? 'bg-orange-500' :
                          'bg-slate-600'
                        }`} />
                        <span className={`font-bold ${
                          kind === 'changed' ? 'text-red-300' :
                          kind === 'impacted' ? 'text-orange-300' :
                          'text-slate-500'
                        }`}>{name}</span>
                        <span className="text-slate-600">{desc}</span>
                      </div>
                    ))}
                  </div>
                  {/* Language targets */}
                  <div className="px-3 pb-3 flex flex-wrap gap-1">
                    {[
                      { l: 'TypeScript', hit: true }, { l: 'Zod', hit: true },
                      { l: 'Go', hit: true }, { l: 'Rust', hit: true },
                      { l: 'Python', hit: true }, { l: 'Java', hit: false },
                      { l: 'Swift', hit: false }, { l: 'C#', hit: false },
                    ].map(({ l, hit }) => (
                      <span key={l} className={`text-[8px] px-2 py-0.5 rounded-md border font-bold ${
                        hit ? 'bg-orange-950/30 border-orange-900/40 text-orange-400' : 'bg-slate-900 border-slate-800 text-slate-600'
                      }`}>{l}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="md:col-span-5 md:order-2 space-y-6">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Schema Change Impact: <br />
                <span>Know What Breaks Before It Does.</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Paste a before and after version of your JSON. TypeMorph traces the change through every class in the type graph and shows exactly which output languages need to be regenerated — all in the browser, instantly.
              </p>
              <ul className="space-y-3 font-semibold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-slate-900 dark:text-white" />
                  Visual graph: changed (red) · impacted (orange) · safe (gray)
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-slate-900 dark:text-white" />
                  15 language targets checked instantly — no regeneration guesswork
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Privacy Manifesto Section */}
        <div className="max-w-5xl mx-auto mt-20 mb-40 p-10 rounded-3xl bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 shadow-2xl dark:shadow-black/40">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white font-mono text-[10px] uppercase tracking-wider mb-4 border border-slate-200 dark:border-white/10">
              <ShieldCheck size={12} /> Privacy Manifesto
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-3">
              100% Privacy-First Architecture
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold max-w-xl mx-auto">
              Your code never leaves your browser. All type inference and code generation runs entirely client-side — no API calls, no upload endpoints.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10">
                <Cpu size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  1. Local-First Engine
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded text-[10px] font-mono uppercase tracking-normal font-bold border border-slate-200 dark:border-white/10">100% Private</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Standard code conversions (JSON to TS/Go/Rust, etc.) are executed 100% entirely inside your browser. Your schema content is never sent to any server. The only exception: if you import from a URL blocked by CORS and explicitly click &ldquo;Try via proxy,&rdquo; that URL is fetched through our Cloudflare Worker on your behalf.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10">
                <Layers size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  2. Schema Intelligence
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded text-[10px] font-mono uppercase tracking-normal font-bold border border-slate-200 dark:border-white/10">Rule-Based</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  TypeMorph&apos;s inference engine runs entirely in-browser — no AI calls, no API keys. Field-name heuristics auto-detect emails, UUIDs, dates, and URLs to emit precise Zod validators. Schema Quality Score grades your design from A–F using local rule analysis.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  3. Zero Data Retention
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded text-[10px] font-mono uppercase tracking-normal font-bold border border-slate-200 dark:border-white/10">User-Controlled</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  All your conversion data stays exclusively in your browser&apos;s local storage — nothing is synced to a server. You can optionally sign in to manage your account and license. You can clear all local data at any moment with one click.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center shrink-0 border border-slate-200 dark:border-white/10">
                <EyeOff size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  4. Open &amp; Transparent
                  <span className="px-2.5 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded text-[10px] font-mono uppercase tracking-normal font-bold border border-slate-200 dark:border-white/10">100% Ethical</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  We will never sell or monetize your data. TypeMorph does not run third-party advertising and does not track your private structural operations. Two things can reach our servers: feedback you explicitly submit, and URLs you opt-in to fetch via the CORS proxy.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
      <GlobalFooter />
    </div>
  );
}

