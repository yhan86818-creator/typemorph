'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck, Download, Crown,
  Search, ExternalLink, GitBranch, X, MessageSquare,
  LayoutTemplate, Home, Terminal,
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
import { resolveSlugTarget } from '@/lib/targets';

export default function TypeMorphMainApp({ defaultView = 'landing', initialSlug = "" }) {
  const [view, setView] = useState<any>(initialSlug ? 'app' : defaultView);
  const [isPro, setIsPro] = useState(true);
  const [trialCount, setTrialCount] = useState(100);
  const [licenseKey, setLicenseKey] = useState("");
  const [selectedSlug, setSelectedSlug] = useState(initialSlug || 'json-to-typescript');
  // slug が約束する出力形式を初期タブに設定する。
  // zod-lint は専用 Lint タブに直接着地させる（resolveSlugTarget は 'zod' を返すため明示）。
  // 解決できない（runEngine 未対応の）slug は 'typescript' にフォールバック。
  const getInitialTab = (s: string) => s === 'zod-lint' ? 'lint' : (resolveSlugTarget(s)?.key ?? 'typescript');
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
    // Deep-link from landing pages: /?app=<tab> opens the Workbench on that tab
    // (e.g. /?app=validate from the LLM Output Validator landing page).
    try {
      const tab = new URLSearchParams(window.location.search).get('app');
      if (tab) {
        setView('app');
        setOutputTab(tab);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setTimeout(() => {
      setMounted(true);
      if (localStorage.getItem('typemorph_pro') === 'true') setIsPro(true);
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
    <div className={`${initialSlug ? 'w-full overflow-x-hidden' : 'min-h-screen overflow-hidden'} flex flex-col bg-[#0A0A0A]`}>
      {/* Top Navigation Cockpit */}
      <nav className={`${initialSlug ? 'sticky' : 'fixed'} top-0 left-0 right-0 h-20 border-b border-slate-200 dark:border-[#1A1A1A] bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-xl z-[100] px-6`}>
        <div className="max-w-7xl mx-auto h-full flex items-center justify-between">
          <div className="flex items-center gap-10">
            <div className="flex items-center gap-4">
              {view !== 'landing' && (
                <button
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all"
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
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${view === v ? 'bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                >
                  {v === 'landing' ? 'Explore' : 'Workbench'}
                </button>
              ))}
              <Link prefetch={false} href="/converters/" className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-all flex items-center gap-1.5"><LayoutTemplate size={11}/> 160+ Tools</Link>
              <Link prefetch={false} href="/blog/" className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all">Blog</Link>
              <Link prefetch={false} href="/privacy/" className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all">Privacy</Link>
              <a href="https://marketplace.visualstudio.com/items?itemName=TypeMorph.typemorph-vscode" target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 100 100" fill="currentColor"><path d="M74.3 6.9L42.7 36.1 19.2 18.4 6.9 24.8v50.4l12.3 6.4 23.5-17.7 31.6 29.2L93.1 87V13L74.3 6.9zM19.2 63.6V36.4l16.8 13.6-16.8 13.6zm55.1 14.5L48.5 50l25.8-28.1v55.2z"/></svg>
                VS Code
              </a>
              <a href="https://www.npmjs.com/package/typemorph-cli" target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all flex items-center gap-1.5">
                <Terminal size={11} /> CLI
              </a>
              <a href="https://github.com/yhan86818-creator/typemorph" target="_blank" rel="noopener noreferrer" className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-all flex items-center gap-1.5">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
                GitHub
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {deferredPrompt && (
              <button onClick={handleInstall} className="hidden md:flex items-center gap-2 px-3.5 py-1.5 text-slate-500 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                <Download size={12} /> Install App
              </button>
            )}

            {!isPro && (
              <button onClick={() => setShowLicenseModal(true)} className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-white/10 rounded-xl border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/20 transition-all">
                <Crown size={12} className="text-slate-700 dark:text-white" />
                <span className="text-[10px] font-black text-slate-700 dark:text-white uppercase">{trialCount} Trials</span>
              </button>
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
            isDark={true} 
            setView={setView}
            currentView={view} 
            isCollapsed={isSidebarCollapsed}
            cursorPos={cursorPos}
            isEditorEmpty={isEditorEmpty}
          />
        )}

        <main className={`flex-1 min-w-0 ${initialSlug ? '' : 'overflow-y-auto'} relative no-scrollbar flex flex-col`}>
          {/* Beta Mode Promotion Banner */}
          <div className="flex-none bg-slate-50 dark:bg-white/[0.03] text-slate-500 dark:text-slate-400 px-6 py-2 flex items-center justify-between border-b border-slate-100 dark:border-white/[0.06] z-50">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500 shrink-0" />
              <p className="text-[11px] font-medium tracking-tight">
                Free & open source — no account required
              </p>
            </div>
            <button 
              onClick={() => setShowFeedbackModal(true)}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <MessageSquare size={10} /> Feedback
            </button>
          </div>

          <div className="flex-1 h-full w-full">
            {view === 'landing' && <LandingView onSelect={handleSelectTool} />}
            {view === 'app' && (
              <Workbench 
                slug={selectedSlug}
                isDark={true}
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
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 px-4 py-3 rounded-xl text-xs outline-none focus:border-slate-900 dark:focus:border-white dark:text-white transition-colors"
                />
                <button 
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 rounded-xl font-black text-xs hover:opacity-80 transition-opacity"
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
        isDark={true} 
      />
      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        isDark={true}
      />
      {/* Deployment Verification Tag */}
      <div className="fixed bottom-2 right-2 text-[10px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700 pointer-events-none z-[500]">
        v1.2.5-PRICING-19
      </div>
    </div>
  );
}
