'use client';
import React, { useState, useCallback } from 'react';
import { generateSampleJson } from '@/lib/reverse';

interface Props {
  tsSeed?: string;
  isDark: boolean;
}

const PLACEHOLDER = `interface User {
  user_id: string;
  name: string;
  email: string;
  age: number;
  is_active: boolean;
  created_at: string;
  address: Address;
}

interface Address {
  street: string;
  city: string;
  country: string;
}`;

export default function ReverseView({ tsSeed, isDark }: Props) {
  const [tsInput, setTsInput] = useState(tsSeed ?? '');
  const [result, setResult] = useState<{ json: string; error?: string } | null>(
    tsSeed ? generateSampleJson(tsSeed) : null
  );
  const [copied, setCopied] = useState(false);

  const handleChange = useCallback((value: string) => {
    setTsInput(value);
    if (!value.trim()) { setResult(null); return; }
    setResult(generateSampleJson(value));
  }, []);

  const copy = useCallback(() => {
    if (!result?.json) return;
    navigator.clipboard.writeText(result.json);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [result]);

  const textareaClass =
    'flex-1 min-h-[380px] w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-[12px] font-mono text-slate-800 dark:text-slate-200 p-3 resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 dark:focus:ring-slate-500 placeholder:text-slate-300 dark:placeholder:text-slate-600';

  return (
    <div className="w-full min-h-full flex flex-col px-6 py-6 gap-6 bg-white dark:bg-[#0A0A0A]">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300 text-[10px] font-mono uppercase tracking-widest font-bold mb-3 border border-slate-200 dark:border-white/10">
          Reverse Mode
        </div>
        <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white mb-1">
          Interface → JSON Sample
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Paste TypeScript interfaces. TypeMorph instantly generates a representative JSON sample.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
            TypeScript Interfaces
          </label>
          <textarea
            value={tsInput}
            onChange={e => handleChange(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            className={textareaClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">
              JSON Sample
            </label>
            {result?.json && (
              <button
                onClick={copy}
                className="text-[10px] font-mono font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            )}
          </div>

          {result?.error ? (
            <div className="flex-1 min-h-[380px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 text-[12px] font-mono text-slate-400 dark:text-slate-500 whitespace-pre overflow-auto">
              {result.error}
            </div>
          ) : (
            <pre className="flex-1 min-h-[380px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 text-[12px] font-mono text-slate-800 dark:text-slate-200 overflow-auto">
              {result?.json || (
                <span className="text-slate-300 dark:text-slate-600">
                  {'// JSON sample will appear here'}
                </span>
              )}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
