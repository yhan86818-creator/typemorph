'use client';
import React from 'react';
import Link from 'next/link';
import { trackProClick } from '@/lib/analytics';
import { ShieldCheck, Zap, ArrowRight, Lock, Key, ServerOff, CheckCircle2 } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';

export default function FinanceLandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712] flex flex-col">
      <nav className="h-20 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#030712]/80 backdrop-blur-xl px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-md">
            <ShieldCheck size={20} />
          </div>
          <span className="text-lg font-black tracking-tighter dark:text-white">TypeMorph <span className="text-blue-600 italic">Finance</span></span>
        </Link>
        <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white transition-colors">
          Back to Standard Edition
        </Link>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto px-6 pt-24 pb-40">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/10 text-blue-700 dark:text-blue-400 font-mono text-[9px] uppercase tracking-wider mb-6 border border-blue-600/10">
            <Lock size={11} /> [bank-grade-compliance-ready]
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-tight">
            Secure SWIFT MT/MX Parsing.<br /><span className="text-blue-600">Zero Data Leaks.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
            The 100% local-first engineering workbench for financial institutions. Convert SWIFT MT, ISO 20022, and FIX Protocol directly in your browser. Nothing leaves your machine.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-32 items-center">
          <div className="space-y-8">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white">Built for Strict Compliance</h2>
            <div className="space-y-6">
              {[
                { icon: <ServerOff size={20} />, title: "100% Offline Parsing Engine", desc: "Your financial messages are processed completely in the browser's Web Worker. No external API calls are made for standard parsing." },
                { icon: <Key size={20} />, title: "Bring Your Own Key (BYOK)", desc: "For AI-assisted generation, use your enterprise Google API key. We never proxy requests or store your credentials." },
                { icon: <ShieldCheck size={20} />, title: "GDPR & SOC2 Friendly", desc: "Because we have zero servers receiving your payloads, using TypeMorph inherently meets strict data isolation requirements." }
              ].map((feature, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{feature.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="p-0.5 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-2xl">
            <div className="bg-white dark:bg-slate-950 p-10 rounded-[15px] h-full flex flex-col justify-between">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-black uppercase tracking-wider text-slate-500 mb-6">
                  Enterprise License
                </div>
                <div className="text-4xl font-black text-slate-900 dark:text-white mb-2">
                  $99.00<span className="text-sm text-slate-400 font-normal ml-2">/ lifetime per seat</span>
                </div>
                <p className="text-sm text-slate-500 font-medium mb-8">
                  One-time payment. Unrestricted access to financial converters.
                </p>
                <ul className="space-y-4 mb-10">
                  {[
                    "AI-Powered SWIFT MT to MX Parsing",
                    "AI-Powered FIX Protocol Decoding",
                    "ISO 20022 Schema Generation via LLM",
                    "Full Access to 290+ Standard Converters",
                    "Zero Telemetry or Tracking",
                    "Priority Compliance Support"
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <CheckCircle2 size={18} className="text-blue-600 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <a 
                href="https://yhanster206.gumroad.com/l/typemorph-finance" 
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackProClick('finance_pricing_cta')}
                className="w-full py-4 rounded-xl bg-blue-600 text-white font-black uppercase text-xs tracking-wider text-center shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Purchase Finance License <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>

        <div className="text-center max-w-3xl mx-auto border-t border-slate-200 dark:border-slate-800 pt-20">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Need to test it first?</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">
            You can verify our 100% local architecture directly in your browser. Open the standard workbench, select the SWIFT MT-to-MX tool, and check the network tab.
          </p>
          <Link href="/?tool=swift-mt-to-mx" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
            Try Secure Demo <ArrowRight size={14} />
          </Link>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
