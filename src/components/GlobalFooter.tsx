import React from 'react';
import { ShieldCheck, MessageSquare, ExternalLink } from 'lucide-react';

export default function GlobalFooter() {
  return (
    <footer className="bg-slate-50 dark:bg-slate-900/50 py-20 border-t border-slate-100 dark:border-slate-800 mt-20">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-20">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                <ShieldCheck size={18} />
              </div>
              <span className="text-xl font-black tracking-tighter dark:text-white">TypeFlow <span className="text-blue-600 italic">Pro</span></span>
            </div>
            <p className="text-slate-500 max-w-sm mb-8 leading-relaxed font-medium">
              The most secure, local-first data transformation engine for professional software engineers. Built with privacy in our DNA.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <a 
                href="https://twitter.com/intent/tweet?text=@vuazggItHF38912%20I%20have%20a%20feature%20request%20for%20TypeFlow%20Pro:%20" 
                target="_blank"
                className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
              >
                <MessageSquare size={14} /> Request Feature
              </a>
              <a 
                href="https://discord.gg/typeflow" 
                target="_blank"
                className="bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900 hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Community Discord
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Product</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <li><a href="/?view=app" className="hover:text-blue-600 transition-colors">Workbench</a></li>
              <li><a href="/pricing" className="hover:text-blue-600 transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">PWA Guide</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Security Audit</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Resources</h4>
            <ul className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
              <li><a href="/blog" className="hover:text-blue-600 transition-colors flex items-center gap-2">Engineering Blog <ExternalLink size={14} /></a></li>
              <li><a href="https://discord.gg/typeflow" target="_blank" className="hover:text-blue-600 transition-colors">Community Discord</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
              <li><a href="/converters" className="hover:text-blue-600 transition-colors">All Converters Directory</a></li>
            </ul>
          </div>
        </div>
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
          <p>© 2026 TypeFlow Pro Engine. ALL RIGHTS RESERVED.</p>
          <div className="flex gap-8">
            <span>GDPR COMPLIANT</span>
            <span>100% LOCAL PROCESSING</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
