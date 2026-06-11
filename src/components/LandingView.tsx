'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Sparkles, Zap, ShieldCheck, Layers, 
  ArrowRight, X, Command, Cpu, Terminal, ChevronRight,
  Database, FileCode, CheckCircle2, FolderOpen, Key, Trash2, EyeOff
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
        icon = <FileCode className="text-blue-500" size={16} />;
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
    <div className="min-h-full bg-[#F8FAFC] dark:bg-[#030712] p-8 pb-32 transition-colors duration-500 relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-blue-600/[0.03] blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto pt-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-24"
        >
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-10 text-slate-900 dark:text-white leading-[0.9]">
            Build Faster.<br />
            <span>Model Everything.</span>
          </h1>

          <VisualDemo />

          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            The premium schema workbench for modern software architects. <br className="hidden md:block" />
            290+ tools, 100% local-first, including institutional-grade financial & database engineering.
          </p>
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
                  <div className="mx-auto w-fit flex items-center gap-4 px-5 py-2.5 bg-white dark:bg-slate-950 rounded-xl border border-blue-600/30 shadow-[0_20px_50px_rgba(245,158,11,0.08)] backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-600/10 rounded-lg flex items-center justify-center text-blue-600">
                        {aiAnalysis.icon}
                      </div>
                      <div className="text-left">
                        <p className="text-[8px] font-mono uppercase tracking-wider text-blue-600">[pattern-detected]</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{aiAnalysis.type}</p>
                      </div>
                    </div>
                    <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                    <button 
                      onClick={handleMagicExtract}
                      className="flex items-center gap-1.5 bg-blue-600 text-white px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider hover:bg-blue-700 transition-colors shadow-md"
                    >
                      Instant Synthesis <ChevronRight size={12} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`relative bg-white dark:bg-slate-900/80 rounded-2xl border transition-all duration-500 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.05)] dark:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] ${isFocused ? 'border-blue-600 ring-4 ring-blue-600/5' : 'border-slate-200 dark:border-slate-800/80'}`}>
              <div className="p-1.5 flex items-start">
                <div className="p-4 text-slate-400">
                  {aiAnalysis ? <Zap className="text-blue-600" size={20} /> : <Search size={20} />}
                </div>
                <textarea 
                  ref={inputRef}
                  placeholder="Paste raw schema (SQL DDL, JSON, cURL) or search 290+ tools..." 
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
                    <div className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-[9px] font-mono text-slate-400">
                      <Command size={10} /> <span className="mt-0.5">K</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Visual Decor */}
            <div className="absolute -bottom-1 left-12 right-12 h-px bg-blue-600/20" />
          </div>

          {/* Quick Stats */}
          <div className="mt-6 flex justify-center gap-8">
            {[
              { label: 'Total Utilities', value: '317' },
              { label: 'Security Standard', value: 'Local-First' },
              { label: 'AI Synthesis', value: 'Gemini 2.5' }
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-[8px] font-mono uppercase tracking-wider text-slate-400 mb-0.5">{s.label}</p>
                <p className="text-xs font-black text-slate-600 dark:text-slate-300">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Three Core Stars (Z-Pattern Scroll Story) */}
        <div className="space-y-40 mb-40">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white leading-tight">
              Three Pillars of <span className="text-transparent bg-clip-text text-blue-600">Pure Schema Engineering</span>
            </h2>
            <p className="text-lg text-slate-500 dark:text-slate-400 font-medium mt-4">
              We cut out the clutter. These three massive, premium workbenches solve 90% of your daily structural bottlenecks.
            </p>
          </div>

          {/* Pillar 1: Logic Lab (Left Text, Right Image) */}
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-5 space-y-6">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Logic Lab: <br />
                <span className="text-blue-600">Synthesize Complete Services</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Don&apos;t just convert raw JSON into static types. Logic Lab automatically generates full react-query hooks, typescript mock services, and API fetch functions mapped perfectly to your structures. Copy and drop straight into production.
              </p>
              <ul className="space-y-3 font-semibold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  1-Click React Hook generation
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  TypeScript Mock Data & Service classes
                </li>
              </ul>
            </div>
            <div className="md:col-span-7 relative group">
              <div className="absolute inset-0 bg-blue-600/[0.02] blur-[80px] rounded-full pointer-events-none" />
              <div className="relative p-1 bg-slate-200/40 dark:bg-slate-800/30 rounded-xl shadow-2xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
                <img 
                  src="/logic-preview.png" 
                  alt="Logic Lab Preview" 
                  className="w-full h-auto rounded-lg object-cover"
                />
              </div>
            </div>
          </div>

          {/* Pillar 2: Architecture (Right Text, Left Image) */}
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-7 md:order-1 relative group">
              <div className="absolute inset-0 bg-blue-600/[0.02] blur-[80px] rounded-full pointer-events-none" />
              <div className="relative p-1 bg-slate-200/40 dark:bg-slate-800/30 rounded-xl shadow-2xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
                <img 
                  src="/hero-preview.png" 
                  alt="Architecture View Preview" 
                  className="w-full h-auto rounded-lg object-cover"
                />
              </div>
            </div>
            <div className="md:col-span-5 md:order-2 space-y-6">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Architecture Visuals: <br />
                <span className="text-blue-600">Visual Role-Based Diagramming</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Paste your SQL DDL or raw API structures, and watch a beautiful ER/System diagram render instantly. Our engine automatically scans the node roles (API, Database, Client) and dynamically injects vivid neon styling. Export as 3x high-resolution transparent PNGs for presentation slides.
              </p>
              <ul className="space-y-3 font-semibold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  Dynamic role-based auto-coloring node engine
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  3x resolution presentation-grade PNG/SVG export
                </li>
              </ul>
            </div>
          </div>

          {/* Pillar 3: Smart Diff (Left Text, Right Image) */}
          <div className="grid md:grid-cols-12 gap-12 items-center">
            <div className="md:col-span-5 space-y-6">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Smart Structural Diff: <br />
                <span className="text-blue-600">Compare Keys, Ignore Chaos</span>
              </h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Standard text-diffs break when keys are in a different order or when formatting changes. TypeMorph&apos;s Smart Diff parses data into an abstract AST, matching properties semantically. It highlights actual, structural delta while filtering out formatting noise, so you can debug API changes instantly.
              </p>
              <ul className="space-y-3 font-semibold text-slate-600 dark:text-slate-300">
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  AST-level semantic structure matching
                </li>
                <li className="flex items-center gap-3 text-sm">
                  <CheckCircle2 size={16} className="text-blue-600" />
                  Clean side-by-side colorized node delta view
                </li>
              </ul>
            </div>
            <div className="md:col-span-7 relative group">
              <div className="absolute inset-0 bg-blue-600/[0.02] blur-[80px] rounded-full pointer-events-none" />
              <div className="relative p-1 bg-slate-200/40 dark:bg-slate-800/30 rounded-xl shadow-2xl border border-white/20 dark:border-slate-700/20 overflow-hidden">
                <img 
                  src="/diff-preview.png" 
                  alt="Smart Diff Preview" 
                  className="w-full h-auto rounded-lg object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Competitor Comparison Section */}
        <div className="mb-40">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Why TypeMorph <span className="text-blue-600">Pro?</span></h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">The ultimate balance of speed, privacy, and AI precision.</p>
          </div>
          
          <div className="overflow-x-auto pb-8 custom-scrollbar">
            <div className="min-w-[800px] grid grid-cols-4 gap-4 items-stretch">
              {/* Header */}
              <div className="col-span-1"></div>
              <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-blue-600 relative shadow-xl shadow-blue-600/[0.02] flex flex-col items-center justify-center text-center">
                <div className="absolute -top-3.5 bg-blue-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-wider">TypeMorph</div>
                <ShieldCheck size={28} className="text-blue-600 mb-2" />
                <h3 className="font-black text-slate-900 dark:text-white text-sm">TypeMorph</h3>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center opacity-70">
                <FileCode size={20} className="text-slate-400 mb-2" />
                <h3 className="font-bold text-slate-600 dark:text-slate-400 text-xs">Legacy Web Tools</h3>
              </div>
              <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center opacity-70">
                <Terminal size={20} className="text-slate-400 mb-2" />
                <h3 className="font-bold text-slate-600 dark:text-slate-400 text-xs">Generic AI Chatbots</h3>
              </div>

              {/* Rows */}
              {[
                { label: 'Data Privacy', tf: 'Local Engine (Opt-in AI)', std: 'Unknown / Cloud', ai: 'Stored & Trained on' },
                { label: 'Broken Data Handling', tf: 'AI Auto-Repair', std: 'Syntax Error (Fails)', ai: 'Manual Prompting' },
                { label: 'Speed & Workflow', tf: 'Instant / 1-Click UI', std: 'Instant', ai: 'Slow typing / Copy-Paste' },
                { label: 'Available Tools', tf: '290+ Dedicated UIs', std: 'Limited (10-20)', ai: 'Infinite (Needs context)' },
                { label: 'Visual Architecture', tf: 'Automated Interactive SVGs', std: 'None', ai: 'Raw Code Only' }
              ].map((row, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center justify-end pr-6 text-[10px] font-bold uppercase tracking-wider text-slate-400 text-right">{row.label}</div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-600/10 flex items-center justify-center text-center text-xs font-bold text-blue-700 dark:text-blue-400 shadow-sm">{row.tf}</div>
                  <div className="bg-slate-50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-center text-center text-xs font-medium text-slate-500">{row.std}</div>
                  <div className="bg-slate-50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 flex items-center justify-center text-center text-xs font-medium text-slate-500">{row.ai}</div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy Manifesto Section */}
        <div className="max-w-5xl mx-auto -mt-20 mb-40 p-10 rounded-3xl bg-white dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-700/50 shadow-2xl dark:shadow-black/40">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600/10 text-blue-700 dark:text-blue-400 font-mono text-[9px] uppercase tracking-wider mb-4 border border-blue-600/20 shadow-sm">
              <ShieldCheck size={12} /> Privacy Manifesto
            </div>
            <h3 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-3">
              100% Privacy-First Architecture
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-semibold max-w-xl mx-auto">
              Your code never leaves your browser. We clearly separate secure local-only conversions from transparent client-to-Google direct AI operations.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-inner">
                <Cpu size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  1. Local-First Engine
                  <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[8px] font-mono uppercase tracking-normal font-bold">100% Private</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Standard code conversions (JSON to TS/Go/Rust, etc.) are executed 100% entirely inside your browser via local client-side memory. Zero network traffic, zero external transmission. Your sensitive corporate payloads remain strictly secure on your machine.
                </p>
              </div>
            </div>

            {/* Card 2 */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/20 shadow-inner">
                <Key size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  2. BYOK AI Model
                  <span className="px-2.5 py-0.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg text-[8px] font-mono uppercase tracking-normal font-bold">Zero Proxy</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  For advanced synthesis like AI Smart Parse and UI Generation, requests connect directly to Google&apos;s official Gemini API. TypeMorph never proxies, stores, or inspects your API keys or data payloads. You maintain absolute control over your key and logic.
                </p>
              </div>
            </div>

            {/* Card 3 */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20 shadow-inner">
                <Trash2 size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  3. Zero Data Retention
                  <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[8px] font-mono uppercase tracking-normal font-bold">User-Controlled</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  Guest sessions are kept exclusively inside your local storage. Conversion history cloud syncing (Supabase) is entirely optional and only active when you explicitly sign up and log in. You can wipe all history or URL state parameters at any moment with one click.
                </p>
              </div>
            </div>

            {/* Card 4 */}
            <div className="p-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-sm flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20 shadow-inner">
                <EyeOff size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                  4. Open &amp; Transparent
                  <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[8px] font-mono uppercase tracking-normal font-bold">100% Ethical</span>
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-semibold">
                  We will never sell or monetize your data. TypeMorph does not run third-party advertising, does not track your private structural operations, and absolutely never uses your source code to train AI models.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Social Proof / Comparison Section */}
        <div className="mt-60 mb-40 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600/5 text-blue-700 dark:text-blue-400 font-mono text-[9px] uppercase tracking-wider mb-12 border border-blue-600/10">
            [trusted-by-enterprise-architects]
          </div>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-20 items-center">
            <div className="text-left">
              <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                Stop pasting data into <span className="text-red-500 underline decoration-red-500/30">ad-heavy</span> tools.
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed mb-8">
                TypeMorph is the clean, high-performance alternative. No ads, no data mining, and zero latency. Just pure engineering utility.
              </p>
              <div className="space-y-4">
                {[
                  'Full-Stack AI Synthesis (Prisma ➡ Next.js API CRUD Auto-Gen)',
                  'AI UI Premium Synthesizer (Instant dynamic React+Tailwind UI previews)',
                  'Local Folder Bulk Mode (Transform entire folders instantly)',
                  'Auto-Healing Parser (Synthesizes even broken & malformed payloads)',
                  '100% Client-Side Sandbox (Zero server transmission, sub-millisecond compile)',
                  'Developer-Rule Configs (Infer UUIDs, optional fields, and default exports)'
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0"><CheckCircle2 size={12} /></div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/[0.02] blur-[100px] rounded-full" />
              <div className="relative p-1 bg-slate-200 dark:bg-slate-800 rounded-xl shadow-2xl overflow-hidden">
                <div className="bg-white dark:bg-slate-900 rounded-lg p-10">
                   <div className="flex gap-4 mb-8">
                     <div className="w-3 h-3 rounded-full bg-red-400" />
                     <div className="w-3 h-3 rounded-full bg-blue-400" />
                     <div className="w-3 h-3 rounded-full bg-green-400" />
                   </div>
                   <div className="space-y-4">
                     <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-full" />
                     <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
                     <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-full" />
                   </div>
                   <div className="mt-12 p-6 bg-blue-600/5 rounded-xl border border-blue-600/10 shadow-inner">
                     <div className="flex items-center gap-2 mb-2">
                       <ShieldCheck className="text-blue-600" size={14} />
                       <span className="text-[10px] font-black uppercase text-blue-600">PRISMA ➡ NEXT.JS API SYNTHESIS</span>
                     </div>
                     <div className="h-3 w-full bg-blue-600/20 rounded-full mb-3" />
                     <div className="h-3 w-3/4 bg-blue-600/20 rounded-full" />
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}

