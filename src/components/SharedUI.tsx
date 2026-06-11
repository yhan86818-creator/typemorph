'use client';
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Table, Layers, ArrowRight } from 'lucide-react';

// --- ToolLink Component ---
export function ToolLink({ tool, isPro = false }: { tool: any, isPro?: boolean }) {
  return (
    <a 
      href={`/converters/${tool.slug}`}
      className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-300 transition-all group flex flex-col justify-between h-full relative"
    >
      {isPro && (
        <span className="absolute -top-2 -right-2 px-2 py-1 bg-blue-600 text-white text-[8px] font-black rounded-lg shadow-lg shadow-blue-200 border border-blue-700 uppercase tracking-widest z-10">
          Pro
        </span>
      )}
      <div>
        <p className="text-xs font-black text-slate-900 dark:text-slate-200 group-hover:text-blue-600 transition-colors leading-relaxed">
          {tool.title.split(' - ')[0]}
        </p>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-[8px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-tighter bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded">
          {tool.slug.split('-').slice(-1)[0]}
        </span>
        <ArrowRight size={12} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
      </div>
    </a>
  );
}

// --- FeatureCard Component ---
export function FeatureCard({ icon, title, desc, color, isPro = false }: { icon: React.ReactNode, title: string, desc: string, color: string, isPro?: boolean }) {
  const colorMap: any = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900',
    slate: 'bg-slate-50 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 border-slate-100 dark:border-slate-800',
    amber: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-900'
  };
  return (
    <div className="p-10 rounded-[3rem] relative overflow-hidden bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
      {isPro && (
        <div className="absolute top-6 right-6 flex flex-col items-end gap-1">
          <div className="bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 text-[8px] font-black px-2 py-1 rounded-full uppercase border border-blue-200 dark:border-blue-900">
            Pro
          </div>
          <div className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">
            3 Daily Trials
          </div>
        </div>
      )}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border ${colorMap[color]}`}>{icon}</div>
      <h3 className="text-2xl font-black mb-4 tracking-tight dark:text-white">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  );
}

// --- JsonVisualizer Component ---
export const JsonVisualizer = ({ data, name = "root", depth = 0 }: { data: any, name?: string, depth?: number }) => {
  const [isOpen, setIsOpen] = React.useState(depth < 2);
  const isObj = typeof data === 'object' && data !== null;
  const isArr = Array.isArray(data);

  if (!isObj) {
    const type = typeof data;
    const color = type === 'string' ? 'text-green-500' : type === 'number' ? 'text-blue-500' : type === 'boolean' ? 'text-orange-500' : 'text-slate-400';
    return (
      <div className="flex items-center gap-2 py-0.5 ml-4 group hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 transition-colors">
        <span className="text-slate-400 dark:text-slate-400 font-mono text-[10px]">{name}:</span>
        <span className={`${color} font-mono text-[10px] font-bold`}>
          {type === 'string' ? `"${data}"` : String(data)}
        </span>
        <span className="text-[8px] text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black">{type}</span>
      </div>
    );
  }

  return (
    <div className="ml-4">
      <div className="flex items-center gap-2 cursor-pointer py-1 group hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded px-1 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <ChevronRight size={12} className={`text-slate-300 dark:text-slate-600 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        <div className="w-4 h-4 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
          {isArr ? <Table size={10} /> : <Layers size={10} />}
        </div>
        <span className="text-slate-900 dark:text-white font-bold font-mono text-[10px]">{name}</span>
              <span className="text-slate-400 dark:text-slate-500 text-[9px] font-mono px-1.5 py-0.5">
          {isArr ? `${data.length} items` : `${Object.keys(data).length} props`}
        </span>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-l-2 border-slate-100 dark:border-slate-800 ml-1.5 pl-2 overflow-hidden"
          >
            {Object.entries(data).map(([k, v]) => (
              <JsonVisualizer key={k} name={k} data={v} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Toast Component ---
export function Toast({ message, isVisible, type = 'success' }: { message: string, isVisible: boolean, type?: 'success' | 'error' | 'info' }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-10 right-10 z-[500] pointer-events-none"
        >
          <div className={`px-6 py-4 rounded-3xl shadow-2xl backdrop-blur-xl border flex items-center gap-4 ${
            type === 'success' ? 'bg-green-500/90 border-green-400 text-white' : 
            type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
            'bg-slate-900/90 border-slate-700 text-white'
          }`}>
            <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center">
              {type === 'success' ? '✓' : '!'}
            </div>
            <span className="text-xs font-black uppercase tracking-widest">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
