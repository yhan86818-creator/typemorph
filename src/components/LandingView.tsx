'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Lock, Zap, Crown, Check, CheckCircle2, Search, Sparkles, Monitor } from 'lucide-react';
import { converters } from '@/data/converters';
import { ToolLink, FeatureCard } from './SharedUI';

export function LandingView({ onStart }: { onStart: () => void }) {
  const [searchQuery, setSearchQuery] = useState("");
  const categories = [
    { name: "Frontend & UI", keywords: ["typescript", "zod", "react", "vue", "valibot", "arktype", "css", "tailwind", "context"] },
    { name: "Backend & DB", keywords: ["go", "rust", "python", "java", "kotlin", "swift", "csharp", "sql", "prisma", "drizzle", "supabase", "mysql", "sqlite", "bigquery", "dynamodb", "mongodb"] },
    { name: "DevOps & Config", keywords: ["terraform", "github", "yaml", "env", "postman", "clerk", "nextauth", "lucia"] }
  ];

  const isProConverter = (slug: string) => {
    return slug.includes('rust') || slug.includes('prisma') || slug.includes('java') || 
           slug.includes('kotlin') || slug.includes('swift') || slug.includes('csharp') || 
           slug.includes('openapi') || slug.includes('json-schema') || slug.includes('query') ||
           slug.includes('pydantic') || slug.includes('hook') || slug.includes('jsonschema');
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-7xl mx-auto px-6 py-20">
      <div className="text-center mb-24">
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 text-blue-700 font-black text-xs border border-blue-100 uppercase tracking-widest dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900">
            <Sparkles size={14} /> AI-Powered Engineering Workbench
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-50 text-amber-700 font-black text-xs border border-amber-100 uppercase tracking-widest dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900">
            <Crown size={14} /> 3 Daily Pro Trials Included
          </div>
        </div>
        <h1 className="text-6xl md:text-[100px] font-black tracking-tightest mb-8 leading-[0.85] dark:text-white">
          Transform Data. <br />
          <span className="text-blue-600">Build Faster.</span>
        </h1>
        <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
          TypeFlow Pro is the first local-first workbench that turns messy data into clean types AND ready-to-use React components using AI.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={onStart} className="px-12 py-5 rounded-2xl bg-[#0F172A] dark:bg-blue-600 text-white font-black text-lg shadow-2xl shadow-blue-200 dark:shadow-none hover:scale-105 transition-all flex items-center gap-3 justify-center">
            Open Workbench <ArrowRight size={22} />
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-32">
        <FeatureCard icon={<Sparkles />} title="AI Smart Parse" desc="Paste messy logs or broken JSON. AI cleans and infers perfect structures automatically." color="blue" isPro />
        <FeatureCard icon={<Monitor />} title="UI Component Gen" desc="Generate professional React + Tailwind CSS tables and cards directly from your data." color="slate" isPro />
        <FeatureCard icon={<ShieldCheck />} title="Privacy-First" desc="100% local execution. Your proprietary data and API keys never leave your browser." color="amber" />
      </div>

      {/* Security Visualization */}
      <section className="mb-32 py-20 bg-white dark:bg-slate-900/50 rounded-[3rem] border border-slate-200 dark:border-slate-800 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50/50 dark:bg-slate-800/20 -skew-x-12 translate-x-1/4"></div>
        <div className="max-w-4xl mx-auto px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center gap-16">
            <div className="flex-1">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-200">
                <ShieldCheck size={24} />
              </div>
              <h2 className="text-4xl font-black tracking-tight mb-6 leading-tight dark:text-white">Your data never <br/>leaves your browser.</h2>
              <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8">
                Unlike other converters that process your data on their backend, TypeFlow performs every computation locally.
              </p>
              <div className="space-y-4">
                {[
                  "No Database Storage",
                  "No Server Logs",
                  "GDPR & SOC2 Ready",
                  "Offline Capable"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-slate-900 dark:text-slate-200 font-bold">
                    <div className="w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                      <Check size={12} />
                    </div>
                    {item}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 w-full max-w-sm">
              <div className="bg-slate-900 rounded-3xl p-8 shadow-2xl relative">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="space-y-4 font-mono text-[10px]">
                  <div className="text-blue-400"># Security Audit Log</div>
                  <div className="text-slate-500">&gt;&gt; status: 100% Local Execution</div>
                  <div className="text-slate-500">&gt;&gt; server_sync: <span className="text-red-400">DISABLED</span></div>
                  <div className="text-slate-500">&gt;&gt; network_traffic: 0 bytes outbound</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="mb-32">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black tracking-tight mb-4 dark:text-white">Choose Your Power</h2>
          <p className="text-slate-500 font-medium">Free for hobbyists, enterprise-grade for professionals.</p>
        </div>
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm">
            <h3 className="text-xl font-bold mb-2 dark:text-white">Free Community</h3>
            <p className="text-slate-400 text-sm mb-6">The essential tools for every dev.</p>
            <div className="text-4xl font-black mb-8 dark:text-white">$0<span className="text-sm text-slate-400 font-medium"> / forever</span></div>
            <ul className="space-y-4 mb-10">
              {[
                "TypeScript & Zod Exporters",
                "Go & Python Basic Structs",
                "MySQL & SQLite Schema Gen",
                "YAML/XML/TOML Formats",
                "Monaco IDE Experience",
                "100% Local Privacy",
                "3 Daily Pro Trials (AI/UI/Rust)"
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {i === 6 ? <Sparkles size={16} className="text-blue-500" /> : <Check size={16} className="text-blue-500" />} {f}
                </li>
              ))}
            </ul>
            <button onClick={onStart} className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 font-black hover:bg-slate-200 transition-all">Start Converting</button>
          </div>
          
          <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden text-white">
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Early Bird</span>
            </div>
            <h3 className="text-xl font-bold mb-2">Pro Lifetime</h3>
            <p className="text-slate-400 text-sm mb-6">Unleash the full potential.</p>
            <div className="text-4xl font-black mb-8">$9<span className="text-sm text-slate-400 font-medium"> / one-time</span></div>
            <ul className="space-y-4 mb-10">
              {[
                "Rust Serde Exporter",
                "Prisma & Drizzle Schemas",
                "React Query Hook Generator",
                "Java/C#/Swift/Kotlin Support",
                "OpenAPI & JSON Schema v7",
                "Priority Logic Updates",
                "Advanced AI Smart Parse"
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-slate-300 font-medium">
                  <Crown size={16} className="text-amber-400" /> {f}
                </li>
              ))}
            </ul>
            <a 
              href="https://yhanster206.gumroad.com/l/zjcuuu" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-center font-black hover:opacity-90 transition-all shadow-xl shadow-amber-500/20"
            >
              Get Lifetime Access
            </a>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mb-32">
        <h2 className="text-3xl font-black text-center mb-16 tracking-tight dark:text-white">Trusted by engineers at top startups</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { name: "Alex Rivers", role: "Senior Frontend Engineer", text: "Finally, a converter that doesn't leak my API payloads. The Zod exporter is a lifesaver for our Edge Functions." },
            { name: "Sarah Chen", role: "Backend Architect", text: "The Rust Serde output is idiomatic and clean. TypeFlow has replaced three different browser bookmarks for me." },
            { name: "Marcus Thorne", role: "DevOps Lead", text: "Generating Kubernetes configs from raw JSON samples is now a 2-second task. The local-first approach is mandatory for us." }
          ].map((t, i) => (
            <div key={i} className="p-8 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 relative group hover:-translate-y-2 transition-all">
              <div className="flex gap-1 mb-4 text-amber-400">
                {[...Array(5)].map((_, i) => <CheckCircle2 key={i} size={12} fill="currentColor" />)}
              </div>
              <p className="text-slate-600 dark:text-slate-400 font-medium mb-6 leading-relaxed italic">"{t.text}"</p>
              <div>
                <p className="font-black text-slate-900 dark:text-slate-200 text-sm">{t.name}</p>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="pt-20 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-4 dark:text-white">The Mega Directory</h2>
            <p className="text-slate-500 max-w-2xl font-medium">Explore our comprehensive suite of 117+ high-performance developer utilities.</p>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search 117+ converters..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none w-full md:w-80 transition-all font-medium text-slate-900 dark:text-white"
            />
          </div>
        </div>
        
        <div className="space-y-20">
          {searchQuery ? (
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-4">
                <span className="w-8 h-px bg-slate-200 dark:bg-slate-800"></span>
                Search Results ({converters.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {converters.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).map(tool => (
                  <ToolLink key={tool.slug} tool={tool} isPro={isProConverter(tool.slug)} />
                ))}
              </div>
            </div>
          ) : (
            categories.map((cat, i) => {
              const catTools = converters.filter(c => 
                cat.keywords.some(k => c.slug.toLowerCase().includes(k))
              );
              if (catTools.length === 0) return null;
              return (
                <div key={i}>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-4">
                    <span className="w-8 h-px bg-slate-200 dark:bg-slate-800"></span>
                    {cat.name} ({catTools.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {catTools.map(tool => (
                      <ToolLink key={tool.slug} tool={tool} isPro={isProConverter(tool.slug)} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
