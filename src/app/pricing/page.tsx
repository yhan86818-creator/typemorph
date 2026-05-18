'use client';
import React from 'react';
import { ShieldCheck, Zap, Sparkles, Check, ArrowRight } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#030712]">
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-40">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600/10 dark:bg-blue-600/10 text-blue-700 dark:text-blue-400 font-mono text-[9px] uppercase tracking-wider mb-6 border border-blue-600/10">
            <Zap size={11} /> [the-anti-saas-manifesto]
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-tight">
            Buy the Software.<br /><span className="text-blue-600">Bring Your Own Key.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
            We don't markup API costs. You pay a one-time fee for the ultimate engineering UI and 300+ professional validation and database parsers. Bring your own Gemini API key and pay pennies directly to Google, not a $30/mo SaaS subscription to us.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="p-8 bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800/80 shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-slate-700/80 transition-colors">
            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">Free Core Engine</h3>
              <p className="text-xs text-slate-500 font-medium italic">Standard tools for everyday coding.</p>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white mb-6">$0<span className="text-xs text-slate-400 font-normal">/ forever</span></div>
            <ul className="space-y-3.5 mb-10 flex-1">
              {[
                "100% Local-First Processing",
                "All 300+ Standard Converters (JSON to TS, etc.)",
                "Basic Monaco Editor UI",
                "PWA Offline Support",
                "AI Features: Limited trial available"
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <Check size={14} className="text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" /> 
                  <span className="leading-snug">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/?view=app" className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-wider text-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Launch Workbench
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="p-0.5 bg-gradient-to-br from-blue-600 via-blue-400 to-blue-700 rounded-xl shadow-lg shadow-blue-600/[0.02] relative group hover:scale-[1.005] transition-transform">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-950 px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-blue-600 border border-blue-600/20 shadow-md z-10 whitespace-nowrap">
              Early Bird Lifetime License - 80% OFF
            </div>
            <div className="h-full w-full bg-white dark:bg-slate-950 rounded-[0.7rem] p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">Pro Workbench License</h3>
                <p className="text-xs text-blue-600 font-medium italic">Unlimited access to the entire platform.</p>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mb-6">
                $19<span className="text-xs text-slate-400 line-through ml-2.5 font-normal">$99</span>
              </div>
              <ul className="space-y-3.5 mb-10 flex-1">
                {[
                  "All 300+ Advanced & Enterprise Converters",
                  "Unlock Advanced UIs (Architecture View, Logic Lab, Smart Diff)",
                  "Infinite Batch File Transformation",
                  "Bring Your Own API Key (No hidden markup costs)",
                  "One-time payment. Yours forever."
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs font-black text-slate-900 dark:text-white">
                    <Sparkles size={14} className="text-blue-600 mt-0.5 shrink-0" /> 
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              <a 
                href="https://yhanster206.gumroad.com/l/zjcuuu"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-black uppercase text-[10px] tracking-wider text-center shadow-md shadow-blue-600/10 hover:bg-blue-700 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                Get Lifetime License <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-40 max-w-3xl mx-auto">
          <h2 className="text-3xl font-black mb-12 text-center text-slate-900 dark:text-white italic">Why This Model?</h2>
          <div className="space-y-6">
            {[
              { 
                q: "Why do I have to pay if I'm using my own API key?", 
                a: "You aren't paying for API calls; you're buying a lifetime license for the SchemaForge Pro software itself. By bringing your own key (BYOK), you avoid the ridiculous markups SaaS companies charge. You pay Google $0.0001 per request, and you pay us exactly $0 for cloud processing." 
              },
              { 
                q: "Is it really a one-time payment? No subscriptions?", 
                a: "Yes. We hate subscription fatigue just as much as you do. You pay once for the license key, activate it locally in your browser, and the 300+ advanced tools and UIs are unlocked forever." 
              },
              { 
                q: "How do I activate Pro after buying?", 
                a: "Gumroad will give you a License Key immediately after purchase. Simply paste it into the 'Activate Pro' dialog in the top right corner of the app. It's verified locally and stored securely in your browser." 
              }
            ].map((item, i) => (
              <div key={i} className="p-6 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
                <h4 className="font-black text-slate-900 dark:text-white mb-2 text-base">{item.q}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
