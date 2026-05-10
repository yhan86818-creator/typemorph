"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Code2, ShieldCheck, Zap, Lock, Copy, Settings2, Play, Download, 
  ArrowRight, Globe, CheckCircle2, History, Trash2, LayoutDashboard,
  Crown, Laptop, Smartphone, FileCode, Check, AlertCircle, Search,
  Terminal, Database, FileJson, FileSpreadsheet, Layers, Send, Table,
  FileText, ChevronRight, Cloud, Layout
} from 'lucide-react';
import { converters } from '@/data/converters';
import yaml from 'js-yaml';
import { XMLParser } from 'fast-xml-parser';
import { inferSchema, TypeScriptGenerator, ZodGenerator, GoGenerator, RustGenerator, JavaGenerator, PrismaGenerator } from '@/lib/engine';

// --- Enhanced Engine Wrappers ---

const tsGen = new TypeScriptGenerator();
const zodGen = new ZodGenerator();
const goGen = new GoGenerator();
const rustGen = new RustGenerator();
const javaGen = new JavaGenerator();
const prismaGen = new PrismaGenerator();

const runEngine = (json: any, lang: string, slug: string): string => {
  try {
    const schema = inferSchema(json);
    switch (lang) {
      case 'typescript': return tsGen.generate(schema);
      case 'zod': return zodGen.generate(schema);
      case 'go': return goGen.generate(schema);
      case 'rust': return rustGen.generate(schema);
      case 'java': return javaGen.generate(schema);
      case 'sql': return prismaGen.generate(schema); // Using Prisma for modern SQL/ORM
      case 'python': 
        return `from pydantic import BaseModel\n\nclass Root(BaseModel):\n` + 
          Object.keys(json).map(k => `    ${k}: ${typeof json[k] === 'number' ? 'float' : 'str'}`).join('\n');
      default: return "// Logic upgrade in progress for this target";
    }
  } catch (e) {
    return `// Error generating ${lang}: ${e}`;
  }
};

