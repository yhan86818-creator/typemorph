'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Braces, Sparkles, ChevronRight, RotateCcw } from 'lucide-react';
import { runEngine, inferSchema } from '@/lib/engine';

const DEFAULT_JSON = `{
  "user_id": "u-9f82d1a3",
  "email": "alex@devflow.io",
  "status": "active",
  "role": "admin",
  "profile": {
    "name": "Alex Mercer",
    "avatar_url": "https://api.dicebear.com/svg",
    "created_at": "2026-01-15T09:00:00Z"
  },
  "permissions": [
    { "scope": "read", "level": 1 },
    { "scope": "write", "level": 2 }
  ]
}`;

const SAMPLE_PRESETS = [
  { label: 'User API', json: DEFAULT_JSON },
  {
    label: 'Order',
    json: `{
  "order_id": "ord_8821",
  "status": "shipped",
  "amount_usd": 149.99,
  "currency": "USD",
  "customer": {
    "email": "jane@example.com",
    "name": "Jane Smith"
  },
  "items": [
    { "sku": "PRD-001", "qty": 2, "price": 74.99 }
  ]
}`,
  },
  {
    label: 'Config',
    json: `{
  "env": "production",
  "debug": false,
  "database": {
    "host": "db.example.com",
    "port": 5432,
    "name": "app_db"
  },
  "rate_limit": 1000,
  "allowed_origins": ["https://app.example.com"]
}`,
  },
];

const OUTPUT_TABS = [
  { id: 'typescript', label: 'TypeScript' },
  { id: 'zod', label: 'Zod' },
  { id: 'rust', label: 'Rust' },
  { id: 'go', label: 'Go' },
];

const LOG_STEPS = [
  'Parsing schema structure...',
  'Inferring types & formats...',
  'Detecting enums & unions...',
  'Extracting shared types...',
];

