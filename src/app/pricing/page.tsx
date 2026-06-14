'use client';
import React from 'react';
import { trackProClick } from '@/lib/analytics';
import { ShieldCheck, Zap, Check, ArrowRight, Cpu } from 'lucide-react';
import GlobalFooter from '@/components/GlobalFooter';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <main className="max-w-6xl mx-auto px-6 pt-32 pb-40">
        <div className="text-center mb-24">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-mono text-[9px] uppercase tracking-wider mb-6 border border-slate-200 dark:border-white/10">
            <Zap size={11} /> [local-first · zero-cloud · pay-once]
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-slate-900 dark:text-white leading-tight">
            The Professional Schema Tool.<br />Pay Once. Own It.
          </h1>
          <p className="text-xl text-slate-500 dark:text-slate-400 font-medium max-w-3xl mx-auto leading-relaxed">
            TypeMorph runs 100% in your browser. No cloud processing, no subscriptions for core features. Upgrade once to unlock the full professional workbench — forever.
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
                "100% Browser-Local Processing",
                "18+ Format Converters (TypeScript, Go, Rust, Zod, Python, Swift…)",
                "JSON / YAML / SQL / OpenAPI / TypeScript Input",
                "Schema Quality Score (A–F Grading)",
                "Breaking Change Detector",
                "Standard Copy-Paste Workflow",
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
                  "Everything in Free, Forever",
                  "Unlimited Conversions (No Daily Limit)",
                  "Local File Sync (Auto-Save to Filesystem)",
                  "Bulk Folder & Multi-File Processing",
                  "CLI Access (typemorph-cli on npm)",
                  "Priority Feature Requests",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs font-black text-slate-900 dark:text-white">
                    <Cpu size={14} className="text-slate-700 dark:text-white mt-0.5 shrink-0" />
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
                  We believe developers are tired of subscription fatigue. Since all execution happens locally in your browser, we have virtually zero server costs. A flat $25 lifetime payment gives you unrestricted access to our best-in-class local workbench forever.
                </p>
              </div>
              <div>
                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider mb-3">Why Local-First?</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                  Every conversion — TypeScript, Zod, Go, Rust, Prisma — runs inside your browser with sub-millisecond latency. Your schemas never leave your machine. No upload endpoint, no logging, no cloud round-trips. What you type stays yours.
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
                  { title: "Physical Data Isolation", desc: "Our payment processor (Gumroad) knows ONLY that you paid. Our app knows ONLY your code. There is no physical wire connecting the two." },
                  { title: "Client-Side Execution", desc: "160+ parsers and transformation engines run inside your browser. We don't have a server-side engine where your schemas could be logged or stored." },
                  { title: "No Upload Endpoint", desc: "Check our Network Tab: we don't even have an 'Upload' or 'Save' endpoint. It is technically impossible for us to see what we cannot receive." },
                  { title: "Open Inspection", desc: "Our transformation logic is written in TypeScript and ships directly to your browser. You can inspect, audit, or fork every line of inference and generation code." },
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
              { q: "Is it really a one-time payment?", a: "Yes. You pay $25 once and get lifetime access to all Pro features. No recurring fees, no hidden costs." },
              { q: "Do you offer Team/Enterprise plans?", a: "Yes. For teams requiring bulk licensing, please contact me directly." },
              { q: "How does the license activation work?", a: "After purchasing through Gumroad, you'll receive a license key via email. Enter it into the app and Pro features unlock instantly in your browser." },
              { q: "Is the CLI also covered by the Pro license?", a: "The typemorph-cli npm package is free and open. The Pro license unlocks the full in-browser workbench — bulk folder mode, file sync, and unlimited conversions." },
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