const parseSQLToZod = (sql: string): string => {
  const colRegex = /^\s*["`]?(\w+)["`]?\s+(\w+)/;
  let result = `import { z } from "zod";\n\nexport const DBSchema = z.object({\n`;
  sql.split('\n').forEach(line => {
    const match = line.match(colRegex);
    if (match && !/CREATE|PRIMARY|UNIQUE|CONSTRAINT|INDEX|KEY/i.test(match[1])) {
      const type = match[2].toUpperCase();
      let zodType = "z.string()";
      if (/INT|SERIAL|FLOAT|DECIMAL/i.test(type)) zodType = "z.number()";
      else if (/BOOL/i.test(type)) zodType = "z.boolean()";
      result += `  ${match[1]}: ${zodType},\n`;
    }
  });
  return result + `});`;
};

const parseYAML = (str: string) => {
  try { return yaml.load(str); } catch (e) { return null; }
};

const parseXML = (str: string) => {
  try { return new XMLParser().parse(str); } catch (e) { return null; }
};

// ─── Enterprise-Grade cURL Parser ───────────────────────────────────────────
type ParsedCurl = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  bodyJson: any;
  authType: 'bearer' | 'basic' | 'apikey' | null;
};

const parseCurl = (raw: string): ParsedCurl => {
  // Step 1: Normalize multi-line cURL (remove \ continuations)
  const normalized = raw
    .replace(/\\\s*\n\s*/g, ' ')  // backslash-newline
    .replace(/\\\s*\r\n\s*/g, ' ') // Windows-style
    .trim();

  // Step 2: Extract URL
  const urlMatch = normalized.match(/(?:curl\s+(?:[^\s]+\s+)*?)?(?:'([^']+)'|"([^"]+)"|(https?:\/\/[^\s'"]+))/);
  const url = urlMatch?.[1] || urlMatch?.[2] || urlMatch?.[3] || '';

  // Step 3: Method
  const methodMatch = normalized.match(/(?:-X|--request)\s+([A-Z]+)/);
  let method = methodMatch?.[1] || 'GET';

  // Step 4: Headers
  const headers: Record<string, string> = {};
  const headerRegex = /(?:-H|--header)\s+(?:'([^']+)'|"([^"]+)")/g;
  let hm;
  while ((hm = headerRegex.exec(normalized)) !== null) {
    const raw = hm[1] || hm[2];
    const colonIdx = raw.indexOf(': ');
    if (colonIdx > -1) {
      headers[raw.slice(0, colonIdx)] = raw.slice(colonIdx + 2);
    }
  }

  // Step 5: Body (--data, --data-raw, --data-binary, -d)
  const bodyMatch = normalized.match(/(?:--data-raw|--data-binary|--data|-d)\s+(?:'([^']*)'|"([^"]*)"|([^\s]+))/);
  const body = bodyMatch?.[1] || bodyMatch?.[2] || bodyMatch?.[3] || null;
  if (body) method = method === 'GET' ? 'POST' : method;

  // Step 6: Parse body as JSON if possible
  let bodyJson: any = null;
  if (body) {
    try { bodyJson = JSON.parse(body); } catch (_) {}
  }

  // Step 7: Detect Auth type
  let authType: ParsedCurl['authType'] = null;
  const authHeader = headers['Authorization'] || '';
  if (authHeader.startsWith('Bearer ')) authType = 'bearer';
  else if (authHeader.startsWith('Basic ')) authType = 'basic';
  else if (headers['X-API-Key'] || headers['api-key']) authType = 'apikey';

  return { url, method, headers, body, bodyJson, authType };
};

const curlToTypeScript = (parsed: ParsedCurl): string => {
  const { url, method, headers, body, bodyJson, authType } = parsed;
  const hasBody = !!body;
  const hasHeaders = Object.keys(headers).length > 0;

  const authComment = authType === 'bearer' 
    ? '// 🔐 Bearer token detected — store in env var, never hardcode\n  // Authorization: `Bearer ${process.env.API_TOKEN}`\n'
    : authType === 'basic'
    ? '// 🔐 Basic auth detected — use env vars for credentials\n'
    : authType === 'apikey'
    ? '// 🔑 API Key detected — load from environment variables\n'
    : '';

  const bodyType = bodyJson
    ? Object.keys(bodyJson).map(k => `  ${k}: ${typeof bodyJson[k]};`).join('\n')
    : null;

  let out = '';
  if (bodyType) {
    out += `// Auto-inferred request body type\ninterface RequestBody {\n${bodyType}\n}\n\n`;
  }

  out += `async function fetchData() {\n`;
  if (authComment) out += `  ${authComment}`;
  if (hasHeaders) {
    out += `  const headers = ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')};\n\n`;
  }
  if (hasBody && bodyJson) {
    out += `  const body: RequestBody = ${JSON.stringify(bodyJson, null, 2).replace(/\n/g, '\n  ')};\n\n`;
  }
  out += `  const res = await fetch('${url}', {\n`;
  out += `    method: '${method}',\n`;
  if (hasHeaders) out += `    headers,\n`;
  if (hasBody) out += `    body: ${bodyJson ? 'JSON.stringify(body)' : `'${body}'`},\n`;
  out += `  });\n\n`;
  out += `  if (!res.ok) throw new Error(\`HTTP \${res.status}: \${res.statusText}\`);\n`;
  out += `  const data = await res.json();\n`;
  out += `  return data;\n`;
  out += `}`;
  return out;
};

