'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, Braces, Sparkles } from 'lucide-react';

export function VisualDemo() {
  const [step, setStep] = useState(0);

  const jsonCode = `{
  "user_id": "u_9421",
  "metadata": {
    "tags": ["beta", "priority"],
    "last_login": "2024-05-20T10:00Z"
  },
  "permissions": [
    {"scope": "read", "exp": 3600}
  ]
}`;

  const outputCode = `import { z } from "zod";

export const rootMetadataSchema = z.object({
  tags: z.array(z.string()),
  last_login: z.string().datetime(),
});

export const rootPermissionSchema = z.object({
  scope: z.enum(["read"]),
  exp: z.number(),
});

export const rootSchema = z.object({
  user_id: z.string(),
  metadata: rootMetadataSchema,
  permissions: z.array(rootPermissionSchema),
});`;

  useEffect(() => {
    const timer = setInterval(() => {
      setStep((s) => (s + 1) % 3);
    }, 4500);
    return () => clearInterval(timer);
  }, []);

  const logs = [
    "PARSING RAW SCHEMA...",
    "INFERRING TYPES...",
    "SYNTHESIZING ZOD...",
    "GENERATING HOOKS..."
  ];

  return (
    <div className="w-full max-w-4xl mx-auto mt-16 mb-24 relative px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[420px]">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center px-4 py-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
              <Braces size={12} /> Complex API Payload
            </span>
          </div>
          <div className="flex-1 bg-white dark:bg-[#111] rounded-[2rem] border border-slate-200 dark:border-white/10 p-6 shadow-sm overflow-hidden relative">
            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.pre key="json" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-pre">
                  {jsonCode}
                </motion.pre>
              </AnimatePresence>
            </div>
            {step === 1 && (
              <motion.div
                initial={{ top: '-10%' }}
                animate={{ top: '110%' }}
                transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                className="absolute left-0 right-0 h-16 bg-slate-900/5 dark:bg-white/5 border-t border-slate-900/10 dark:border-white/10 z-10 pointer-events-none"
              />
            )}
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2 relative">
          <div className="flex items-center justify-between px-4 py-1">
            <span className="text-[10px] font-black uppercase text-slate-900 dark:text-white tracking-[0.2em] flex items-center gap-2">
              <Sparkles size={12} /> TypeMorph Synthesis
            </span>
            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2">
                <span className="text-[9px] font-black bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white px-2 py-0.5 rounded border border-slate-200 dark:border-white/10">READY</span>
              </motion.div>
            )}
          </div>

          <div className="flex-1 bg-[#0A0A0A] dark:bg-[#0A0A0A] rounded-[2rem] border border-slate-800 p-6 shadow-sm overflow-hidden relative">
            <AnimatePresence mode="wait">
              {step === 2 ? (
                <motion.div key="output" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-full">
                  <pre className="font-mono text-[10px] text-slate-300 leading-normal">
                    <code className="block whitespace-pre">{outputCode}</code>
                  </pre>
                </motion.div>
              ) : step === 1 ? (
                <motion.div key="processing" className="h-full flex flex-col justify-center gap-3 px-4">
                  {logs.map((log, i) => (
                    <motion.div
                      key={log}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.4 }}
                      className="flex items-center gap-3 text-[10px] font-mono text-slate-500"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      {log}
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
                  <Zap size={40} className="text-slate-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Waiting for Data...</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Connector */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block z-20">
          <motion.div
            animate={{ scale: step === 1 ? [1, 1.2, 1] : 1, rotate: step === 1 ? 180 : 0 }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-colors duration-500 ${step === 1 ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-white dark:bg-[#1A1A1A] text-slate-400 border border-slate-200 dark:border-white/10'}`}
          >
            {step === 1 ? <Zap size={20} /> : <ArrowRight size={20} />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
