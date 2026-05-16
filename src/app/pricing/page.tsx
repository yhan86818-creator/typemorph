'use client';
import React from 'react';
import { ShieldCheck, Zap, Sparkles, Check, ArrowRight } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617]">
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-40">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-[10px] uppercase tracking-widest mb-6">
            <Zap size={12} /> The Anti-SaaS Manifesto
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-tight">
            Buy the Software.<br /><span className="text-blue-600">Bring Your Own Key.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
            We don't markup API costs. You pay a one-time fee for the ultimate engineering UI and 300+ professional data parsers. Bring your own Gemini API key and pay pennies directly to Google, not a $30/mo SaaS subscription to us.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Free Core Engine</h3>
              <p className="text-sm text-slate-500 font-medium italic">Standard tools for everyday coding.</p>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white mb-8">$0<span className="text-sm text-slate-400">/ forever</span></div>
            <ul className="space-y-4 mb-12 flex-1">
              {[
                "100% Local-First Processing",
                "50+ Standard Converters (JSON to TS, etc.)",
                "Basic Monaco Editor UI",
                "PWA Offline Support",
                "AI Features: Limited trial available"
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                  <Check size={16} className="text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" /> 
                  <span className="leading-snug">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/?view=app" className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest text-center hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
              Launch Workbench
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="p-1 p-1 bg-gradient-to-br from-blue-600 to-purple-600 rounded-[3rem] shadow-2xl shadow-blue-500/20 relative group hover:scale-[1.01] transition-transform">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-100 dark:border-blue-800 shadow-lg z-10 whitespace-nowrap">
              Early Bird Lifetime License - 80% OFF
            </div>
            <div className="h-full w-full bg-white dark:bg-slate-950 rounded-[2.9rem] p-10 flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Pro Workbench License</h3>
                <p className="text-sm text-blue-500 font-medium italic">Unlimited access to the entire platform.</p>
              </div>
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-8">
                $19<span className="text-sm text-slate-400 line-through ml-3">$99</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {[
                  "All 300+ Advanced & Enterprise Converters",
                  "Unlock Advanced UIs (Architecture View, Logic Lab, Smart Diff)",
                  "Infinite Batch File Transformation",
                  "Bring Your Own API Key (No hidden markup costs)",
                  "One-time payment. Yours forever."
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-black text-slate-900 dark:text-white">
                    <Sparkles size={16} className="text-blue-500 mt-0.5 shrink-0" /> 
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              <a 
                href="https://yhanster206.gumroad.com/l/zjcuuu"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest text-center shadow-xl shadow-blue-500/40 hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Get Lifetime License <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-40 max-w-3xl mx-auto">
          <h2 className="text-3xl font-black mb-12 text-center text-slate-900 dark:text-white italic">Why This Model?</h2>
          <div className="space-y-8">
            {[
              { 
                q: "Why do I have to pay if I'm using my own API key?", 
                a: "You aren't paying for API calls; you're buying a lifetime license for the TypeFlow Pro software itself. By bringing your own key (BYOK), you avoid the ridiculous markups SaaS companies charge. You pay Google $0.0001 per request, and you pay us exactly $0 for cloud processing." 
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
              <div key={i} className="p-8 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-black text-slate-900 dark:text-white mb-3 text-lg">{item.q}</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
