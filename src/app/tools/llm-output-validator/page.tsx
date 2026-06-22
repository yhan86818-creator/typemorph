import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import GlobalFooter from '@/components/GlobalFooter';
import { BASE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'LLM Output Validator — Validate OpenAI / Claude / Gemini JSON with Zod | TypeMorph',
  description:
    "Validate LLM structured output against a Zod schema, or infer one from a few good responses. Catch model-upgrade drift — missing fields, wrong types, extra keys — before production. 100% local, no API keys, your data never leaves your machine.",
  alternates: { canonical: `${BASE_URL}/tools/llm-output-validator` },
  openGraph: {
    title: 'LLM Output Validator — catch JSON drift before prod',
    description:
      'Validate OpenAI / Claude / Gemini structured output against a Zod schema, or infer one from good responses. 100% local.',
    url: `${BASE_URL}/tools/llm-output-validator`,
    type: 'website',
  },
};

const REPORT = `  ✓ 8 passed   ✗ 2 failed   of 10

  ✗ output #3
      "confidence": expected number, got string ("0.92")
      → model returned a quoted number — use z.coerce.number()
  ✗ output #7
      missing required field "sources" (expected string[])
      ⚠ unexpected field "reasoning" appeared

  wrong type ×1 · missing field ×1 · extra field ×1`;

const CLI = `# Validate logged outputs against your schema
typemorph validate schema.ts responses.jsonl

# Bootstrap a schema from known-good responses
typemorph validate --infer good-responses.jsonl --out schema.ts

# In CI — advisory PR comment, fails the job if outputs drift
typemorph validate schema.ts fixtures/llm-outputs.jsonl --format github`;

const PROBLEMS = [
  'a number comes back as "0.9" — a string',
  'a required field goes missing in 2 of every 10 responses',
  "a new enum value appears that your parser doesn't handle",
  'the model adds an extra field you never asked for',
];

const FAQ = [
  {
    q: 'Does my data get uploaded?',
    a: 'No. Validation runs locally — in your browser or your CI runner. No server, no API keys, no retention.',
  },
  {
    q: 'Is this a production validator?',
    a: "It's structural and advisory. Use it to catch drift fast and to scaffold the Zod schema you then own and refine — not as a gate you blindly trust.",
  },
  {
    q: 'Which providers does it work with?',
    a: 'Any that return JSON — OpenAI structured outputs, Anthropic tool use, Vercel AI generateObject, MCP tools, or raw responses.',
  },
  {
    q: 'Is it free?',
    a: 'The web validator and the `typemorph validate` CLI are free. Batch/folder mode, saved schema libraries, and CI history are Pro.',
  },
];

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] p-5 text-[12.5px] leading-relaxed font-mono text-slate-700 dark:text-slate-300">
      {children}
    </pre>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16">
      <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-5">{title}</h2>
      {children}
    </section>
  );
}

export default function LlmOutputValidatorPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-32">
        <Link prefetch={false} href="/" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          ← TypeMorph
        </Link>

        {/* Hero */}
        <header className="mt-8 mb-20">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-mono text-[9px] uppercase tracking-wider mb-6 border border-slate-200 dark:border-white/10">
            local-first · no api keys · zero retention
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.05] mb-6">
            Your LLM&rsquo;s JSON output will drift.<br />Catch it before prod.
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed mb-8">
            Validate OpenAI / Claude / Gemini structured output against a Zod schema — or infer one from a few good
            responses. 100% local. No API keys. Your data never leaves your machine.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              prefetch={false}
              href="/?app=validate"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-80 transition-opacity"
            >
              Open the validator →
            </Link>
            <a
              href="https://www.npmjs.com/package/typemorph-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-mono"
            >
              npm i -g typemorph-cli
            </a>
          </div>
        </header>

        <Section title="The drift nobody notices">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
            You ship a feature on top of <code className="font-mono text-slate-800 dark:text-slate-200">response_format: json_schema</code> or
            tool calls. It works. Then you bump the model — gpt-4o → gpt-5, Claude Sonnet 4.5 → 4.6 — and the JSON quietly
            changes shape:
          </p>
          <ul className="space-y-2 mb-5">
            {PROBLEMS.map((p) => (
              <li key={p} className="flex gap-3 text-slate-600 dark:text-slate-400">
                <span className="text-amber-500 shrink-0">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Your <code className="font-mono text-slate-800 dark:text-slate-200">JSON.parse</code> succeeds. Your app breaks
            downstream. Nobody noticed.
          </p>
        </Section>

        <Section title="Paste your outputs. Get a per-record report.">
          <Code>{REPORT}</Code>
          <ul className="space-y-3 mt-6 text-slate-600 dark:text-slate-400">
            <li><strong className="text-slate-800 dark:text-slate-200">No schema yet?</strong> Click <em>Infer schema</em> — TypeMorph builds a Zod schema from your known-good responses.</li>
            <li><strong className="text-slate-800 dark:text-slate-200">Human-readable diagnosis</strong>, not a cryptic stack trace — with a suggested fix.</li>
            <li><strong className="text-slate-800 dark:text-slate-200">Batch / drift mode:</strong> feed a <code className="font-mono">.jsonl</code> of logged outputs and see exactly how many drifted, and why.</li>
          </ul>
        </Section>

        <Section title="In your code, or your CI">
          <Code>{CLI}</Code>
        </Section>

        <Section title="Why local matters here">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            LLM outputs often contain your users&rsquo; data — prompts, PII, proprietary content. Most online
            &ldquo;validators&rdquo; upload it to a server. TypeMorph runs entirely in your browser tab, or in your own CI
            runner. No upload. No API key. No retention. Nothing to leak.
          </p>
        </Section>

        <Section title="Honest limits">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            TypeMorph validates structure: types, required fields, nulls, shapes — and flags enum/format drift as warnings
            (it never hard-fails an unknown value). It&rsquo;s a fast safety net and a great starting point, not a
            replacement for the real Zod schema you own. Inference from samples can&rsquo;t know every valid value, so treat
            it as advisory: a signal in your PR, not a gate you blindly trust.
          </p>
        </Section>

        <Section title="FAQ">
          <div className="space-y-6">
            {FAQ.map((item) => (
              <div key={item.q}>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1.5">{item.q}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </Section>

        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200 dark:border-white/10">
          <Link
            prefetch={false}
            href="/?app=validate"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-80 transition-opacity"
          >
            Open the validator →
          </Link>
        </div>
      </main>
      <GlobalFooter />
    </div>
  );
}
