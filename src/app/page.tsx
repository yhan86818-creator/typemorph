'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, ShieldCheck, Download, Crown, 
  Search, ExternalLink, GitBranch, X, MessageSquare,
  Wand2, LayoutTemplate, Settings, Home, Sparkles, Zap, Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { LandingView } from '@/components/LandingView';
import { Sidebar } from '@/components/Sidebar';
import { Workbench } from '@/components/Workbench';
import { LogicLabView } from '@/components/LogicLabView';
import { SmartDiffView } from '@/components/SmartDiffView';
import { RegexBuilderView } from '@/components/RegexBuilderView';
import { ArchitectureView } from '@/components/ArchitectureView';

export default function TypeFlowMainApp({ defaultView = 'landing', initialSlug = "" }) {
  const [view, setView] = useState<any>(initialSlug ? 'app' : defaultView);
  const [isPro, setIsPro] = useState(false);
  const [trialCount, setTrialCount] = useState(3);
  const [isDark, setIsDark] = useState(true);
  const [licenseKey, setLicenseKey] = useState("");
  const [geminiKey, setGeminiKey] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(initialSlug || 'json-to-typescript');
  const getInitialTab = (s: string) => {
    if (s.includes('zod')) return 'zod';
    if (s.includes('go')) return 'go';
    if (s.includes('rust')) return 'rust';
    if (s.includes('python')) return 'python';
    if (s.includes('dart')) return 'dart';
    return 'typescript';
  };
  const [outputTab, setOutputTab] = useState(getInitialTab(initialSlug || 'json-to-typescript'));
  const [isVerifying, setIsVerifying] = useState(false);
  const [vMsg, setVMsg] = useState({ type: '', text: '' });
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (localStorage.getItem('typeflow_pro') === 'true') setIsPro(true);
    const savedKey = localStorage.getItem('typeflow_gemini_key');
    if (savedKey) setGeminiKey(savedKey);
    const savedTheme = localStorage.getItem('typeflow_theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.documentElement.classList.remove('dark');
    } else {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
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

    // PWA Support
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('typeflow_theme', newDark ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark');
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const handleSelectTool = (slug: string) => {
    setSelectedSlug(slug);
    setOutputTab(getInitialTab(slug));
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
        setVMsg({ type: 'success', text: 'Pro Activated!' });
        setTimeout(() => setShowLicenseModal(false), 2000);
      } else {
        setVMsg({ type: 'error', text: 'Invalid key.' });
      }
    } catch (err) {
      setVMsg({ type: 'error', text: 'Error.' });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className={`${initialSlug ? '' : 'min-h-screen'} flex flex-col ${isDark ? 'dark' : ''} bg-white dark:bg-[#020617] transition-colors duration-500`}>
      {/* Top Navigation Cockpit */}
      <nav className={`${initialSlug ? 'sticky' : 'fixed'} top-0 left-0 right-0 h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#020617]/80 backdrop-blur-xl z-[100] px-6`}>
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <button onClick={() => setView('landing')} className="flex items-center gap-3 group text-left">
              <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-all">
                <ShieldCheck size={24} />
              </div>
              <span className="text-xl font-black tracking-tighter dark:text-white">TypeFlow <span className="text-blue-600 italic">Pro</span></span>
            </button>
            
            <div className="hidden xl:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800">
              {['landing', 'app', 'lab', 'visual'].map((v) => (
                <button 
                  key={v}
                  onClick={() => setView(v)} 
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${view === v ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  {v === 'lab' && <Sparkles size={12} />}
                  {v === 'visual' && <Layers size={12} />}
                  {v === 'landing' ? 'Explore' : v === 'app' ? 'Workbench' : v === 'lab' ? 'Labs' : 'Visuals'}
                </button>
              ))}
              <a href="/blog" className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-blue-600 transition-all">Blog</a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {deferredPrompt && (
              <button onClick={handleInstall} className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-all">
                <Download size={14} /> Install App
              </button>
            )}

            {!isPro && (
              <button onClick={() => setShowLicenseModal(true)} className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900 hover:scale-105 transition-all">
                <Crown size={12} className="text-amber-500" />
                <span className="text-[10px] font-black text-amber-700 dark:text-amber-400 uppercase">{trialCount} Trials</span>
              </button>
            )}
            
            <input 
              type="password" 
              placeholder="Gemini API Key" 
              value={geminiKey}
              onChange={(e) => {
                setGeminiKey(e.target.value);
                localStorage.setItem('typeflow_gemini_key', e.target.value);
              }}
              className="hidden lg:block bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-500 w-44 dark:text-white"
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
      <div className={`flex-1 flex ${initialSlug ? '' : 'overflow-hidden'} pt-20`}>
        {view !== 'landing' && (
          <Sidebar 
            selectedSlug={selectedSlug} 
            onSelect={handleSelectTool} 
            isDark={isDark} 
            setView={setView} 
            currentView={view} 
          />
        )}

        <main className={`flex-1 ${initialSlug ? '' : 'overflow-y-auto'} relative no-scrollbar`}>
          <AnimatePresence mode="wait">
            {view === 'landing' && (
              <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <LandingView onSelect={handleSelectTool} />
              </motion.div>
            )}
            {view === 'app' && (
              <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <Workbench slug={selectedSlug} isDark={isDark} geminiKey={geminiKey} outputTab={outputTab} setOutputTab={setOutputTab} />
              </motion.div>
            )}
            {view === 'smart-diff' && (
              <motion.div key="diff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <SmartDiffView isDark={isDark} geminiKey={geminiKey} setGeminiKey={(k) => setGeminiKey(k)} isPro={isPro} trialCount={trialCount} setTrialCount={setTrialCount} />
              </motion.div>
            )}
            {view === 'regex-builder' && (
              <motion.div key="regex" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <RegexBuilderView isDark={isDark} geminiKey={geminiKey} setGeminiKey={(k) => setGeminiKey(k)} isPro={isPro} trialCount={trialCount} setTrialCount={setTrialCount} />
              </motion.div>
            )}
            {view === 'lab' && (
              <motion.div key="lab" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <LogicLabView isDark={isDark} geminiKey={geminiKey} isPro={isPro} trialCount={trialCount} setTrialCount={setTrialCount} />
              </motion.div>
            )}
            {view === 'visual' && (
              <motion.div key="visual" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <ArchitectureView isDark={isDark} geminiKey={geminiKey} isPro={isPro} trialCount={trialCount} setTrialCount={setTrialCount} />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* License Modal */}
      <AnimatePresence>
        {showLicenseModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLicenseModal(false)} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-slate-800">
              <h2 className="text-xl font-black mb-2 dark:text-white text-slate-900">Activate Pro</h2>
              <p className="text-slate-500 text-xs mb-6 font-medium">Unlock unlimited AI conversions and visual architecture.</p>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Paste License Key..." 
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-xl text-xs outline-none focus:border-blue-600 dark:text-white"
                />
                <button 
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-xs shadow-xl hover:scale-[1.02] transition-all"
                >
                  {isVerifying ? 'Verifying...' : 'Activate License'}
                </button>
                {vMsg.text && <p className={`text-center text-[10px] font-bold ${vMsg.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>{vMsg.text}</p>}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
