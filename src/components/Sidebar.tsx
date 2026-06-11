'use client';

import { trackProClick } from '@/lib/analytics';
import React, { useState, useEffect } from 'react';
import { Layout, Search, Code2, Crown, History, ShieldCheck } from 'lucide-react';
import { converters } from '@/data/converters';

interface SidebarProps {
  selectedSlug: string;
  onSelect: (slug: string) => void;
  isDark: boolean;
  setView: (view: string) => void;
  currentView: string;
  isCollapsed?: boolean;
  cursorPos?: { x: number, y: number };
  isEditorEmpty?: boolean;
  editorError?: string | null;
}

export function Sidebar({ selectedSlug, onSelect, isDark, setView, currentView, isCollapsed, cursorPos, isEditorEmpty, editorError }: SidebarProps) {
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
    <div className={`bg-white dark:bg-[#090d16] border-r border-slate-200 dark:border-slate-800/80 hidden xl:flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'w-0 border-none opacity-0' : 'w-72 opacity-100'}`}>

      <div className="p-6 flex-1 flex flex-col min-h-0 min-w-[288px]">


        <h3 className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
          <ShieldCheck size={12} className="text-blue-600"/> [workbench]
        </h3>
        
        <div className="space-y-1 mb-8">
          {[
            { id: 'app', label: 'Workbench', icon: <Layout size={14}/> },
          ].map((v) => (
            <button 
              key={v.id}
              onClick={() => setView(v.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-black transition-all ${currentView === v.id ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              <span className={currentView === v.id ? 'text-blue-600' : 'text-slate-400'}>{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>

        <h3 className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
          <Layout size={12} className="text-slate-400"/> Converters
        </h3>
        
        <div className="relative mb-4">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 pl-9 pr-3 py-1.5 rounded-xl text-xs outline-none focus:border-blue-600 transition-all dark:text-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mb-4 pb-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-mono uppercase tracking-wider whitespace-nowrap transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-blue-600'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-1 overflow-y-auto flex-1 max-h-[calc(100vh-420px)] no-scrollbar pr-2">
          {/* Fixed top converters — always visible regardless of search/filter */}
          {(() => {
            const pinnedSlugs = ['json-to-typescript', 'json-to-zod', 'sql-to-zod'];
            const pinned = pinnedSlugs.map(slug => converters.find(c => c.slug === slug)).filter(Boolean) as typeof converters;
            return pinned.map(tab => (
              <button 
                key={tab.slug} 
                onClick={() => onSelect(tab.slug)} 
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${selectedSlug === tab.slug ? 'bg-blue-600/10 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-600/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}
              >
                <span className="flex items-center gap-2 truncate pr-2">
                  <Code2 size={12} className={selectedSlug === tab.slug ? 'text-blue-600' : 'text-slate-400'} /> 
                  <span className="truncate">{tab.title.split(' - ')[0]}</span>
                </span>
              </button>
            ));
          })()}
          {/* Separator line when there are filtered results */}
          {filtered.length > 0 && (
            <div className="border-t border-slate-100 dark:border-slate-800 my-2" />
          )}
          {filtered.map(tab => {
            // Skip pinned items to avoid duplicates
            const pinnedSlugs = ['json-to-typescript', 'json-to-zod', 'sql-to-zod'];
            if (pinnedSlugs.includes(tab.slug)) return null;
            return (
              <button 
                key={tab.slug} 
                onClick={() => onSelect(tab.slug)} 
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${selectedSlug === tab.slug ? 'bg-blue-600/10 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-600/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'}`}
              >
                <span className="flex items-center gap-2 truncate pr-2">
                  <Code2 size={12} className={selectedSlug === tab.slug ? 'text-blue-600' : 'text-slate-400'} /> 
                  <span className="truncate">{tab.title.split(' - ')[0]}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      
      <div className="mt-auto p-6 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#030712]/50">
        <h3 className="text-[10px] font-mono uppercase text-slate-400 tracking-wider mb-4 flex items-center gap-1.5">
          <History size={12} className="text-slate-400"/> [licensing]
        </h3>
        <a 
          href="https://yhanster206.gumroad.com/l/zjcuuu" 
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackProClick('sidebar_gumroad')}
          className="flex items-center justify-between w-full p-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-white shadow-md shadow-blue-600/10 hover:scale-[1.01] active:scale-95 transition-all"
        >
          <div className="flex flex-col">
            <span className="text-[8px] font-mono uppercase tracking-wider opacity-80">TypeMorph</span>
            <span className="text-sm font-black">Lifetime Access</span>
          </div>
          <Crown size={18} className="text-white/40" />
        </a>
      </div>
    </div>
  );
}
