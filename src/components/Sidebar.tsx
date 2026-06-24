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

  const labelClass = 'text-[10px] uppercase font-semibold';
  const labelStyle = { color: '#6e7681', letterSpacing: '0.1em' } as React.CSSProperties;

  const renderItem = (tab: typeof converters[number]) => {
    const active = selectedSlug === tab.slug;
    return (
      <button
        key={tab.slug}
        onClick={() => onSelect(tab.slug)}
        className={`w-full text-left px-3 py-2 rounded-md text-xs font-medium flex items-center gap-2 transition-colors ${active ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white' : 'text-slate-500 dark:text-[#8b949e] hover:bg-slate-50 dark:hover:bg-white/[0.03] hover:text-slate-800 dark:hover:text-slate-200'}`}
      >
        <span className="flex-none text-[10px]" style={{ color: active ? undefined : '#6e7681' }}>↳</span>
        <span className="truncate">{tab.title.split(' - ')[0]}</span>
      </button>
    );
  };

  return (
    <div className={`bg-white dark:bg-[#0d1117] border-r border-slate-200 dark:border-[#21262d] hidden xl:flex flex-col h-full transition-all duration-300 ease-in-out overflow-hidden ${isCollapsed ? 'w-0 border-none opacity-0' : 'w-72 opacity-100'}`}>

      <div className="px-4 py-5 flex-1 flex flex-col min-h-0 min-w-[288px]">

        <h3 className={`${labelClass} mb-3`} style={labelStyle}>Workbench</h3>

        <div className="space-y-0.5 mb-6">
          {[
            { id: 'app', label: 'Workbench', icon: <Layout size={14} /> },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${currentView === v.id ? 'bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white' : 'text-slate-400 dark:text-[#8b949e] hover:text-slate-600 dark:hover:text-slate-200'}`}
            >
              <span style={{ color: currentView === v.id ? undefined : '#6e7681' }}>{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#6e7681' }} />
          <input
            type="text"
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-white/[0.04] border border-slate-100 dark:border-[#21262d] pl-9 pr-3 py-2 rounded-lg text-xs outline-none focus:border-slate-900 dark:focus:border-white/30 transition-all dark:text-white"
          />
        </div>

        {/* Category filter */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mb-5 pb-1">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2.5 py-1 text-[11px] whitespace-nowrap rounded-md transition-colors ${categoryFilter === cat ? 'bg-slate-100 dark:bg-white/[0.08] text-slate-900 dark:text-white font-semibold' : 'text-slate-400 dark:text-[#6e7681] hover:text-slate-600 dark:hover:text-slate-300'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        <h3 className={`${labelClass} mb-2`} style={labelStyle}>Converters</h3>

        <div className="space-y-0.5 overflow-y-auto flex-1 max-h-[calc(100vh-360px)] no-scrollbar pr-1">
          {/* Pinned converters — always visible regardless of search/filter */}
          {(() => {
            const pinnedSlugs = ['json-to-typescript', 'json-to-zod', 'sql-to-zod'];
            const pinned = pinnedSlugs.map(slug => converters.find(c => c.slug === slug)).filter(Boolean) as typeof converters;
            return pinned.map(renderItem);
          })()}
          {filtered.length > 0 && (
            <div className="border-t border-slate-100 dark:border-[#21262d] my-2" />
          )}
          {filtered.map(tab => {
            const pinnedSlugs = ['json-to-typescript', 'json-to-zod', 'sql-to-zod'];
            if (pinnedSlugs.includes(tab.slug)) return null;
            return renderItem(tab);
          })}
        </div>
      </div>

    </div>
  );
}
