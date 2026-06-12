'use client';
import React from 'react';
import { trackProClick } from '@/lib/analytics';
import { ShieldCheck, Zap, Sparkles, Check, ArrowRight } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-40">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-mono text-[9px] uppercase tracking-wider mb-6 border border-slate-200 dark:border-white/10">
            <Zap size={11} /> [the-anti-saas-manifesto-v2]
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-tight">
            The Professional Tool.<br />Bring Your Own Key.
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
            Stop overpaying for AI-wrapped SaaS. Use your own Gemini API key and pay pennies to Google for compute, while paying us for a superior engineering workbench.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="p-8 bg-white dark:bg-white/[0.03] rounded-xl border border-slate-200 dark:border-white/10 shadow-sm flex flex-col">
            <div className="mb-6">
              <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">Free Community</h3>
              <p className="text-xs text-slate-500 font-medium italic">Standard tools for independent developers.</p>
            </div>
            <div className="text-3xl font-black text-slate-900 dark:text-white mb-6">$0<span className="text-xs text-slate-400 font-normal ml-2">/ forever</span></div>
            <ul className="space-y-4 mb-10 flex-1">
              {[
                "100% Local-First Processing",
                "All Standard Converters (JSON, YAML, etc.)",
                "Unlimited Local Processing",
                "AI Trial: 3 Uses / Day (No Privacy Masking)",
                "Standard Copy-Paste Workflow"
              ].map((f, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs font-bold text-slate-600 dark:text-slate-400">
                  <Check size={14} className="text-slate-300 dark:text-slate-600 mt-0.5 shrink-0" />
                  <span className="leading-snug">{f}</span>
                </li>
              ))}
            </ul>
            <Link prefetch={false} href="/?view=app" className="w-full py-3.5 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white font-black uppercase text-[10px] tracking-wider text-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
              Launch Workbench
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="p-[1px] bg-slate-900 dark:bg-white rounded-xl shadow-lg relative group">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-wider text-white dark:text-slate-900 shadow-md z-10 whitespace-nowrap">
              Most Popular
            </div>
            <div className="h-full w-full bg-white dark:bg-[#0A0A0A] rounded-[0.7rem] p-8 flex flex-col">
              <div className="mb-6">
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-1.5">Lifetime License</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium italic">Elite automation for modern teams.</p>
              </div>
              <div className="text-3xl font-black text-slate-900 dark:text-white mb-6">
                $25.00<span className="text-xs text-slate-400 font-normal ml-2.5">/ lifetime</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {[
                  "Unlimited Local & AI Conversions",
                  "Local Privacy Shield (Auto PII Masking)",
                  "Local File Sync (Auto-Save to Filesystem)",
                  "Bulk Folder & Multi-File Processing",
                  "Explainable Logic & Schema Diff Impact",
                  "Priority Feature Requests"
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs font-black text-slate-900 dark:text-white">
                    <Sparkles size={14} className="text-slate-700 dark:text-white mt-0.5 shrink-0" />
                    <span className="leading-snug">{f}</span>
                  </li>
                ))}
              </ul>
              <a
                href="https://yhanster206.gumroad.com/l/zjcuuu"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackProClick('pricing_cta')}
                className="w-full py-3.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black uppercase text-[10px] tracking-wider text-center hover:opacity-80 transition-opacity flex items-center justify-center gap-1.5"
              >
                Get Lifetime Access <ArrowRight size={14} />
              </a>
              <p className="text-[9px] text-slate-400 mt-4 text-center font-bold">
                Instant License Activation via Email. No Account Required.
              </p>
            </div>
          </div>
        </div>

        {/* Manifesto */}
        <div className="mt-40 grid md:grid-cols-3 gap-12">
          <div className="md:col-span-1">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white italic leading-tight mb-4">
              The Pure<br />Professional<br />Philosophy.
            </h2>
            <div className="w-12 h-1 bg-slate-900 dark:bg-white mb-6" />
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
              We aren&apos;t a SaaS. We are a tool company. We don&apos;t want your data, we want to help you build faster.
            </p>
          </div>

          <div className="md:col-span-2 space-y-12">
            <div className="grid sm:grid-cols-2 gap-10">
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Why a One-Time Payment?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  We believe developers are tired of subscription fatigue. Since you bring your own AI API key and all execution happens locally, we have virtually zero server costs. A flat $25 lifetime payment gives you unrestricted access to our best-in-class local workbench forever.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Why Bring Your Own Key?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Most AI tools charge $20+/mo for &quot;cloud processing&quot; while paying pennies to Google/OpenAI. We think that&apos;s unfair. By using your own API key, you pay exactly what it costs (often $0 with Google&apos;s free tier), and we are physically unable to see or store your data.
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-white/[0.03] rounded-2xl border border-slate-200 dark:border-white/10 p-8">
              <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-6 flex items-center gap-2">
                <ShieldCheck size={16} className="text-slate-700 dark:text-white" />
                Zero-Knowledge Architecture
              </h4>
              <div className="space-y-6">
                {[
                  { title: "Physical Data Isolation", desc: "Our authentication server (Gumroad) knows ONLY that you paid. Our app knows ONLY your code. There is no physical wire connecting the two." },
                  { title: "Client-Side Execution", desc: "290+ parsers and transformation engines run inside your browser's Web Worker. We don't have a 'Server-Side Engine' where your code could be logged." },
                  { title: "Direct AI Communication", desc: "Your Gemini API Key is stored in your LocalStorage (AES encrypted). When you click 'Generate', your browser talks DIRECTLY to Google. It never passes through a TypeMorph proxy." },
                  { title: "Physical Barrier to Data", desc: "Check our Network Tab: We don't even have an 'Upload' or 'Save' endpoint. It is technically impossible for us to steal what we cannot receive." }
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="flex-none w-6 h-6 rounded-full bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white flex items-center justify-center text-[10px] font-black border border-slate-200 dark:border-white/10">{i + 1}</div>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">{item.title}</h5>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-40 max-w-3xl mx-auto border-t border-slate-200 dark:border-white/10 pt-20">
          <h2 className="text-xl font-black mb-12 text-center text-slate-900 dark:text-white uppercase tracking-widest">General Inquiries</h2>
          <div className="space-y-4">
            {[
              { q: "Is it really a one-time payment?", a: "Yes! You pay $25 once and get lifetime access to all Pro features. There are no recurring fees or hidden costs." },
              { q: "Do you offer Team/Enterprise plans?", a: "Yes. For teams requiring bulk licensing, please contact me directly." },
              { q: "How does the license activation work?", a: "After purchasing through Gumroad, you'll receive a license key via email. Simply enter it into the app, and the Pro features will unlock instantly in your browser." }
            ].map((item, i) => (
              <div key={i} className="p-6 bg-white dark:bg-white/[0.03] rounded-xl border border-slate-100 dark:border-white/10">
                <h4 className="font-black text-slate-900 dark:text-white mb-2 text-sm">{item.q}</h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
