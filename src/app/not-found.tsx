import React from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Home } from 'lucide-react';
import { converters } from '@/data/converters';
import GlobalFooter from '@/components/GlobalFooter';

export default function NotFound() {
  // Pick some popular/random tools to suggest
  const suggestions = converters.slice(0, 6);

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617]">
      <main className="max-w-4xl mx-auto px-6 pt-40 pb-40 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-3xl mb-8">
          <Search size={40} />
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-6 text-slate-900 dark:text-white">
          404: Tool <span className="text-red-600">Not Found.</span>
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 font-medium mb-12 max-w-xl mx-auto">
          We couldn't find the specific converter you were looking for. It might have been moved or renamed.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-24">
          <Link href="/" className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-xl shadow-blue-500/20 hover:scale-105 transition-all">
            <Home size={16} /> Back to Home
          </Link>
          <Link href="/converters/" className="px-8 py-4 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl font-black uppercase text-xs tracking-widest border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-all">
            Browse All Tools
          </Link>
        </div>

        <div className="text-left border-t border-slate-200 dark:border-slate-800 pt-16">
          <h2 className="text-2xl font-black mb-8 text-slate-900 dark:text-white">Popular Converters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suggestions.map(tool => (
              <Link 
                key={tool.slug}
                href={`/converters/${tool.slug}`}
                className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-600 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{tool.category}</div>
                  <div className="font-black text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{tool.title}</div>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
