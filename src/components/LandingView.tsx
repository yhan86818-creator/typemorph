'use client';
import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Sparkles, Zap, ShieldCheck, Layers, ArrowRight, X } from 'lucide-react';
import { converters } from '@/data/converters';
import GlobalFooter from '@/components/GlobalFooter';

interface LandingViewProps {
  onSelect: (slug: string) => void;
}

export function LandingView({ onSelect }: LandingViewProps) {
  const [search, setSearch] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  
  const filtered = converters.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  const isDataInput = search.length > 20 && (
    search.trim().startsWith('{') || 
    search.trim().startsWith('[') || 
    search.trim().startsWith('<') || 
    search.includes('SELECT') || 
    search.includes('INSERT') || 
    search.includes('curl') || 
    search.includes('export const')
  );

  const handleMagicExtract = () => {
    // We'll pass the search content as initial data to the workbench
    localStorage.setItem('typeflow_magic_data', search);
    onSelect('json-to-typescript'); // Default tool to land on
  };

  return (
    <div className="min-h-full bg-[#F8FAFC] dark:bg-[#020617] p-8 pb-32">
      <div className="max-w-6xl mx-auto pt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-6">
            <Zap size={12} /> AI-Powered Engineering Hub
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-tight">
            The Multi-Tool for<br /><span className="text-blue-600">Modern Engineers.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
            Search 170+ tools or paste raw data (logs, JSON, SQL) to extract structures instantly.
          </p>
        </motion.div>

        {/* Search Cockpit */}
        <div className="relative max-w-2xl mx-auto mb-32">
          <AnimatePresence>
            {isDataInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute -top-12 left-0 right-0 flex justify-center"
              >
                <button 
                  onClick={handleMagicExtract}
                  className="bg-blue-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/40 flex items-center gap-2 hover:scale-105 transition-all"
                >
                  <Sparkles size={14} /> Detect Structure & Smart Extract
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className={`absolute inset-0 bg-blue-600/20 blur-[80px] rounded-full transition-opacity duration-500 ${isDataInput ? 'opacity-100' : 'opacity-40'}`} />
          <div className={`relative bg-white dark:bg-slate-900 rounded-[2.5rem] border transition-all duration-300 p-2 flex items-center shadow-2xl ${isDataInput ? 'border-blue-500 ring-4 ring-blue-500/10 scale-[1.02]' : 'border-slate-200 dark:border-slate-800'}`}>
            <div className="pl-6 text-slate-400">
              {isDataInput ? <Sparkles className="text-blue-500 animate-pulse" size={24} /> : <Search size={24} />}
            </div>
            <textarea 
              ref={inputRef as any}
              placeholder="Search tools or paste raw data here..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400 resize-none h-[64px] no-scrollbar leading-[32px]"
            />
            <div className="pr-4">
              {search ? (
                <button onClick={() => setSearch('')} className="p-2 text-slate-300 hover:text-slate-500"><X size={20} /></button>
              ) : (
                <kbd className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 border border-slate-200 dark:border-slate-700">/</kbd>
              )}
            </div>
          </div>
        </div>

        {/* Value Proposition */}
        <div className="grid md:grid-cols-3 gap-8 mb-32">
          {[
            { icon: <ShieldCheck className="text-green-500" />, title: "Local-First Privacy", desc: "No data ever leaves your machine. Full compliance for enterprise sensitive schemas." },
            { icon: <Sparkles className="text-blue-500" />, title: "AI-Powered Logic", desc: "Beyond simple mapping. Refactor entire logic blocks with Gemini 1.5 Pro integration." },
            { icon: <Layers className="text-purple-500" />, title: "Visual Architecture", desc: "Instantly turn SQL or JSON into beautiful ER diagrams and system flows." }
          ].map((v, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-8 bg-white dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm"
            >
              <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6">{v.icon}</div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-2">{v.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{v.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Categories / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.slice(0, 50).map((tool, i) => (
            <Link
              key={tool.slug}
              href={`/converters/${tool.slug}`}
              className="group block"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.02 }}
                className="text-left p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 transition-all hover:shadow-2xl hover:shadow-blue-500/10 relative overflow-hidden h-full"
              >
                <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-10 transition-opacity">
                  <Layers size={80} />
                </div>
                <h3 className="text-lg font-black mb-3 text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">
                  {tool.title.split(' - ')[0]}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 font-medium mb-6">
                  {tool.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest group-hover:text-blue-500 transition-colors">Launch Tool</span>
                  <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </div>
              </motion.div>
            </Link>
          ))}
        </div>

        {filtered.length > 50 && (
          <p className="mt-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
            + {filtered.length - 50} more results. Keep searching...
          </p>
        )}
      </div>

        {/* Engineering Blog Section */}
        <div className="mt-40 mb-32">
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
            <div className="max-w-xl">
              <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-4">
                Engineering <span className="text-blue-600">Intelligence.</span>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium">
                Deep dives into local-first development, enterprise security, and the future of type-safe engineering workflows.
              </p>
            </div>
            <Link href="/blog" className="flex items-center gap-2 text-sm font-black text-blue-600 uppercase tracking-widest hover:gap-3 transition-all">
              View All Articles <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Link href="/blog/security-risks-of-online-converters" className="group bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-all shadow-xl hover:shadow-blue-500/10">
              <div className="text-[10px] font-black uppercase text-blue-600 mb-6 tracking-widest">Security Analysis</div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors">The Hidden Security Risks of Online JSON Converters</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 line-clamp-2">Why pasting proprietary company data into third-party web tools is a major liability.</p>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                Read Full Guide <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
            
            <Link href="/blog/nextjs-type-safety-workflow" className="group bg-white dark:bg-slate-900 rounded-[3rem] p-10 border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-all shadow-xl hover:shadow-blue-500/10">
              <div className="text-[10px] font-black uppercase text-purple-600 mb-6 tracking-widest">Engineering Guide</div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors">Ultimate Type-Safe Workflow for Next.js 15</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 line-clamp-2">A deep dive into combining Zod, React Query, and TypeScript for bulletproof API integration.</p>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400">
                Read Full Guide <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      {/* Feature Badges */}
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-full shadow-2xl z-50">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 dark:border-slate-800 pr-6">
          <ShieldCheck size={14} className="text-green-500" /> 100% Local
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest border-r border-slate-200 dark:border-slate-800 pr-6">
          <Sparkles size={14} className="text-blue-500" /> AI Enhanced
        </div>
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
          <Zap size={14} className="text-yellow-500" /> 170+ Tools
        </div>
      </div>
      <GlobalFooter />
    </div>
  );
}
