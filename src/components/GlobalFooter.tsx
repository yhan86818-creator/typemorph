import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export default function GlobalFooter() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-900/50 py-20 mt-20 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-slate-200 dark:bg-white/10" />
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900">
                <ShieldCheck size={18} />
              </div>
              <span className="text-xl font-black tracking-tighter dark:text-white">TypeMorph <span className="italic">Pro</span></span>
            </div>
            <p className="text-slate-500 max-w-sm mb-8 leading-relaxed font-medium">
              The most secure, local-first schema and data engineering workbench for professional software developers. Built with privacy in our DNA.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a 
                href="https://x.com/jopnuk9" 
                target="_blank"
                className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-2"
              >
                X @jopnuk9
              </a>
              <a
                href="https://discord.gg/dQHqsa8g8J"
                target="_blank"
                className="bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-all flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-white rounded-full" /> Community Discord
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Product</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <li><Link prefetch={false} href="/?view=app" className="hover:text-slate-900 dark:hover:text-white transition-colors">Workbench</Link></li>
              <li>
                <Link prefetch={false} href={typeof window !== 'undefined' && window.location.pathname.includes('/jp') ? "/jp/help/" : "/help/"} className="hover:text-slate-900 dark:hover:text-white transition-colors">
                  {typeof window !== 'undefined' && window.location.pathname.includes('/jp') ? '使い方ガイド' : 'How to Use'}
                </Link>
              </li>
              <li><a href="#" className="hover:text-slate-900 dark:hover:text-white transition-colors">Security Audit</a></li>
            </ul>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mt-8 mb-4">Tools</h4>
            <ul className="space-y-3 text-sm font-bold text-slate-600 dark:text-slate-400">
              <li><Link prefetch={false} href="/tools/env-diff" className="hover:text-slate-900 dark:hover:text-white transition-colors">Environment Diff</Link></li>
              <li><Link prefetch={false} href="/tools/api-drift-check" className="hover:text-slate-900 dark:hover:text-white transition-colors">API Drift Check</Link></li>
              <li><Link prefetch={false} href="/tools/llm-output-validator" className="hover:text-slate-900 dark:hover:text-white transition-colors">LLM Output Validator</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Resources</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <li><Link prefetch={false} href="/blog" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2">Engineering Blog <ExternalLink size={14} /></Link></li>
              <li><a href="https://discord.gg/dQHqsa8g8J" target="_blank" rel="noopener noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">Community Discord</a></li>
              <li><Link prefetch={false} href="/privacy/" className="hover:text-slate-900 dark:hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link prefetch={false} href="/terms/" className="hover:text-slate-900 dark:hover:text-white transition-colors">Terms of Service</Link></li>
              <li><Link prefetch={false} href="/converters" className="hover:text-slate-900 dark:hover:text-white transition-colors">All Converters Directory</Link></li>
            </ul>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mt-8 mb-4">Compare</h4>
            <ul className="space-y-3 text-sm font-bold text-slate-600 dark:text-slate-400">
              <li><Link prefetch={false} href="/alternatives/transform-tools" className="hover:text-slate-900 dark:hover:text-white transition-colors">vs transform.tools</Link></li>
              <li><Link prefetch={false} href="/alternatives/quicktype" className="hover:text-slate-900 dark:hover:text-white transition-colors">vs quicktype</Link></li>
              <li><Link prefetch={false} href="/alternatives/oasdiff" className="hover:text-slate-900 dark:hover:text-white transition-colors">vs oasdiff</Link></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <p>© 2026 TypeMorph Engine. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <span>GDPR COMPLIANT</span>
            <span>100% LOCAL PROCESSING</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
