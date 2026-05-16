'use client';
import React, { useState } from 'react';
import { Layout, Search, Code2, Crown, History, Wand2, Zap, Sparkles, Layers } from 'lucide-react';
import { converters } from '@/data/converters';

interface SidebarProps {
  selectedSlug: string;
  onSelect: (slug: string) => void;
  isDark: boolean;
  setView: (view: string) => void;
  currentView: string;
}

export function Sidebar({ selectedSlug, onSelect, isDark, setView, currentView }: SidebarProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  
  const categories = ['All', 'JSON', 'SQL', 'XML', 'YAML', 'CSV', 'React', 'TS'];

  const filtered = converters.filter(c => {
    const searchMatch = c.title.toLowerCase().includes(search.toLowerCase()) || 
      c.slug.toLowerCase().includes(search.toLowerCase());
    const categoryMatch = categoryFilter === 'All' || 
      c.title.toLowerCase().includes(categoryFilter.toLowerCase()) ||
      c.slug.toLowerCase().includes(categoryFilter.toLowerCase());
    return searchMatch && categoryMatch;
  });

  return (
    <div className="w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 hidden xl:flex flex-col h-full">
      <div className="p-6">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
          <Sparkles size={14}/> Advanced Intelligence
        </h3>
        
        <div className="space-y-1 mb-10">
          {[
            { id: 'app', label: 'Workbench', icon: <Layout size={14}/>, color: 'text-blue-500' },
            { id: 'lab', label: 'Logic Lab', icon: <Zap size={14}/>, color: 'text-purple-500' },
            { id: 'visual', label: 'Architecture', icon: <Layers size={14}/>, color: 'text-green-500' },
            { id: 'smart-diff', label: 'Smart Diff', icon: <Wand2 size={14}/>, color: 'text-indigo-500' },
            { id: 'regex-builder', label: 'AI Regex', icon: <Search size={14}/>, color: 'text-pink-500' },
          ].map((v) => (
            <button 
              key={v.id}
              onClick={() => setView(v.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${currentView === v.id ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <span className={v.color}>{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>

        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
          <Layout size={14}/> All Converters
        </h3>
        
        <div className="relative mb-6">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 pl-10 pr-4 py-2 rounded-xl text-xs outline-none focus:border-blue-600 transition-all dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar mb-4 pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-500'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-1 overflow-y-auto flex-1 max-h-[calc(100vh-420px)] no-scrollbar pr-2">
          {filtered.map(tab => (
            <button 
              key={tab.slug} 
              onClick={() => onSelect(tab.slug)} 
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${selectedSlug === tab.slug ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-800' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent'}`}
            >
              <span className="flex items-center gap-2 truncate pr-2">
                <Code2 size={12} className={selectedSlug === tab.slug ? 'text-blue-500' : 'text-slate-400'} /> 
                <span className="truncate">{tab.title.split(' - ')[0]}</span>
              </span>
              {/* Optional: Add pro badge if needed */}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 flex items-center gap-2">
          <History size={14}/> Support
        </h3>
        <a 
          href="https://yhanster206.gumroad.com/l/zjcuuu" 
          target="_blank" 
          className="flex items-center justify-between w-full p-4 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-xl shadow-blue-500/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">TypeFlow Pro</span>
            <span className="text-sm font-black">Lifetime Access</span>
          </div>
          <Crown size={20} className="text-white/40" />
        </a>
      </div>
    </div>
  );
}
