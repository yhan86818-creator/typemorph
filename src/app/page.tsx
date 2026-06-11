'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sun, Moon, ShieldCheck, Download, Crown, 
  Search, ExternalLink, GitBranch, X, MessageSquare,
  LayoutTemplate, Home, Key,
  PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Components
import { LandingView } from '@/components/LandingView';
import { Sidebar } from '@/components/Sidebar';
import dynamic from 'next/dynamic';

// Heavy Components (Lazy Loaded)
const Workbench = dynamic(() => import('@/components/Workbench').then(mod => mod.Workbench), { ssr: false });

import { useUser } from '@/hooks/useUser';
import { AuthModal } from '@/components/AuthModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { supabase } from '@/lib/supabase';
import { User as UserIcon, LogOut } from 'lucide-react';
import { trackWorkbenchOpen, trackProClick } from '@/lib/analytics';

export default function TypeMorphMainApp({ defaultView = 'landing', initialSlug = "" }) {
  const [view, setView] = useState<any>(initialSlug ? 'app' : defaultView);
  const [isPro, setIsPro] = useState(true);
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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 }); // Keeping for prop compatibility if needed, will remove later
  const [isEditorEmpty, setIsEditorEmpty] = useState(true);
  const [editorError, setEditorError] = useState<string | null>(null);

  useEffect(() => {
    // Keyboard Shortcut Cmd/Ctrl + B
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      if (localStorage.getItem('typemorph_pro') === 'true') setIsPro(true);
      const savedKey = localStorage.getItem('typemorph_gemini_key');
      if (savedKey) setGeminiKey(savedKey);
      const savedTheme = localStorage.getItem('typemorph_theme');
      if (savedTheme === 'light') {
        setIsDark(false);
        document.documentElement.classList.remove('dark');
      } else {
        setIsDark(true);
        document.documentElement.classList.add('dark');
      }
    }, 0);

    // PWA Support
    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    };
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    localStorage.setItem('typemorph_theme', newDark ? 'dark' : 'light');
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
    trackWorkbenchOpen(slug);
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
        localStorage.setItem('typemorph_pro', 'true');
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
    <div className={`${initialSlug ? 'w-full overflow-x-hidden' : 'min-h-screen overflow-hidden'} flex flex-col ${isDark ? 'dark' : ''} bg-white dark:bg-[#0A0A0A] transition-colors duration-500`}>
      {/* Top Navigation Cockpit */}
      <nav className={`${initialSlug ? 'sticky' : 'fixed'} top-0 left-0 right-0 h-20 border-b border-slate-200 dark:border-[#1A1A1A] bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl z-[100] px-6`}>
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              {view !== 'landing' && (
                <button 
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                  title="Toggle Sidebar (Cmd+B)"
                >
                  {isSidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                </button>
              )}
              <button onClick={() => setView('landing')} className="flex items-center gap-3 group text-left">
                <span className="text-lg font-black tracking-tighter dark:text-white">TypeMorph <span className="italic">Pro</span></span>
              </button>
            </div>
            
            <div className="hidden md:flex items-center gap-1">
              {['landing', 'app'].map((v) => (
                <button 
                  key={v}
                  onClick={() => setView(v)} 
                  className={`px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${view === v ? 'text-slate-950 dark:text-white font-black' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  {v === 'landing' ? 'Explore' : 'Workbench'}
                </button>
              ))}
<Link prefetch={false} href="/converters/" className="px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all flex items-center gap-1.5"><LayoutTemplate size={11}/> 200+ Tools</Link>
              <Link prefetch={false} href="/blog/" className="px-3.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-blue-600 transition-all">Blog</Link>
            </div>

            {/* Language Switcher */}
            <div className="hidden sm:flex items-center gap-1 ml-4">
              <Link prefetch={false} href={initialSlug ? `/converters/${initialSlug}` : '/'}
                className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${mounted && !window.location.pathname.includes('/jp/') ? 'text-slate-950 dark:text-white font-black' : 'text-slate-400'}`}
              >
                EN
              </Link>
              <Link prefetch={false} href={initialSlug ? `/jp/converters/${initialSlug}` : '/jp'}
                className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all ${mounted && window.location.pathname.includes('/jp/') ? 'text-slate-950 dark:text-white font-black' : 'text-slate-400'}`}
              >
                JP
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {deferredPrompt && (
              <button onClick={handleInstall} className="hidden md:flex items-center gap-2 px-3.5 py-1.5 text-slate-500 dark:text-slate-400 rounded-xl text-[9px] font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
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
                    localStorage.setItem('typemorph_gemini_key', e.target.value);
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

            <button onClick={toggleTheme} className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            

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
            isCollapsed={isSidebarCollapsed}
            cursorPos={cursorPos}
            isEditorEmpty={isEditorEmpty}
          />
        )}

        <main className={`flex-1 min-w-0 ${initialSlug ? '' : 'overflow-y-auto'} relative no-scrollbar flex flex-col`}>
          {/* Beta Mode Promotion Banner */}
          <div className="flex-none bg-amber-50/80 dark:bg-amber-950/20 text-slate-600 dark:text-slate-400 px-6 py-2 flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/30 z-50">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <p className="text-[11px] font-medium tracking-tight">
                Pro features are free during beta
              </p>
            </div>
            <button 
              onClick={() => setShowFeedbackModal(true)}
              className="flex items-center gap-1 text-[9px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <MessageSquare size={10} /> Feedback
            </button>
          </div>

          <div className="flex-1 h-full w-full">
            {view === 'landing' && <LandingView onSelect={handleSelectTool} />}
            {view === 'app' && (
              <Workbench 
                slug={selectedSlug} 
                isDark={isDark} 
                geminiKey={geminiKey} 
                outputTab={outputTab} 
                setOutputTab={setOutputTab} 
                isPro={isPro} 
                setShowLicenseModal={setShowLicenseModal} 
                trialCount={trialCount} 
                setTrialCount={setTrialCount} 
                user={user} 
                onCursorChange={setCursorPos}
                onEmptyChange={setIsEditorEmpty}
                onEditorError={setEditorError}
              />
            )}
          </div>
        </main>
      </div>

      {/* License Modal */}
      <AnimatePresence>
        {showLicenseModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowLicenseModal(false)} className="absolute inset-0 bg-[#0F172A]/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl border border-slate-200 dark:border-[#1A1A1A]">
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
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        isDark={isDark}
      />
      {/* Deployment Verification Tag */}
      <div className="fixed bottom-2 right-2 text-[8px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700 pointer-events-none z-[500]">
        v1.2.5-PRICING-19
      </div>
    </div>
  );
}
