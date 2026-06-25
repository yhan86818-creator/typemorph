import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import GlobalFooter from '@/components/GlobalFooter';
import { BASE_URL } from '@/lib/seo';
import EnvDiffClient from './EnvDiffClient';

export const metadata: Metadata = {
  title: 'API Environment Diff — Compare Staging vs Production JSON Schema | TypeMorph',
  description:
    'Paste two API responses and instantly see schema differences — missing fields, type changes, renamed keys. No OpenAPI spec required. Free, runs in your browser.',
  alternates: { canonical: `${BASE_URL}/tools/env-diff` },
  openGraph: {
    title: 'API Environment Diff — staging vs prod schema comparison',
    description:
      'Detect breaking differences between two API environments. Paste JSON, get a diff. No spec file needed.',
    url: `${BASE_URL}/tools/env-diff`,
    type: 'website',
  },
};

const CLI = `# Compare staging vs production live
typemorph envdiff \\
  --a https://staging.api.com/users/1 \\
  --b https://prod.api.com/users/1

# File-based comparison
typemorph envdiff staging-response.json prod-response.json

# GitHub Actions PR comment
typemorph envdiff \\
  --a https://staging.api.com/users/1 \\
  --b https://prod.api.com/users/1 \\
  --format github >> $GITHUB_STEP_SUMMARY`;

const FAQ = [
  {
    q: 'Do my API responses get uploaded anywhere?',
    a: 'No. Comparison runs entirely in your browser — no server, no API keys, no retention. Your data never leaves your machine.',
  },
  {
    q: 'Do I need an OpenAPI spec?',
    a: 'No. TypeMorph infers the schema directly from your JSON responses. Paste any two JSON objects and get an instant diff.',
  },
  {
    q: 'What counts as a breaking change?',
    a: 'Required field removed, field type changed (e.g. number → string), or field renamed. New required fields added to B are also flagged.',
  },
  {
    q: 'Can I use this in CI?',
    a: 'Yes — use the typemorph-cli envdiff command. It exits with code 1 on breaking changes, making it CI-native.',
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

export default function EnvDiffPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0A0A0A]">
      <main className="max-w-3xl mx-auto px-6 pt-24 pb-32">
        <Link prefetch={false} href="/" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          ← TypeMorph
        </Link>

        {/* Hero */}
        <header className="mt-8 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white font-mono text-[9px] uppercase tracking-wider mb-6 border border-slate-200 dark:border-white/10">
            no spec required · runs in browser · free
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.05] mb-6">
            Is your staging API<br />breaking prod?
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            Paste two JSON responses — from staging and production, two API versions, or any two environments —
            and instantly see every schema difference. No OpenAPI spec. No config. No sign-up.
          </p>
        </header>

        {/* Interactive tool */}
        <Section title="Paste and compare">
          <EnvDiffClient />
        </Section>

        <Section title="The problem it solves">
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-5">
            You deploy to staging. Tests pass. You promote to production — and something breaks for real users.
            The reason is almost always a schema difference nobody noticed:
          </p>
          <ul className="space-y-2 mb-5">
            {[
              'staging returns userId as number, prod returns it as string',
              'a required field exists in prod but got removed in the new staging build',
              'a key was renamed between the old and new API version',
              'prod has an extra required field that staging omitted',
            ].map(p => (
              <li key={p} className="flex gap-3 text-slate-600 dark:text-slate-400">
                <span className="text-amber-500 shrink-0">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
            Every existing tool for this requires an OpenAPI spec. Most APIs — especially third-party ones — don&rsquo;t have one.
            TypeMorph infers the schema from the actual response, so you can compare anything.
          </p>
        </Section>

        <Section title="In CI — catch it before it ships">
          <Code>{CLI}</Code>
          <p className="text-slate-600 dark:text-slate-400 leading-relaxed mt-5">
            The CLI command exits with code&nbsp;1 on breaking changes. Wire it into your GitHub Actions pipeline and
            get a diff in your PR summary before the deployment ever reaches production.
          </p>
          <div className="mt-5">
            <a
              href="https://www.npmjs.com/package/typemorph-cli"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors font-mono"
            >
              npx typemorph-cli@latest envdiff
            </a>
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
