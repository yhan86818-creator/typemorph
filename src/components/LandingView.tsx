'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Sparkles, Zap, ShieldCheck, Layers, 
  ArrowRight, X, Command, Cpu, Terminal, ChevronRight,
  Database, FileCode, CheckCircle2
} from 'lucide-react';
import { converters } from '@/data/converters';
import GlobalFooter from '@/components/GlobalFooter';

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
    setMounted(true);
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
        setAiAnalysis({ type, suggestion, icon });
      } else {
        setAiAnalysis(null);
      }
    } else {
      setAiAnalysis(null);
    }
  }, [search]);
  
  const filtered = converters.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.slug.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 48);

  const handleMagicExtract = () => {
    localStorage.setItem('typeflow_magic_data', search);
    onSelect(aiAnalysis?.suggestion || 'json-to-typescript');
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] dark:bg-[#020617] p-8 pb-32 transition-colors duration-500 relative">
      {/* Background Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-[500px] bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-6xl mx-auto pt-24 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-24"
        >
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm">
              <Sparkles size={12} className="text-blue-500" /> Neural Engineering Engine
            </div>
            <a 
              href="https://discord.gg/typeflow" 
              target="_blank"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 font-black text-[10px] uppercase tracking-[0.2em] shadow-sm hover:scale-105 transition-transform"
            >
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Join Community
            </a>
          </div>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-10 text-slate-900 dark:text-white leading-[0.9]">
            Build Faster.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">Convert Everything.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            The premium workbench for modern software architects. <br className="hidden md:block" />
            300+ tools, 100% local-first, including institutional-grade financial & neural engineering.
          </p>
        </motion.div>

        {/* Search Cockpit */}
        <div className="relative max-w-3xl mx-auto mb-40">
          <div className={`relative transition-all duration-500 ${isFocused ? 'scale-[1.02]' : 'scale-100'}`}>
            {/* AI Insight Popover */}
            <AnimatePresence>
              {mounted && aiAnalysis && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute -top-20 left-0 right-0 z-20"
                >
                  <div className="mx-auto w-fit flex items-center gap-4 px-6 py-3 bg-white dark:bg-slate-900 rounded-2xl border border-blue-500/30 shadow-[0_20px_50px_rgba(59,130,246,0.15)] backdrop-blur-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        {aiAnalysis.icon}
                      </div>
                      <div className="text-left">
                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-500">Pattern Detected</p>
                        <p className="text-xs font-bold text-slate-900 dark:text-white">{aiAnalysis.type}</p>
                      </div>
                    </div>
                    <div className="w-px h-8 bg-slate-100 dark:bg-slate-800" />
                    <button 
                      onClick={handleMagicExtract}
                      className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
                    >
                      Instant Synthesis <ChevronRight size={14} />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`relative bg-white dark:bg-slate-900 rounded-[2.5rem] border transition-all duration-500 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] dark:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.3)] ${isFocused ? 'border-blue-500 ring-8 ring-blue-500/5' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="p-2 flex items-start">
                <div className="p-5 text-slate-400">
                  {aiAnalysis ? <Zap className="text-blue-500 animate-pulse" size={24} /> : <Search size={24} />}
                </div>
                <textarea 
                  ref={inputRef}
                  placeholder="Paste raw data (JSON, SQL, Logs) or search 300+ tools..." 
                  value={search}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none p-5 text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400 resize-none h-[88px] custom-scrollbar leading-relaxed"
                />
                <div className="p-4 flex flex-col gap-2">
                  {search ? (
                    <button onClick={() => setSearch('')} className="p-2 text-slate-300 hover:text-slate-500 transition-colors"><X size={20} /></button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-[10px] font-black text-slate-400">
                      <Command size={12} /> <span className="mt-0.5">K</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Visual Decor */}
            <div className="absolute -bottom-1 left-12 right-12 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
          </div>

          {/* Quick Stats */}
          <div className="mt-8 flex justify-center gap-10">
            {[
              { label: 'Total Utilities', value: '317' },
              { label: 'Security Standard', value: 'Local-First' },
              { label: 'AI Synthesis', value: 'Gemini 1.5' }
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{s.label}</p>
                <p className="text-xs font-black text-slate-600 dark:text-slate-300">{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it Works Section */}
        <div className="mb-40">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-4">Engineering Workflow <span className="text-blue-600">Simplified</span></h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium">From raw chaos to production-ready types in seconds.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-12">
            {[
              { step: '01', title: 'Input Raw Data', desc: 'Paste your JSON, SQL, CURL, or even messy server logs directly into the cockpit.' },
              { step: '02', title: 'Instant Synthesis', desc: 'Our engine detects the pattern and synthesizes the optimal structure locally.' },
              { step: '03', title: 'Export & Ship', desc: 'Copy the result (Types, Schemas, or Models) and drop it into your codebase.' }
            ].map((s, i) => (
              <div key={i} className="relative group">
                <div className="text-8xl font-black text-slate-100 dark:text-slate-800/30 absolute -top-10 -left-4 z-0 group-hover:text-blue-50 transition-colors">{s.step}</div>
                <div className="relative z-10">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{s.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Grid - The Core Value */}
        <div className="grid md:grid-cols-3 gap-8 mb-40">
          {[
            { 
              icon: <ShieldCheck className="text-blue-600" />, 
              title: "100% Local-First", 
              desc: "Zero-Trace Privacy. Your proprietary schemas and API payloads never leave your browser. Built for high-security enterprise environments." 
            },
            { 
              icon: <Cpu className="text-indigo-600" />, 
              title: "Neural Structural Repair", 
              desc: "Don't worry about broken JSON or incomplete logs. Our AI-enhanced synthesis fills the gaps and infers types with surgical precision." 
            },
            { 
              icon: <Layers className="text-purple-600" />, 
              title: "Unified Workbench", 
              desc: "Stop jumping between 20 different websites. Access 300+ professional-grade utilities in one cohesive, ad-free environment." 
            }
          ].map((v, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-10 bg-white dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group"
            >
              <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">{v.icon}</div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-3">{v.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Category Header */}
        <div className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-4">
            <div className="w-2 h-8 bg-blue-600 rounded-full" />
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Tool <span className="text-blue-600">Registry</span></h2>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Showing Top Utilities</p>
        </div>

        {/* Grid Results */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {filtered.map((tool, i) => (
            <Link
              key={tool.slug}
              href={`/converters/${tool.slug}`}
              className="group block"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-blue-600 transition-all hover:shadow-2xl hover:shadow-blue-500/5 h-full flex flex-col justify-between"
              >
                <div>
                  <h3 className="text-sm font-black mb-2 text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                    {tool.title.split(' - ')[0]}
                  </h3>
                  <p className="text-[10px] text-slate-400 line-clamp-2 font-bold uppercase tracking-wider mb-4">
                    {tool.category}
                  </p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                  <span className="text-[9px] font-black uppercase text-slate-300 group-hover:text-blue-500 tracking-widest transition-colors">Launch Utility</span>
                  <ArrowRight size={14} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {converters.length > filtered.length && (
          <div className="mt-16 text-center">
            <button className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all">
              Load Full Toolchain ({converters.length})
            </button>
          </div>
        )}

        {/* Social Proof / Comparison Section */}
        <div className="mt-60 mb-40 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 font-bold text-[9px] uppercase tracking-widest mb-12 border border-green-100 dark:border-green-900/30">
            <CheckCircle2 size={12} /> Trusted by Enterprise Architects
          </div>
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-20 items-center">
            <div className="text-left">
              <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-6 leading-tight">
                Stop pasting data into <span className="text-red-500 underline decoration-red-500/30">ad-heavy</span> tools.
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium text-lg leading-relaxed mb-8">
                TypeFlow Pro is the clean, high-performance alternative. No ads, no data mining, and zero latency. Just pure engineering utility.
              </p>
              <div className="space-y-4">
                {['100% Client-Side Processing', 'SOC2 / GDPR Compatible Flow', 'Advanced AI Error Correction'].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                    <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white"><CheckCircle2 size={12} /></div>
                    {f}
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-blue-600/20 blur-[100px] rounded-full" />
              <div className="relative p-1 bg-slate-200 dark:bg-slate-800 rounded-[3rem] shadow-2xl overflow-hidden">
                <div className="bg-white dark:bg-slate-900 rounded-[2.8rem] p-10">
                   <div className="flex gap-4 mb-8">
                     <div className="w-3 h-3 rounded-full bg-red-400" />
                     <div className="w-3 h-3 rounded-full bg-amber-400" />
                     <div className="w-3 h-3 rounded-full bg-green-400" />
                   </div>
                   <div className="space-y-4">
                     <div className="h-4 w-3/4 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                     <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                     <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse" />
                   </div>
                   <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-3xl border border-blue-100 dark:border-blue-900/30">
                     <div className="flex items-center gap-3 mb-2">
                       <Sparkles className="text-blue-600" size={16} />
                       <span className="text-[10px] font-black uppercase text-blue-600">AI Optimized</span>
                     </div>
                     <div className="h-3 w-full bg-blue-200/50 dark:bg-blue-400/20 rounded-full" />
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

