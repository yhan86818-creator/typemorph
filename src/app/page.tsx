'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, ShieldCheck, Download, Crown, 
  Search, ExternalLink, GitBranch, X, MessageSquare 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LandingView } from '@/components/LandingView';
import { EditorView } from '@/components/EditorView';

// --- Main Application Shell ---
export default function TypeFlowApp({ defaultView = 'landing', initialSlug = "" }) {
  const [view, setView] = useState(defaultView);
  const [isPro, setIsPro] = useState(false);
  const [trialCount, setTrialCount] = useState(3);
  const [isDark, setIsDark] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [vMsg, setVMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    // Pro check
    if (localStorage.getItem('typeflow_pro') === 'true') setIsPro(true);
    
    // AI Key check
    const savedKey = localStorage.getItem('typeflow_gemini_key');
    if (savedKey) setGeminiKey(savedKey);
    
    // Theme sync
    const savedTheme = localStorage.getItem('typeflow_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }

    // Trial sync
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('typeflow_last_date');
    const savedCount = localStorage.getItem('typeflow_trial_count');
    
    if (lastDate !== today) {
      localStorage.setItem('typeflow_last_date', today);
      localStorage.setItem('typeflow_trial_count', '3');
      setTrialCount(3);
    } else if (savedCount) {
      setTrialCount(parseInt(savedCount));
    }
    
    // PWA Logic
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    window.addEventListener('appinstalled', () => setDeferredPrompt(null));
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('typeflow_theme', newDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark');
  };

  const installPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const handleVerify = () => {
    if (!licenseKey) return;
    setIsVerifying(true);
    // Mock verification
    setTimeout(() => {
      if (licenseKey === "ZEN-PRO-2026") {
        setIsPro(true);
        localStorage.setItem('typeflow_pro', 'true');
        setVMsg({ type: 'success', text: 'License Activated!' });
      } else {
        setVMsg({ type: 'error', text: 'Invalid key.' });
      }
      setIsVerifying(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020617] transition-colors duration-300">
      {/* Dynamic Header */}
      <nav className="fixed top-0 w-full z-[100] bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button onClick={() => setView('landing')} className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-110 transition-all">
                <ShieldCheck size={24} />
              </div>
              <span className="text-xl font-black tracking-tighter dark:text-white">TypeFlow <span className="text-blue-600 italic">Pro</span></span>
            </button>
            
            <div className="hidden md:flex items-center gap-6">
              <button onClick={() => setView('landing')} className={`text-xs font-black uppercase tracking-widest ${view === 'landing' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Explore</button>
              <button onClick={() => setView('app')} className={`text-xs font-black uppercase tracking-widest ${view === 'app' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>Workbench</button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {deferredPrompt && (
              <button onClick={installPWA} className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900 transition-colors">
                <Download size={14} /> Install
              </button>
            )}
            
            {!isPro && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900">
                <Crown size={12} className="text-amber-500" />
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase">{trialCount} Trials Left</span>
              </div>
            )}

            <button onClick={toggleTheme} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {!isPro ? (
              <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" className="bg-[#0F172A] dark:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:scale-105 transition-all shadow-xl shadow-blue-100">Upgrade</a>
            ) : (
              <div className="flex items-center gap-2 text-green-600 font-black text-xs bg-green-50 dark:bg-green-900/20 px-4 py-2.5 rounded-xl border border-green-100 dark:border-green-900">
                <Crown size={14} /> PRO ACTIVE
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="pt-20">
        <AnimatePresence mode="wait">
          {view === 'landing' ? (
            <LandingView key="landing" onStart={() => setView('app')} />
          ) : (
            <EditorView 
              key="app"
              isPro={isPro} 
              trialCount={trialCount} 
              setTrialCount={setTrialCount} 
              isDark={isDark} 
              initialSlug={initialSlug} 
              geminiKey={geminiKey}
              setGeminiKey={(k) => {
                setGeminiKey(k);
                localStorage.setItem('typeflow_gemini_key', k);
              }}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Modern Footer */}
      <footer className="bg-slate-50 dark:bg-slate-900/50 py-20 border-t border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
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
                <a href="https://x.com/vuazggItHF38912" target="_blank" className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 border border-slate-200 dark:border-slate-700 transition-all">
                  <X size={18} />
                </a>
                <a 
                  href="https://twitter.com/intent/tweet?text=@vuazggItHF38912%20I%20have%20a%20feature%20request%20for%20TypeFlow%20Pro:%20" 
                  target="_blank"
                  className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-900 hover:bg-blue-600 hover:text-white transition-all flex items-center gap-2"
                >
                  <MessageSquare size={14} /> Request Feature
                </a>
              </div>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Product</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                <li><button onClick={() => setView('app')} className="hover:text-blue-600 transition-colors">Workbench</button></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">PWA Guide</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Security Audit</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400 mb-6">Resources</h4>
              <ul className="space-y-4 text-sm font-bold text-slate-600 dark:text-slate-400">
                <li><a href="/blog" className="hover:text-blue-600 transition-colors flex items-center gap-2">Engineering Blog <ExternalLink size={14} /></a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-blue-600 transition-colors">API Directory</a></li>
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

      {/* License Modal - Mini */}
      {!isPro && (
        <div className="fixed bottom-6 left-6 z-[200]">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-64 group hover:w-80 transition-all duration-500 overflow-hidden">
            <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Activate Pro License</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="License Key" 
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-xs outline-none focus:border-blue-600 dark:text-white transition-all" 
              />
              <button 
                onClick={handleVerify}
                disabled={isVerifying}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-[10px] font-black hover:bg-blue-700 transition-all"
              >
                {isVerifying ? '...' : 'ACTIVATE'}
              </button>
            </div>
            {vMsg.text && <p className={`mt-2 text-[9px] font-bold ${vMsg.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{vMsg.text}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
