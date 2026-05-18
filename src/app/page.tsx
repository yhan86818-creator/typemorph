'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sun, Moon, ShieldCheck, Download, Crown, 
  Search, ExternalLink, GitBranch, X, MessageSquare,
  Wand2, LayoutTemplate, Settings, Home, Sparkles, Zap, Layers, Key
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
import { useUser } from '@/hooks/useUser';
import { AuthModal } from '@/components/AuthModal';
import { supabase } from '@/lib/supabase';
import { User as UserIcon, LogOut } from 'lucide-react';

export default function TypeFlowMainApp({ defaultView = 'landing', initialSlug = "" }) {
  const [view, setView] = useState<any>(initialSlug ? 'app' : defaultView);
  const [isPro, setIsPro] = useState(false);
  const [trialCount, setTrialCount] = useState(100);
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
  const [mounted, setMounted] = useState(false);
  const { user } = useUser();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    setMounted(true);
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
    // const savedCount = localStorage.getItem('typeflow_trial_count');
    // if (lastDate !== today) {
    //   localStorage.setItem('typeflow_last_date', today);
    //   localStorage.setItem('typeflow_trial_count', '100');
    //   setTrialCount(100);
    // } else {
    //   // setTrialCount(parseInt(savedCount));
    // }

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
    <div className={`${initialSlug ? 'w-full overflow-x-hidden' : 'min-h-screen overflow-hidden'} flex flex-col ${isDark ? 'dark' : ''} bg-white dark:bg-[#030712] transition-colors duration-500`}>
      {/* Top Navigation Cockpit */}
      <nav className={`${initialSlug ? 'sticky' : 'fixed'} top-0 left-0 right-0 h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-xl z-[100] px-6`}>
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <button onClick={() => setView('landing')} className="flex items-center gap-3 group text-left">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-slate-950 shadow-md shadow-blue-600/10 group-hover:scale-105 transition-all">
                <ShieldCheck size={20} />
              </div>
              <span className="text-lg font-black tracking-tighter dark:text-white">SchemaForge <span className="text-blue-600 italic">Pro</span></span>
            </button>
            
            <div className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80">
              {['landing', 'app', 'lab', 'visual', 'smart-diff', 'regex-builder'].map((v) => (
                <button 
                  key={v}
                  onClick={() => setView(v)} 
                  className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${view === v ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  {v === 'lab' && <Sparkles size={11} />}
                  {v === 'visual' && <Layers size={11} />}
                  {v === 'smart-diff' && <Wand2 size={11} />}
                  {v === 'regex-builder' && <Search size={11} />}
                  {v === 'landing' ? 'Explore' : v === 'app' ? 'Workbench' : v === 'lab' ? 'Labs' : v === 'visual' ? 'Visuals' : v === 'smart-diff' ? 'Diff' : 'Regex'}
                </button>
              ))}
              <a href="/converters/" className="px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 hover:text-blue-600 bg-blue-600/10 dark:bg-blue-600/10 transition-all flex items-center gap-1.5"><Layers size={11}/> 300+ Tools</a>
              <a href="/blog/" className="px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-blue-600 transition-all">Blog</a>
            </div>

            {/* Language Switcher */}
            <div className="hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/80 ml-4">
              <a 
                href={initialSlug ? `/converters/${initialSlug}` : '/'}
                className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${mounted && !window.location.pathname.includes('/jp/') ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                EN
              </a>
              <a 
                href={initialSlug ? `/jp/converters/${initialSlug}` : '/jp'}
                className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${mounted && window.location.pathname.includes('/jp/') ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400'}`}
              >
                JP
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {deferredPrompt && (
              <button onClick={handleInstall} className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-[9px] font-black uppercase tracking-wider border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 transition-all">
                <Download size={12} /> Install App
              </button>
            )}

            {!isPro && (
              <button onClick={() => setShowLicenseModal(true)} className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/10 rounded-xl border border-blue-600/20 hover:scale-102 transition-all">
                <Crown size={12} className="text-blue-600" />
                <span className="text-[9px] font-black text-blue-700 dark:text-blue-400 uppercase">{trialCount} Trials</span>
              </button>
            )}
            
            {/* API Key Input */}
            <div className="relative group flex flex-col items-end">
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Key size={12} className={geminiKey ? 'text-blue-600' : 'text-slate-400'} />
                </div>
                <input 
                  type="password" 
                  placeholder="Gemini API Key" 
                  value={geminiKey}
                  onChange={(e) => {
                    setGeminiKey(e.target.value);
                    localStorage.setItem('typeflow_gemini_key', e.target.value);
                  }}
                  className="w-40 bg-slate-100 dark:bg-slate-900 border-none outline-none pl-8 pr-3 py-1.5 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-600 transition-all placeholder:text-slate-400"
                />
              </div>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[8px] font-black uppercase tracking-wider text-blue-600 hover:text-blue-700 transition-colors mt-1 pr-1"
              >
                Get Free API Key
              </a>
            </div>

            <button onClick={toggleTheme} className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 hover:text-blue-600 transition-all border border-slate-200 dark:border-slate-700">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            {!isPro ? (
              <a href="https://yhanster206.gumroad.com/l/zjcuuu" target="_blank" className="bg-[#0F172A] dark:bg-blue-600 text-white dark:text-white px-5 py-2 rounded-xl text-xs font-black hover:scale-102 transition-all shadow-md shadow-blue-600/10">Upgrade</a>
            ) : (
              <div className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] bg-blue-600/10 px-3.5 py-2 rounded-xl border border-blue-600/20">
                <Crown size={12} /> PRO
              </div>
            )}

          </div>
        </div>
      </nav>

      {/* Main Layout Body */}
      <div className={`flex-1 flex min-w-0 w-full overflow-x-hidden ${initialSlug ? 'min-h-[600px]' : 'overflow-hidden pt-20'}`}>
        {view !== 'landing' && (
          <Sidebar 
            selectedSlug={selectedSlug} 
            onSelect={handleSelectTool} 
            isDark={isDark} 
            setView={setView} 
            currentView={view} 
          />
        )}

        <main className={`flex-1 min-w-0 ${initialSlug ? '' : 'overflow-y-auto'} relative no-scrollbar`}>
          <AnimatePresence mode="wait">
            {view === 'landing' && (
              <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <LandingView onSelect={handleSelectTool} />
              </motion.div>
            )}
            {view === 'app' && (
              <motion.div key="app" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full">
                <Workbench slug={selectedSlug} isDark={isDark} geminiKey={geminiKey} outputTab={outputTab} setOutputTab={setOutputTab} isPro={isPro} setShowLicenseModal={setShowLicenseModal} trialCount={trialCount} setTrialCount={setTrialCount} user={user} />
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

      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        isDark={isDark} 
      />
      {/* Deployment Verification Tag */}
      <div className="fixed bottom-2 right-2 text-[8px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700 pointer-events-none z-[500]">
        v1.2.5-PRICING-19
      </div>
    </div>
  );
}
