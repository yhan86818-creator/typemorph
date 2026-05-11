'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, ShieldCheck, Download, Crown, 
  Search, ExternalLink, GitBranch, X, MessageSquare,
  Wand2, LayoutTemplate, Settings, Home, Sparkles, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { LandingView } from '@/components/LandingView';
import { Sidebar } from '@/components/Sidebar';
import { Workbench } from '@/components/Workbench';
import { LogicLabView } from '@/components/LogicLabView';
import { SmartDiffView } from '@/components/SmartDiffView';
import { RegexBuilderView } from '@/components/RegexBuilderView';

export default function TypeFlowMainApp({ defaultView = 'landing', initialSlug = "" }) {
  const [view, setView] = useState(initialSlug ? 'app' : defaultView);
  const [isPro, setIsPro] = useState(false);
  const [trialCount, setTrialCount] = useState(3);
  const [isDark, setIsDark] = useState(true);
  const [licenseKey, setLicenseKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(initialSlug || 'json-to-typescript');
  const [outputTab, setOutputTab] = useState('typescript');
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
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
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
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('typeflow_theme', newDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark');
  };

  const handleSelectTool = (slug: string) => {
    setSelectedSlug(slug);
    setView('app');
  };

  const handleVerify = async () => {
    if (!licenseKey) return;
    setIsVerifying(true);
    try {
      const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_permalink: 'zjcuuu', license_key: licenseKey })
      });
      const data = await response.json();
      if (data.success && !data.purchase.refunded) {
        setIsPro(true);
        localStorage.setItem('typeflow_pro', 'true');
        setVMsg({ type: 'success', text: 'Pro License Activated!' });
      } else {
        setVMsg({ type: 'error', text: 'Invalid key.' });
      }
    } catch (err) {
      setVMsg({ type: 'error', text: 'Failed to verify.' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'dark' : ''} bg-white dark:bg-[#020617] transition-colors duration-500`}>
      {/* Top Navigation Cockpit */}
      <nav className="fixed top-0 left-0 right-0 h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl z-[100] px-6">
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <button onClick={() => setView('landing')} className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-all">
                <ShieldCheck size={24} />
              </div>
              <span className="text-xl font-black tracking-tighter dark:text-white">TypeFlow <span className="text-blue-600 italic">Pro</span></span>
            </button>
            
            <div className="hidden md:flex items-center gap-2 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
              <button 
                onClick={() => setView('landing')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'landing' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                Explore
              </button>
              <button 
                onClick={() => setView('app')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${view === 'app' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                Workbench
              </button>
              <button 
                onClick={() => setView('lab')} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === 'lab' ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm' : 'text-slate-400 hover:text-purple-600 dark:hover:text-purple-400'}`}
              >
                <Sparkles size={12} /> Labs
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {!isPro && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900">
                <Crown size={12} className="text-amber-500" />
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase">{trialCount} Trials</span>
              </div>
            )}
            
            <input 
              type="password" 
              placeholder="Gemini API Key" 
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value);
                localStorage.setItem('typeflow_gemini_key', e.target.value);
              }}
              className="hidden lg:block bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500 w-48 dark:text-white"
            />

            <button onClick={toggleTheme} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all border border-slate-200 dark:border-slate-700">
              {isDark ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            
            {!isPro ? (
              <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" className="bg-[#0F172A] dark:bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:scale-105 transition-all shadow-xl">Upgrade</a>
            ) : (
              <div className="flex items-center gap-2 text-green-600 font-black text-xs bg-green-50 dark:bg-green-900/20 px-4 py-2.5 rounded-xl border border-green-100 dark:border-green-900">
                <Crown size={14} /> PRO
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden pt-20">
        {/* Sidebar (Only in Workbench View) */}
        {view === 'app' && (
          <Sidebar selectedSlug={selectedSlug} onSelect={setSelectedSlug} isDark={isDark} />
        )}

        {/* Global Sidebar for Tools */}
        {(view === 'smart-diff' || view === 'regex-builder' || view === 'lab') && (
          <aside className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#020617] hidden lg:flex flex-col p-6">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Advanced Tools</span>
            <div className="space-y-2">
              <button onClick={() => setView('smart-diff')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'smart-diff' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <Wand2 size={18} /> <span className="text-sm font-bold">Smart Diff</span>
              </button>
              <button onClick={() => setView('regex-builder')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'regex-builder' ? 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <Search size={18} /> <span className="text-sm font-bold">AI Regex</span>
              </button>
              <button onClick={() => setView('lab')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${view === 'lab' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                <Zap size={18} /> <span className="text-sm font-bold">Logic Lab</span>
              </button>
            </div>
          </aside>
        )}

        <main className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {view === 'landing' && (
              <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto no-scrollbar">
                <LandingView onSelect={handleSelectTool} />
              </motion.div>
            )}
            {view === 'app' && (
              <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <Workbench slug={selectedSlug} isDark={isDark} geminiKey={geminiKey} outputTab={outputTab} setOutputTab={setOutputTab} />
              </motion.div>
            )}
            {view === 'smart-diff' && (
              <motion.div key="diff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto no-scrollbar">
                <SmartDiffView 
                  isDark={isDark} 
                  geminiKey={geminiKey} 
                  setGeminiKey={(k) => { setGeminiKey(k); localStorage.setItem('typeflow_gemini_key', k); }}
                  isPro={isPro}
                  trialCount={trialCount}
                  setTrialCount={setTrialCount}
                />
              </motion.div>
            )}
            {view === 'regex-builder' && (
              <motion.div key="regex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto no-scrollbar">
                <RegexBuilderView 
                  isDark={isDark} 
                  geminiKey={geminiKey} 
                  setGeminiKey={(k) => { setGeminiKey(k); localStorage.setItem('typeflow_gemini_key', k); }}
                  isPro={isPro}
                  trialCount={trialCount}
                  setTrialCount={setTrialCount}
                />
              </motion.div>
            )}
            {view === 'lab' && (
              <motion.div key="lab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <LogicLabView isDark={isDark} geminiKey={geminiKey} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* License Mini-Modal */}
      {!isPro && (
        <div className="fixed bottom-6 right-6 z-[200]">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-72">
            <p className="text-[10px] font-black text-slate-400 mb-3 uppercase tracking-widest">Pro License</p>
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="License Key" 
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl text-xs outline-none focus:border-blue-600 dark:text-white" 
              />
              <button onClick={handleVerify} disabled={isVerifying} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black">
                {isVerifying ? '...' : 'OK'}
              </button>
            </div>
            {vMsg.text && <p className={`mt-2 text-[9px] font-bold ${vMsg.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{vMsg.text}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
