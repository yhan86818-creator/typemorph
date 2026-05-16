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
            <Zap size={12} /> Early Bird Access
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-tight">
            One Tool. One Price.<br /><span className="text-blue-600">Lifetime Access.</span>
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
            Stop paying monthly for developer tools. Join the early bird list and get every feature we ever build for a single, small payment.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="p-10 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Free Community</h3>
              <p className="text-sm text-slate-500 font-medium italic">Perfect for individual developers.</p>
            </div>
            <div className="text-4xl font-black text-slate-900 dark:text-white mb-8">$0<span className="text-sm text-slate-400">/ forever</span></div>
            <ul className="space-y-4 mb-12 flex-1">
              {[
                "100% Local-First Processing",
                "300+ Standard Converters",
                "Monaco Editor Experience",
                "PWA Offline Support",
                "Community Discord Access"
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600 dark:text-slate-400">
                  <Check size={16} className="text-green-500" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/?view=app" className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-black uppercase text-xs tracking-widest text-center hover:bg-slate-200 transition-colors">
              Launch Workbench
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="p-1 p-1 bg-gradient-to-br from-blue-600 to-purple-600 rounded-[3rem] shadow-2xl shadow-blue-500/20 relative">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-white dark:bg-slate-900 px-6 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-600 border border-blue-100 dark:border-blue-800 shadow-lg z-10 whitespace-nowrap">
              Early Bird Early Access - 80% OFF
            </div>
            <div className="h-full w-full bg-white dark:bg-slate-950 rounded-[2.9rem] p-10 flex flex-col">
              <div className="mb-8">
                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Early Bird Lifetime</h3>
                <p className="text-sm text-blue-500 font-medium italic">Limited to first 500 engineers.</p>
              </div>
              <div className="text-4xl font-black text-slate-900 dark:text-white mb-8">
                $9<span className="text-sm text-slate-400 line-through ml-3">$49</span>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {[
                  "Everything in Free",
                  "AI Smart Parse (Gemini 1.5)",
                  "Custom Template Engine",
                  "Batch File Transformation",
                  "Priority Export to Prisma/Zod",
                  "Future Beta Access"
                ].map((f, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-black text-slate-900 dark:text-white">
                    <Sparkles size={16} className="text-blue-500" /> {f}
                  </li>
                ))}
              </ul>
              <a 
                href="https://yhanster206.gumroad.com/l/zjcuuu"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black uppercase text-xs tracking-widest text-center shadow-xl shadow-blue-500/40 hover:scale-[1.02] transition-transform flex items-center justify-center gap-2"
              >
                Get Lifetime Access <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-40 max-w-2xl mx-auto">
          <h2 className="text-3xl font-black mb-12 text-center text-slate-900 dark:text-white italic">Questions?</h2>
          <div className="space-y-8">
            {[
              { q: "Is it really a one-time payment?", a: "Yes. During our early bird phase, we are offering a single payment for lifetime updates. No recurring subscriptions." },
              { q: "How does the AI feature work if it's local?", a: "The UI and standard logic are local. AI features use a secure bridge to Google Gemini 1.5 Pro. We ensure zero data retention on our servers." },
              { q: "Can I use it on multiple devices?", a: "Your license is tied to your email. You can use it across all your workstations (home, office, laptop)." }
            ].map((item, i) => (
              <div key={i} className="p-8 bg-white dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h4 className="font-black text-slate-900 dark:text-white mb-3">{item.q}</h4>
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
