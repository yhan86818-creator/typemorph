import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import GlobalFooter from '@/components/GlobalFooter';
import { BASE_URL } from '@/lib/seo';
import DriftCheckClient from './DriftCheckClient';

export const metadata: Metadata = {
  title: 'API Schema Drift Check — Detect Breaking Changes Without OpenAPI | TypeMorph',
  description:
    'Save an API response as a baseline, then compare future responses against it. Instantly detects breaking changes — type mismatches, removed fields, renamed keys. No spec file. Free.',
  alternates: { canonical: `${BASE_URL}/tools/api-drift-check` },
  openGraph: {
    title: 'API Schema Drift Check — no OpenAPI spec required',
    description:
      'Detect API breaking changes from live responses. Save a baseline, compare future responses. Free, runs in your browser.',
    url: `${BASE_URL}/tools/api-drift-check`,
    type: 'website',
  },
};

const CLI = `# First run — saves baseline
curl -s https://api.example.com/users/1 \\
  | npx typemorph-cli check --baseline .typemorph/users.json

# Subsequent runs — compares against baseline
curl -s https://api.example.com/users/1 \\
  | npx typemorph-cli check --baseline .typemorph/users.json

# GitHub Actions
- name: API Schema Drift Check
  run: |
    curl -s https://api.example.com/users/1 | \\
    npx typemorph-cli check \\
      --baseline .typemorph/users.json \\
      --format github >> $GITHUB_STEP_SUMMARY`;

const FAQ = [
  {
    q: 'What is API schema drift?',
    a: 'When an API response changes shape over time — a field is removed, a type changes from number to string, a key is renamed — that\'s drift. It often happens silently: the API still returns 200 OK, but your app breaks downstream.',
  },
  {
    q: 'Do I need an OpenAPI spec?',
    a: 'No. TypeMorph infers the schema directly from your JSON response. Paste any JSON and save it as a baseline — no spec file, no configuration.',
  },
  {
    q: 'Does my data get uploaded?',
    a: 'No. Everything runs in your browser. The baseline is saved to your browser\'s localStorage. No server, no API keys, no retention.',
  },
  {
    q: 'How is this different from the Environment Diff tool?',
    a: 'Environment Diff compares two responses side-by-side (staging vs prod). Drift Check is for monitoring a single endpoint over time — you save a baseline once and compare future responses against it.',
  },
  {
    q: 'Can I automate this in CI?',
    a: 'Yes — use typemorph-cli check. It exits with code 1 on breaking changes and supports --format github for PR comments. Commit your baseline files to Git so every CI run compares against the same reference.',
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

export default function ApiDriftCheckPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-32">
        <Link prefetch={false} href="/" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          ← TypeMorph
        </Link>

        <header className="mt-8 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-mono text-[9px] uppercase tracking-wider mb-6 border border-slate-200 dark:border-white/10">
            no spec required · runs in browser · free
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.05] mb-6">
            Your API changed.<br />Did you notice?
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Save a known-good API response as a baseline. Compare any future response against it.
            Instantly catch type changes, removed fields, and renamed keys —
            before they reach production. No OpenAPI spec. No config.
          </p>
        </header>

        <Section title="Try it — save a baseline, then check for drift">
          <DriftCheckClient />
        </Section>

        <Section title="The silent production killer">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
            Third-party APIs change without warning. Internal services drift between deploys.
            The response still returns 200 OK — but the shape quietly changed:
          </p>
          <ul className="space-y-2 mb-5">
            {[
              'userId changed from number to string after a database migration',
              'email was removed because the new endpoint uses a different user model',
              'created_at was renamed to createdAt in a "non-breaking" refactor',
              'a required field appeared that your older clients never send',
            ].map(p => (
              <li key={p} className="flex gap-3 text-slate-600 dark:text-slate-400">
                <span className="text-amber-500 shrink-0">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Every existing drift detection tool requires an OpenAPI spec. Most APIs — especially
            third-party ones — don&rsquo;t have one. TypeMorph infers the schema from the actual
            response, so you can monitor anything.
          </p>
        </Section>

        <Section title="Automate it in CI">
          <Code>{CLI}</Code>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-5">
            Commit your <code className="font-mono text-slate-700 dark:text-slate-300">.typemorph/</code> baseline
            files to Git. Every CI run compares the live API against the same reference point.
            Breaking changes fail the job before deployment.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://www.npmjs.com/package/typemorph-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-mono"
            >
              npx typemorph-cli@latest check
            </a>
            <Link
              prefetch={false}
              href="/tools/env-diff"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Compare two environments →
            </Link>
          </div>
        </Section>

        <Section title="FAQ">
          <div className="space-y-6">
            {FAQ.map(item => (
              <div key={item.q}>
                <h3 className="font-bold text-slate-900 dark:text-white mb-1.5">{item.q}</h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </Section>
      </main>
      <GlobalFooter />
    </div>
  );
}
