'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal, Code2, ArrowRight, Zap, CheckCircle2, Braces, Sparkles } from 'lucide-react';

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

  const outputCode = `// ✨ Type-Safe Zod Schemas Generated Instantly
import { z } from "zod";

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
    }, 4500); // Slightly longer to appreciate the output
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
      {/* Background decoration */}
      <div className="absolute inset-0 bg-blue-600/[0.02] blur-[100px] -z-10" />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 min-h-[420px]">
        {/* Input Side: The "Messy" Reality */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-4 py-1">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
              <Braces size={12} className="text-slate-400" /> Complex API Payload
            </span>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-2xl overflow-hidden relative group">
            <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.pre
                  key="json"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="whitespace-pre"
                >
                  {jsonCode}
                </motion.pre>
              </AnimatePresence>
            </div>
            
            {/* Scanning Effect */}
            {step === 1 && (
              <motion.div 
                initial={{ top: '-10%' }}
                animate={{ top: '110%' }}
                transition={{ duration: 2, ease: "linear", repeat: Infinity }}
                className="absolute left-0 right-0 h-16 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent border-t border-blue-500/30 z-10 pointer-events-none"
              />
            )}
          </div>
        </div>

        {/* Output Side: The "Magic" Solution */}
        <div className="flex flex-col gap-2 relative">
          <div className="flex items-center justify-between px-4 py-1">
            <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-[0.2em] flex items-center gap-2">
              <Sparkles size={12} /> TypeMorph Synthesis
            </span>
            {step === 2 && (
              <motion.div 
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
              >
                <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">READY TO DROP</span>
              </motion.div>
            )}
          </div>
          
          <div className="flex-1 bg-slate-950 rounded-[2rem] border border-slate-800 p-6 shadow-2xl overflow-hidden relative">
            <AnimatePresence mode="wait">
              {step === 2 ? (
                <motion.div
                  key="output"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="h-full"
                >
                  <pre className="font-mono text-[10px] text-blue-400/90 leading-normal">
                    <code className="block whitespace-pre">
                      {outputCode}
                    </code>
                  </pre>
                </motion.div>
              ) : step === 1 ? (
                <motion.div 
                  key="processing"
                  className="h-full flex flex-col justify-center gap-3 px-4"
                >
                  {logs.map((log, i) => (
                    <motion.div
                      key={log}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.4 }}
                      className="flex items-center gap-3 text-[10px] font-mono text-blue-500/60"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      {log}
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
                  <Zap size={40} className="text-blue-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Waiting for Data...</span>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Connector */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 hidden md:block z-20">
          <motion.div 
            animate={{ 
              scale: step === 1 ? [1, 1.2, 1] : 1,
              rotate: step === 1 ? 180 : 0 
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl transition-colors duration-500 ${step === 1 ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-400'}`}
          >
            {step === 1 ? <Zap size={20} className="animate-pulse" /> : <ArrowRight size={20} />}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