function tokenizeCode(code: string, lang: string): React.ReactNode[] {
  // Simple syntax highlighting via regex spans
  const lines = code.split('\n');
  const keywords: Record<string, RegExp> = {
    typescript: /\b(export|interface|type|string|number|boolean|null|undefined|enum|const|import|from|Date)\b/g,
    zod: /\b(import|from|export|const|z)\b|\.(?:object|string|number|boolean|array|enum|optional|datetime|url|email|uuid)\b/g,
    rust: /\b(pub|struct|enum|use|impl|String|bool|i64|f64|Vec|Option|serde|Serialize|Deserialize)\b/g,
    go: /\b(type|struct|string|int64|float64|bool|json)\b/g,
  };
  const stringRe = /("(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)/g;
  const commentRe = /(\/\/[^\n]*|#[^\n]*)/g;

  return lines.map((line, li) => {
    // Colour comments
    const commentMatch = commentRe.exec(line);
    commentRe.lastIndex = 0;
    if (commentMatch) {
      const pre = line.slice(0, commentMatch.index);
      return (
        <div key={li}>
          <span>{pre}</span>
          <span className="text-slate-500 dark:text-slate-500">{commentMatch[0]}</span>
          {'\n'}
        </div>
      );
    }

    // Tokenise keywords and strings
    const kw = keywords[lang] || keywords.typescript;
    kw.lastIndex = 0;
    stringRe.lastIndex = 0;

    // Build a list of coloured segments
    interface Seg { start: number; end: number; cls: string; }
    const segs: Seg[] = [];
    let m: RegExpExecArray | null;
    while ((m = kw.exec(line)) !== null) segs.push({ start: m.index, end: m.index + m[0].length, cls: 'text-indigo-400 dark:text-indigo-400 font-semibold' });
    while ((m = stringRe.exec(line)) !== null) segs.push({ start: m.index, end: m.index + m[0].length, cls: 'text-emerald-400 dark:text-emerald-400' });
    segs.sort((a, b) => a.start - b.start);

    const parts: React.ReactNode[] = [];
    let pos = 0;
    for (const seg of segs) {
      if (seg.start < pos) continue; // overlap guard
      if (seg.start > pos) parts.push(line.slice(pos, seg.start));
      parts.push(<span key={seg.start} className={seg.cls}>{line.slice(seg.start, seg.end)}</span>);
      pos = seg.end;
    }
    if (pos < line.length) parts.push(line.slice(pos));
    return <div key={li}>{...parts}{'\n'}</div>;
  });
}

export function VisualDemo() {
  const [inputJson, setInputJson] = useState(DEFAULT_JSON);
  const [activeTab, setActiveTab] = useState('zod');
  const [outputs, setOutputs] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [logStep, setLogStep] = useState(-1);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runConversion = useCallback((json: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (logTimerRef.current) clearInterval(logTimerRef.current);

    if (!json.trim()) {
      setOutputs({});
      setError('');
      return;
    }

    timerRef.current = setTimeout(() => {
      try {
        const parsed = JSON.parse(json);
        setError('');
        setIsProcessing(true);
        setLogStep(0);

        // Animate log steps
        let step = 0;
        logTimerRef.current = setInterval(() => {
          step++;
          if (step >= LOG_STEPS.length) {
            if (logTimerRef.current) clearInterval(logTimerRef.current);
            // Generate outputs
            const result: Record<string, string> = {};
            for (const tab of OUTPUT_TABS) {
              try {
                result[tab.id] = runEngine(parsed, tab.id, '', {});
              } catch {
                result[tab.id] = `// Generation failed for ${tab.id}`;
              }
            }
            setOutputs(result);
            setIsProcessing(false);
            setLogStep(-1);
          } else {
            setLogStep(step);
          }
        }, 280);
      } catch {
        setError('Invalid JSON — try editing the input');
        setOutputs({});
        setIsProcessing(false);
        setLogStep(-1);
      }
    }, 400);
  }, []);

  // Initial run on mount
  useEffect(() => {
    runConversion(DEFAULT_JSON);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputJson(val);
    setHasInteracted(true);
    runConversion(val);
  };

  const handlePreset = (json: string) => {
    setInputJson(json);
    setHasInteracted(true);
    runConversion(json);
  };

  const activeOutput = outputs[activeTab] || '';

  return (
    <div className="w-full max-w-5xl mx-auto mt-16 mb-24 relative px-4">

      {/* Preset chips */}
      <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
        {SAMPLE_PRESETS.map((p) => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.json)}
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
              inputJson === p.json
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-slate-400 dark:hover:border-white/30 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
        {hasInteracted && (
          <button
            onClick={() => handlePreset(DEFAULT_JSON)}
            className="flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-slate-200 dark:border-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
          >
            <RotateCcw size={10} /> Reset
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[480px] relative">

        {/* ── Input Panel ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
              <Braces size={11} /> Input Schema
            </span>
            {error && (
              <span className="text-[9px] font-mono text-red-400 truncate max-w-[160px]">{error}</span>
            )}
          </div>
          <div className={`flex-1 relative rounded-2xl border transition-all duration-200 overflow-hidden ${error ? 'border-red-300 dark:border-red-900' : 'border-slate-200 dark:border-white/10'} bg-white dark:bg-[#111]`}>
            <textarea
              value={inputJson}
              onChange={handleInput}
              spellCheck={false}
              className="w-full h-full min-h-[380px] font-mono text-[11px] text-slate-700 dark:text-slate-300 bg-transparent resize-none outline-none p-6 leading-relaxed custom-scrollbar"
              placeholder="Paste any JSON here..."
            />
            {/* scan line animation while processing */}
            {isProcessing && (
              <motion.div
                initial={{ top: '-8%' }}
                animate={{ top: '108%' }}
                transition={{ duration: 1.1, ease: 'linear', repeat: Infinity }}
                className="absolute left-0 right-0 h-10 pointer-events-none z-10"
                style={{
                  background: 'linear-gradient(to bottom, transparent, rgba(99,102,241,0.06), transparent)',
                  borderTop: '1px solid rgba(99,102,241,0.15)',
                }}
              />
            )}
          </div>
        </div>

        {/* ── Connector ── */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:flex z-20">
          <motion.div
            animate={{
              scale: isProcessing ? [1, 1.15, 1] : 1,
              rotate: isProcessing ? [0, 180, 360] : 0,
            }}
            transition={{ duration: 1.1, repeat: isProcessing ? Infinity : 0, ease: 'linear' }}
            className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-300 ${
              isProcessing
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-[#1A1A1A] text-slate-400 border border-slate-200 dark:border-white/10'
            }`}
          >
            {isProcessing ? <Zap size={18} /> : <ChevronRight size={18} />}
          </motion.div>
        </div>

        {/* ── Output Panel ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-[0.2em] flex items-center gap-2">
              <Sparkles size={11} /> TypeMorph Output
            </span>
            {/* Output tab switcher */}
            <div className="flex items-center gap-1">
              {OUTPUT_TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                    activeTab === t.id
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 bg-[#0A0A0A] rounded-2xl border border-slate-800 overflow-hidden relative min-h-[380px]">
            <AnimatePresence mode="wait">
              {isProcessing ? (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col justify-center gap-3 px-8 py-10 min-h-[380px]"
                >
                  {LOG_STEPS.map((log, i) => (
                    <motion.div
                      key={log}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: logStep >= i ? 1 : 0.2, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center gap-3 text-[10px] font-mono"
                    >
                      <div className={`w-1.5 h-1.5 rounded-full transition-colors ${logStep > i ? 'bg-indigo-400' : logStep === i ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`} />
                      <span className={logStep >= i ? 'text-slate-300' : 'text-slate-600'}>{log}</span>
                    </motion.div>
                  ))}
                </motion.div>
              ) : activeOutput ? (
                <motion.div
                  key={activeTab + activeOutput.slice(0, 20)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="h-full overflow-auto custom-scrollbar p-6 min-h-[380px]"
                >
                  <pre className="font-mono text-[10.5px] leading-relaxed text-slate-300 whitespace-pre">
                    <code>{tokenizeCode(activeOutput, activeTab)}</code>
                  </pre>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-3 opacity-20 min-h-[380px]">
                  <Zap size={32} className="text-slate-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                    Paste JSON to begin
                  </span>
                </div>
              )}
            </AnimatePresence>

            {/* READY badge */}
            {!isProcessing && activeOutput && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute top-4 right-4 text-[8px] font-black bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 px-2 py-0.5 rounded uppercase tracking-wider"
              >
                Ready
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mt-4 font-mono">
        ↑ Edit the JSON above — output updates in real time, 100% in your browser
      </p>
    </div>
  );
}
