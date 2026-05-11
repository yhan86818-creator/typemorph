'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Sparkles, Zap, ShieldCheck, Layers, ArrowRight } from 'lucide-react';
import { converters } from '@/data/converters';

interface LandingViewProps {
  onSelect: (slug: string) => void;
}

export function LandingView({ onSelect }: LandingViewProps) {
  const [search, setSearch] = useState('');
  
  const filtered = converters.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) || 
    c.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-full bg-[#F8FAFC] dark:bg-[#020617] p-8 pb-32">
      <div className="max-w-6xl mx-auto pt-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-6">
            <Zap size={12} /> 170+ Tools and Growing
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-tight">
            The Multi-Tool for<br /><span className="text-blue-600">Modern Engineers.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
            A high-performance, local-first workbench to transform data and logic. Built for developers who prioritize speed and privacy.
          </p>
        </motion.div>

        {/* Search Cockpit */}
        <div className="relative max-w-2xl mx-auto mb-20">
          <div className="absolute inset-0 bg-blue-600/20 blur-[80px] rounded-full" />
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-2 flex items-center shadow-2xl">
            <div className="pl-6 text-slate-400">
              <Search size={24} />
            </div>
            <input 
              type="text" 
              placeholder="Search 170+ converters (e.g. 'json to ts', 'sql to zod')..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none px-6 py-4 text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
            />
            <div className="pr-4">
              <kbd className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black text-slate-400 border border-slate-200 dark:border-slate-700">/</kbd>
            </div>
          </div>
        </div>

        {/* Categories / Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.slice(0, 50).map((tool, i) => (
            <motion.button
              key={tool.slug}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => onSelect(tool.slug)}
              className="group text-left p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 transition-all hover:shadow-2xl hover:shadow-blue-500/10 relative overflow-hidden"
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
            </motion.button>
          ))}
        </div>

        {filtered.length > 50 && (
          <p className="mt-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
            + {filtered.length - 50} more results. Keep searching...
          </p>
        )}
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
    </div>
  );
}
