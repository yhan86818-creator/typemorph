'use client';
import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { runEngine } from '@/lib/engine';

const SAMPLE_JSON = `{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "alex@example.com",
  "website": "https://example.com",
  "age": 28,
  "role": "admin"
}`;

const QUICKTYPE_OUTPUT = `// quicktype · TypeScript
// Zod output: not supported

export interface Root {
    userID:  string;
    email:   string;
    website: string;
    age:     number;
    role:    string;
}`;

const HIGHLIGHTS: Record<string, string> = {
  'z.uuid()':          'text-emerald-400 font-bold',
  'z.email()':         'text-emerald-400 font-bold',
  'z.url()':           'text-emerald-400 font-bold',
  'z.enum':            'text-emerald-400 font-bold',
};

function highlight(line: string): React.ReactNode {
  for (const [token, cls] of Object.entries(HIGHLIGHTS)) {
    if (line.includes(token)) {
      const idx = line.indexOf(token);
      return (
        <>
          {line.slice(0, idx)}
          <span className={cls}>{line.slice(idx, idx + token.length)}</span>
          {line.slice(idx + token.length)}
        </>
      );
    }
  }
  return line;
}

function CodePanel({
  label,
  badge,
  code,
  variant,
}: {
  label: string;
  badge: string;
  code: string;
  variant: 'typemorph' | 'quicktype';
}) {
  const isTypemorph = variant === 'typemorph';
  return (
    <div className={`rounded-xl overflow-hidden border ${isTypemorph ? 'border-slate-700' : 'border-slate-200'}`}>
      <div className={`flex items-center gap-2 px-4 py-2.5 border-b ${isTypemorph ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'}`}>
        {isTypemorph
          ? <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          : <XCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
        }
        <span className={`text-xs font-black uppercase tracking-widest ${isTypemorph ? 'text-white' : 'text-slate-500'}`}>
          {label}
        </span>
        <span className={`ml-auto text-[10px] font-mono ${isTypemorph ? 'text-slate-400' : 'text-slate-400'}`}>
          {badge}
        </span>
      </div>
      <pre className="bg-slate-950 p-5 text-[11px] font-mono leading-relaxed overflow-x-auto min-h-[220px]">
        {code.split('\n').map((line, i) => (
          <div key={i} className={line.startsWith('// Zod output: not supported') ? 'text-red-400' : 'text-slate-300'}>
            {isTypemorph ? highlight(line) : line}
          </div>
        ))}
      </pre>
    </div>
  );
}

export function AlternativeZodDemo() {
  const [zodOutput, setZodOutput] = useState('');

  useEffect(() => {
    try {
      const parsed = JSON.parse(SAMPLE_JSON);
      setZodOutput(runEngine(parsed, 'zod', '', {}));
    } catch {
      setZodOutput('// Failed to load');
    }
  }, []);

  return (
    <section className="mb-14">
      <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
        Live comparison — JSON to Zod
      </h2>
      <p className="text-slate-600 mb-2 leading-relaxed">
        Same JSON input, different results. TypeMorph infers semantic Zod validators from field names and values.
        quicktype does not support Zod output.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-xs text-amber-800 font-medium mb-6 inline-flex items-center gap-2">
        <span>Input JSON</span>
        <code className="font-mono bg-amber-100 px-1.5 py-0.5 rounded text-[11px]">user_id · email · website · age · role</code>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <CodePanel
          label="quicktype"
          badge="TypeScript · no Zod"
          code={QUICKTYPE_OUTPUT}
          variant="quicktype"
        />
        <CodePanel
          label="TypeMorph"
          badge="Zod · live output"
          code={zodOutput || '// Generating...'}
          variant="typemorph"
        />
      </div>

      <div className="mt-4 grid md:grid-cols-3 gap-3">
        {[
          { field: 'email', ours: 'z.email()', theirs: 'string' },
          { field: 'website', ours: 'z.url()', theirs: 'string' },
          { field: 'user_id', ours: 'z.uuid()', theirs: 'string' },
        ].map(({ field, ours, theirs }) => (
          <div key={field} className="rounded-lg border border-slate-200 bg-white p-3 text-[11px] font-mono">
            <p className="text-slate-400 mb-2 font-sans text-[10px] font-bold uppercase tracking-widest">{field}</p>
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-3 h-3 text-slate-300 flex-shrink-0" />
              <span className="text-slate-400 line-through">{theirs}</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-3 h-3 text-emerald-500 flex-shrink-0" />
              <span className="text-emerald-600 font-bold">{ours}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
