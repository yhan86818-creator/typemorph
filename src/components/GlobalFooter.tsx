import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ExternalLink } from 'lucide-react';

export default function GlobalFooter() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-900/50 py-20 border-t border-slate-100 dark:border-slate-800 mt-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-slate-950 shadow-md">
                <ShieldCheck size={18} />
              </div>
              <span className="text-xl font-black tracking-tighter dark:text-white">TypeMorph <span className="text-blue-600 italic">Pro</span></span>
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
                className="bg-blue-600/5 dark:bg-blue-600/5 text-blue-700 dark:text-blue-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-600/10 hover:bg-blue-600 hover:text-slate-950 transition-all flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" /> Community Discord
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Product</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <li><Link prefetch={false} href="/?view=app" className="hover:text-blue-600 transition-colors">Workbench</Link></li>
              <li><Link prefetch={false} href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</Link></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">PWA Guide</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Security Audit</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Resources</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <li><Link prefetch={false} href="/blog" className="hover:text-blue-600 transition-colors flex items-center gap-2">Engineering Blog <ExternalLink size={14} /></Link></li>
              <li><a href="https://discord.gg/dQHqsa8g8J" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">Community Discord</a></li>
              <li><Link prefetch={false} href="/privacy/" className="hover:text-blue-600 transition-colors">Privacy Policy</Link></li>
              <li><Link prefetch={false} href="/terms/" className="hover:text-blue-600 transition-colors">Terms of Service</Link></li>
              <li><Link prefetch={false} href="/converters" className="hover:text-blue-600 transition-colors">All Converters Directory</Link></li>
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