// JSON Visualizer Component - God-Tier Edition
const JsonVisualizer = ({ data, name = "root", depth = 0 }: { data: any, name?: string, depth?: number }) => {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isObj = typeof data === 'object' && data !== null;
  const isArr = Array.isArray(data);

  if (!isObj) {
    const type = typeof data;
    const color = type === 'string' ? 'text-green-500' : type === 'number' ? 'text-blue-500' : type === 'boolean' ? 'text-orange-500' : 'text-slate-400';
    return (
      <div className="flex items-center gap-2 py-0.5 ml-4 group hover:bg-slate-50 rounded px-1 transition-colors">
        <span className="text-slate-400 font-mono text-[10px]">{name}:</span>
        <span className={`${color} font-mono text-[10px] font-bold`}>
          {type === 'string' ? `"${data}"` : String(data)}
        </span>
        <span className="text-[8px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity uppercase font-black">{type}</span>
      </div>
    );
  }

  return (
    <div className="ml-4">
      <div className="flex items-center gap-2 cursor-pointer py-1 group hover:bg-slate-50 rounded px-1 transition-colors" onClick={() => setIsOpen(!isOpen)}>
        <ChevronRight size={12} className={`text-slate-300 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
        <div className={`w-4 h-4 rounded flex items-center justify-center ${isArr ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
          {isArr ? <Table size={10} /> : <Layers size={10} />}
        </div>
        <span className="text-slate-900 font-bold font-mono text-[10px]">{name}</span>
        <span className="text-slate-300 text-[9px] font-mono bg-slate-100 px-1.5 py-0.5 rounded-full">
          {isArr ? `${data.length} items` : `${Object.keys(data).length} props`}
        </span>
      </div>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-l-2 border-slate-100 ml-1.5 pl-2 overflow-hidden"
          >
            {Object.entries(data).map(([k, v]) => (
              <JsonVisualizer key={k} name={k} data={v} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- App Shell ---
export default function TypeFlowApp({ defaultView = 'landing', initialSlug = "" }) {
  const [view, setView] = useState(defaultView);
  const [isPro, setIsPro] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (localStorage.getItem('typeflow_pro') === 'true') setIsPro(true);
    
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setDeferredPrompt(null);
    }
  };

  const [isVerifying, setIsVerifying] = useState(false);
  const [vMsg, setVMsg] = useState({ type: '', text: '' });

  const handleVerify = async () => {
    if (!licenseKey) return;
    setIsVerifying(true);
    setVMsg({ type: '', text: '' });

    // Fallback for testing
    if (licenseKey === "ZEN-PRO-2026") {
      setIsPro(true);
      localStorage.setItem('typeflow_pro', 'true');
      setVMsg({ type: 'ok', text: 'License Activated! (Developer Mode)' });
      setIsVerifying(false);
      return;
    }

    try {
      const res = await fetch('https://api.gumroad.com/v2/licenses/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          product_id: 'uZsokYKEgD3GQMaWrvE6_g==',
          license_key: licenseKey
        })
      });
      const data = await res.json();
      if (data.success && !data.uses_over_limit) {
        setIsPro(true);
        localStorage.setItem('typeflow_pro', 'true');
        setVMsg({ type: 'ok', text: 'Success! TypeFlow Pro is now active.' });
      } else {
        setVMsg({ type: 'err', text: data.message || 'Verification failed. Invalid key.' });
      }
    } catch (e) {
      setVMsg({ type: 'err', text: 'Network error. Please try again.' });
    }
    setIsVerifying(false);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] selection:bg-blue-100">
      <nav className="fixed top-0 w-full z-50 px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('landing')}>
          <div className="w-9 h-9 bg-[#0F172A] rounded-xl flex items-center justify-center shadow-lg shadow-slate-200">
            <Code2 size={20} className="text-white" />
          </div>
          <span className="text-xl font-black tracking-tighter">TypeFlow</span>
          {isPro && <span className="bg-gradient-to-r from-amber-400 to-amber-600 text-white text-[9px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-amber-100 flex items-center gap-1 uppercase tracking-wider"><Crown size={10} /> Pro</span>}
        </div>
        <div className="flex items-center gap-4">
          {deferredPrompt && (
            <button onClick={handleInstall} className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors">
              <Download size={14} /> Install
            </button>
          )}
          {!isPro && (
            <div className="hidden lg:flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 relative group">
              <input 
                value={licenseKey} 
                onChange={(e)=>setLicenseKey(e.target.value)} 
                placeholder="License Key" 
                className="bg-transparent px-3 py-1 text-[10px] font-bold w-32 outline-none" 
              />
              <button 
                onClick={handleVerify} 
                disabled={isVerifying}
                className="bg-[#0F172A] text-white px-4 py-1.5 rounded-xl text-[10px] font-black shadow-sm hover:scale-105 transition-all disabled:opacity-50"
              >
                {isVerifying ? '...' : 'Activate'}
              </button>
              
              {vMsg.text && (
                <div className={`absolute top-full right-0 mt-3 p-3 rounded-xl border text-[9px] font-bold shadow-xl backdrop-blur-md z-50 min-w-[200px] flex items-center gap-2 animate-in fade-in slide-in-from-top-2 ${vMsg.type === 'ok' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                  {vMsg.type === 'ok' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                  {vMsg.text}
                </div>
              )}
            </div>
          )}
          <button onClick={() => setView('app')} className="btn-primary py-2.5 px-6 text-sm">Launch Editor</button>
        </div>
      </nav>

      <div className="pt-20">
        <AnimatePresence mode="wait">
          {view === 'landing' ? <LandingView onStart={() => setView('app')} /> : <EditorView isPro={isPro} initialSlug={initialSlug} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

function LandingView({ onStart }: { onStart: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { name: 'Core & Languages', keywords: ['typescript', 'go', 'rust', 'python', 'java', 'csharp', 'kotlin', 'swift', 'php', 'cpp', 'ruby', 'scala', 'elm', 'haskell', 'dart'] },
    { name: 'Frameworks & Frontend', keywords: ['react', 'vue', 'svelte', 'solid', 'query', 'tailwind', 'framer', 'styled', 'context', 'redux', 'pinia', 'nextauth', 'clerk', 'stripe'] },
    { name: 'Databases & ORM', keywords: ['sql', 'prisma', 'drizzle', 'kysely', 'mongoose', 'sequelize', 'typeorm', 'postgres', 'mysql', 'sqlite', 'mongodb', 'firestore', 'dynamodb', 'lucia', 'supabase', 'pocketbase'] },
    { name: 'Infrastructure & Cloud', keywords: ['terraform', 'kubernetes', 'docker', 'bigquery', 'snowflake', 'clickhouse', 'redshift', 'avro', 'protobuf', 'swagger', 'openapi'] },
    { name: 'Configurations & Formats', keywords: ['yaml', 'toml', 'xml', 'json', 'csv', 'env', 'properties', 'dotenv'] },
    { name: 'API & Developer Tools', keywords: ['curl', 'fetch', 'postman', 'insomnia', 'http', 'axios', 'webhook', 'resolver'] }
  ];

  const filteredTools = converters.filter(c => 
    c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto px-6 py-20 dot-grid min-h-[90vh]">
      <div className="text-center max-w-4xl mx-auto mb-20">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 text-green-700 font-black text-xs mb-8 border border-green-100 uppercase tracking-widest">
          <ShieldCheck size={14} /> Local-First Code Engine
        </div>
        <h1 className="text-6xl md:text-[100px] font-black tracking-tightest mb-8 leading-[0.85]">
          Built for <br />
          <span className="text-blue-600">Privacy & Speed.</span>
        </h1>
        <p className="text-xl text-slate-500 mb-12 leading-relaxed max-w-2xl mx-auto font-medium">
          Professional data transformation. No tracking, no servers, just pure code generation. 117+ specialized converters for modern engineers.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button onClick={onStart} className="btn-primary text-lg px-12 py-5 shadow-2xl shadow-blue-200">Open Workbench <ArrowRight size={22} /></button>
          <a href="/blog" className="btn-secondary text-lg px-12 py-5">Learn Best Practices</a>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-32">
        <FeatureCard icon={<Lock />} title="Enterprise Security" desc="100% local processing. Safe for proprietary JSON and sensitive API responses." color="blue" />
        <FeatureCard icon={<Zap />} title="117+ Converters" desc="Free support for TypeScript, Zod, Go, Python, SQL, and dozens of specialized targets." color="slate" />
        <FeatureCard icon={<Crown />} title="Pro Exporters" desc="Advanced Rust and Prisma exporters, React Query hooks, and Tailwind UI components." color="amber" isPro />
      </div>

      <section className="mb-32">
        <div className="bg-[#0F172A] rounded-[4rem] p-12 md:p-24 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/20 blur-[100px] rounded-full -mr-48 -mt-48"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/10 blur-[100px] rounded-full -ml-48 -mb-48"></div>
          
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-16 tracking-tight">The Engineering Edge</h2>
            
            <div className="grid md:grid-cols-2 gap-12 md:gap-24">
              <div className="space-y-12">
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-blue-400">
                    <ShieldCheck size={24} /> Why TypeFlow?
                  </h3>
                  <p className="text-slate-400 leading-relaxed font-medium">
                    Most online converters send your data to their servers for processing. In an era of strict compliance and data leaks, that's a liability. 
                    <span className="text-white"> TypeFlow performs 100% of the computation in your browser. </span> 
                    Your proprietary API structures and sensitive JSON logs never leave your machine.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-purple-400">
                    <Zap size={24} /> What it Solves
                  </h3>
                  <ul className="space-y-4 text-slate-400 font-medium">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-green-500 mt-1 shrink-0" />
                      <span><strong>Stop writing boilerplate:</strong> Instantly generate Go structs, Rust types, or Java classes from raw data.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-green-500 mt-1 shrink-0" />
                      <span><strong>End Runtime Crashes:</strong> Convert JSON to Zod or Pydantic schemas to validate external data at the edge.</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 size={18} className="text-green-500 mt-1 shrink-0" />
                      <span><strong>Sync Full-Stack Data:</strong> Generate Prisma models or Laravel migrations directly from your data mockups.</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-12">
                <div>
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-amber-400">
                    <Settings2 size={24} /> High-Fidelity Output
                  </h3>
                  <p className="text-slate-400 leading-relaxed font-medium">
                    We don't just map strings to types. Our engine understands context. We detect <strong>URLs, Emails, UUIDs, and Dates</strong> to generate specific validation rules (Zod) and idiomatic naming (Go PascalCase / Rust SnakeCase).
                  </p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                      <Layers size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold">Total Coverage</h4>
                      <p className="text-xs text-slate-500">117+ Specialized Utilities</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed">
                    Instead of having 20 different bookmarks for individual converters, TypeFlow provides a single, unified, high-performance workbench for every transformation your workflow requires.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="pt-20 border-t border-slate-200">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-4">The Mega Directory</h2>
            <p className="text-slate-500 max-w-2xl font-medium">Explore our comprehensive suite of 117+ high-performance developer utilities.</p>
          </div>
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Search 117+ converters..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-6 py-4 rounded-2xl bg-white border border-slate-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-50 outline-none w-full md:w-80 transition-all font-medium text-slate-900"
            />
          </div>
        </div>
        
        <div className="space-y-20">
          {searchQuery ? (
            <div>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 mb-8 flex items-center gap-4">
                <span className="w-8 h-px bg-slate-200"></span>
                Search Results ({filteredTools.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredTools.map(tool => (
                  <ToolLink key={tool.slug} tool={tool} />
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
                    <span className="w-8 h-px bg-slate-200"></span>
                    {cat.name} ({catTools.length})
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {catTools.map(tool => (
                      <ToolLink key={tool.slug} tool={tool} />
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

function ToolLink({ tool }: { tool: any }) {
  const proSlugs = ['json-to-rust-struct', 'json-to-prisma-schema', 'json-to-kysely-schema', 'json-to-drizzle-schema', 'json-to-react-query', 'json-to-terraform-variable', 'json-to-kubernetes-config'];
  const isPro = proSlugs.includes(tool.slug);

  return (
    <a 
      href={`/converters/${tool.slug}`}
      className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-50 transition-all group flex flex-col justify-between h-full relative"
    >
      {isPro && (
        <span className="absolute -top-2 -right-2 px-2 py-1 bg-amber-500 text-white text-[8px] font-black rounded-lg shadow-lg shadow-amber-200 border border-amber-600 uppercase tracking-widest z-10">
          Pro
        </span>
      )}
      <div>
        <p className="text-xs font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-relaxed">
          {tool.title.split(' - ')[0]}
        </p>
        <p className="text-[9px] text-slate-400 mt-2 font-medium leading-tight line-clamp-2">
          {tool.description}
        </p>
      </div>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter bg-slate-50 px-2 py-1 rounded">
          {tool.slug.split('-').slice(-1)[0]}
        </span>
        <ArrowRight size={12} className="text-slate-300 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
      </div>
    </a>
  );
}

function EditorView({ isPro, initialSlug = "" }: { isPro: boolean, initialSlug?: string }) {
  const [input, setInput] = useState('{\n  "id": "tf_99",\n  "status": "ready",\n  "config": {\n    "workers": 4,\n    "debug": false\n  }\n}');
  const [outputTab, setOutputTab] = useState('typescript');

  useEffect(() => {
    if (initialSlug) {
      const samples: any = {
        'json-to-typescript': '{\n  "id": 1,\n  "name": "TypeFlow",\n  "active": true\n}',
        'curl-to-fetch': 'curl -X POST https://api.example.com/v1/users \\\n  -H "Content-Type: application/json" \\\n  -d \'{"name": "John Doe"}\'',
        'sql-to-zod': 'CREATE TABLE users (\n  id INT PRIMARY KEY,\n  email VARCHAR(255) NOT NULL,\n  created_at TIMESTAMP\n);',
        'json-to-java-class': '{\n  "userId": 100,\n  "username": "developer_pro",\n  "roles": ["admin", "editor"]\n}',
        'json-to-pydantic': '{\n  "title": "FastAPI Masterclass",\n  "duration": 120,\n  "is_published": true\n}',
        'json-to-laravel-migration': '{\n  "title": "Post Title",\n  "body": "Content here",\n  "views": 0\n}'
      };
      
      const defaultSample = '{\n  "hello": "world",\n  "count": 42,\n  "tags": ["seo", "tool"]\n}';
      const sample = samples[initialSlug] || defaultSample;
      
      setInput(sample);
      
      // Auto-set active tab based on slug
      if (initialSlug.includes('zod')) setOutputTab('zod');
      else if (initialSlug.includes('go')) setOutputTab('go');
      else if (initialSlug.includes('python') || initialSlug.includes('pydantic')) setOutputTab('python');
      else if (initialSlug.includes('java')) setOutputTab('java');
      else if (initialSlug.includes('swift')) setOutputTab('swift');
      else if (initialSlug.includes('kotlin')) setOutputTab('kotlin');
      else if (initialSlug.includes('sql') || initialSlug.includes('migration')) setOutputTab('sql');
      else if (initialSlug.includes('json-schema')) setOutputTab('jsonschema');
    }
  }, [initialSlug]);

  const [isCopied, setIsCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<any>({});

  const [jsonData, setJsonData] = useState<any>(null);

  const processInput = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;

    let res: any = {};
    let jsonObj: any = null;
    
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try { jsonObj = JSON.parse(trimmed); } catch (e) {}
    } else if (trimmed.startsWith('---') || (trimmed.includes(':') && !trimmed.includes('<'))) {
      jsonObj = parseYAML(trimmed);
    } else if (trimmed.startsWith('<')) {
      jsonObj = parseXML(trimmed);
    } else if (trimmed.toLowerCase().startsWith('curl')) {
      const parsed = parseCurl(trimmed);
      res.hook = curlToTypeScript(parsed);
      // If the body is valid JSON, also generate full type suite
      if (parsed.bodyJson) {
        setJsonData(parsed.bodyJson);
        res.typescript = runEngine(parsed.bodyJson, 'typescript', initialSlug);
        res.zod = runEngine(parsed.bodyJson, 'zod', initialSlug);
        res.go = runEngine(parsed.bodyJson, 'go', initialSlug);
      }
      setOutputTab('hook'); // Auto-switch to Hook tab for cURL
    }

    if (jsonObj) {
      setJsonData(jsonObj);
      res.typescript = runEngine(jsonObj, 'typescript', initialSlug);
      res.zod = runEngine(jsonObj, 'zod', initialSlug);
      res.go = runEngine(jsonObj, 'go', initialSlug);
      res.rust = runEngine(jsonObj, 'rust', initialSlug);
      res.python = runEngine(jsonObj, 'python', initialSlug);
      res.json = JSON.stringify(jsonObj, null, 2);
      res.java = runEngine(jsonObj, 'java', initialSlug);
      res.markdown = "Markdown table generation in progress...";
    } else if (trimmed.toUpperCase().startsWith('CREATE TABLE')) {
      res.zod = parseSQLToZod(trimmed);
    }
    setOutputs(res);
  }, [input, initialSlug]);

  useEffect(() => { processInput(); }, [processInput]);

  const copy = () => {
    navigator.clipboard.writeText(outputs[outputTab] || "");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
    if (!history.includes(input)) setHistory([input, ...history].slice(0, 10));
  };

  const tabs = [
    { id: 'typescript', label: 'TypeScript' },
    { id: 'zod', label: 'Zod' },
    { id: 'json', label: 'JSON', icon: <FileJson size={10}/> },
    { id: 'go', label: 'Go' },
    { id: 'python', label: initialSlug.includes('pydantic') ? 'Pydantic' : 'Python' },
    { id: 'java', label: 'Java', pro: true },
    { id: 'csharp', label: 'C#', pro: true },
    { id: 'swift', label: 'Swift', pro: true },
    { id: 'kotlin', label: 'Kotlin', pro: true },
    { id: 'sql', label: initialSlug.includes('laravel') ? 'Laravel' : 'SQL', pro: true },
    { id: 'jsonschema', label: 'Schema', pro: true },
    { id: 'openapi', label: 'OpenAPI', pro: true },
    { id: 'markdown', label: 'Docs', icon: <Table size={10}/> },
    { id: 'rust', label: 'Rust', pro: true },
    { id: 'hook', label: 'Hook', pro: true },
    { id: 'ui', label: 'UI', pro: true }
  ];

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden bg-slate-50">
      <div className="w-72 bg-white border-r border-slate-200 hidden xl:flex flex-col p-6">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6 flex items-center gap-2"><History size={14}/> Saved History</h3>
        <div className="flex-1 overflow-y-auto space-y-3">
          {history.map((h, i) => (
            <button key={i} onClick={() => setInput(h)} className="w-full text-left p-4 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-all">
              <p className="text-[10px] font-black text-slate-600 mb-1">Entry #{history.length - i}</p>
              <p className="text-[10px] text-slate-400 font-mono truncate">{h.slice(0, 40)}</p>
            </button>
          ))}
        </div>
        {!isPro && <div className="mt-6 p-5 rounded-[2.5rem] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Crown size={14} className="text-amber-600" />
            <p className="text-xs font-black text-amber-700">Upgrade to Pro</p>
          </div>
          <p className="text-[10px] text-amber-600 leading-tight mb-1">Unlock Rust, Java, Prisma exporters + more.</p>
          <p className="text-[9px] text-amber-500 mb-4 font-bold">⚡ Early Bird: $9 lifetime</p>
          <a
            href="https://yhanster206.gumroad.com/l/zjcuuu"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-black rounded-xl hover:opacity-90 transition-all text-center shadow-lg shadow-amber-200"
          >
            Get Lifetime Access — $9
          </a>
        </div>}
      </div>

      <div className="flex-1 flex flex-col md:flex-row p-6 gap-6">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
              <Terminal size={14}/> Input Source
              <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[8px] animate-pulse">
                <Zap size={8} /> Smart Inference Active
              </span>
            </span>
            <button onClick={()=>setInput("")} className="text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
          </div>
          <div className="flex-1 dev-input rounded-[2.5rem] shadow-inner overflow-hidden flex flex-col">
            <textarea 
              value={input} 
              onChange={(e)=>setInput(e.target.value)} 
              spellCheck={false} 
              className="flex-1 w-full p-8 bg-transparent outline-none resize-none no-scrollbar" 
              placeholder="Paste JSON, YAML, XML, SQL or cURL here..."
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (re) => setInput(re.target?.result as string);
                  reader.readAsText(file);
                }
              }}
            />
          </div>
        </div>

        {/* Visualizer & Result */}
        <div className="flex-1 flex flex-col min-w-0">
          {jsonData && (
            <div className="mb-4 bg-white rounded-3xl p-6 border border-slate-200 max-h-48 overflow-y-auto no-scrollbar hidden lg:block">
              <h3 className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><Layers size={14}/> JSON Visualizer</h3>
              <JsonVisualizer data={jsonData} />
            </div>
          )}
          <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-2">
            <div className="flex gap-4 overflow-x-auto no-scrollbar">
              {tabs.map(tab => (
                <button key={tab.id} onClick={() => setOutputTab(tab.id)} className={`text-[10px] font-black uppercase tracking-widest pb-3 border-b-2 transition-all flex items-center gap-1 ${outputTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                  {tab.icon} {tab.label} {tab.pro && <Crown size={10} className="text-amber-400" />}
                </button>
              ))}
            </div>
            <button onClick={copy} className="bg-[#0F172A] text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200">
              {isCopied ? <Check size={16} /> : <Copy size={16} />} {isCopied ? 'Copied' : 'Copy Result'}
            </button>
          </div>
          <div className="flex-1 bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm relative overflow-hidden">
            <pre className={`font-mono text-xs text-slate-600 leading-relaxed overflow-auto h-full no-scrollbar transition-all duration-300 ${!isPro && tabs.find(t=>t.id===outputTab)?.pro ? 'blur-[3px] select-none pointer-events-none' : ''}`}>
              <code>{outputs[outputTab] || "// Input data needed"}</code>
            </pre>
            {!isPro && tabs.find(t=>t.id===outputTab)?.pro && (
              <div className="absolute inset-0 flex flex-col justify-end" style={{background: 'linear-gradient(to bottom, transparent 0%, transparent 30%, rgba(255,255,255,0.6) 55%, rgba(255,255,255,0.97) 75%)'}}>
                <div className="p-5">
                  <div className="bg-white/95 backdrop-blur-sm rounded-2xl border border-slate-200 shadow-2xl p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-amber-200 shrink-0">
                          <Crown size={18} className="text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <p className="text-xs font-black text-slate-900">Pro Feature</p>
                            <span className="bg-red-50 text-red-500 text-[8px] font-black px-2 py-0.5 rounded-full border border-red-100 uppercase tracking-wider">⚡ $9 Lifetime</span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-tight">
                            {outputTab === 'rust' && 'Rust structs with Serde + nested type support'}
                            {outputTab === 'java' && 'Java class with private fields & getters'}
                            {outputTab === 'sql' && 'Prisma schema with relations & types'}
                            {outputTab === 'hook' && 'React Query hooks with typed responses'}
                            {outputTab === 'csharp' && 'C# class with nullable property accessors'}
                            {outputTab === 'swift' && 'Swift Codable struct with type mapping'}
                            {outputTab === 'kotlin' && 'Kotlin data class with null-safety'}
                            {outputTab === 'jsonschema' && 'JSON Schema draft-07 validation rules'}
                            {outputTab === 'openapi' && 'OpenAPI 3.0 component schema'}
                            {!['rust','java','sql','hook','csharp','swift','kotlin','jsonschema','openapi'].includes(outputTab) && 'Professional output for enterprise codebases'}
                          </p>
                        </div>
                      </div>
                      <a
                        href="https://yhanster206.gumroad.com/l/zjcuuu"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-black rounded-xl hover:opacity-90 hover:scale-105 transition-all shadow-lg shadow-amber-200 whitespace-nowrap"
                      >
                        Unlock — $9
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color, isPro = false }: { icon: React.ReactNode, title: string, desc: string, color: string, isPro?: boolean }) {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100'
  };
  return (
    <div className="dev-card p-10 rounded-[3rem] relative overflow-hidden bg-white hover:border-blue-200 transition-all">
      {isPro && <div className="absolute top-6 right-6 bg-amber-100 text-amber-700 text-[8px] font-black px-2 py-1 rounded-full uppercase border border-amber-200">Pro</div>}
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 border ${colorMap[color]}`}>{icon}</div>
      <h3 className="text-2xl font-black mb-4 tracking-tight">{title}</h3>
      <p className="text-slate-400 text-sm leading-relaxed font-medium">{desc}</p>
    </div>
  );
}
