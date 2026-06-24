'use client';
import React, { useState, useEffect, useRef } from 'react';
import GlobalFooter from '@/components/GlobalFooter';

interface LandingViewProps {
  onSelect: (slug: string) => void;
}

const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "'DM Sans', ui-sans-serif, system-ui, -apple-system, sans-serif";

// Cycling output demo — same input, six real TypeMorph targets.
// Zod uses v4 syntax (z.email / z.iso.datetime) — the format-inference moat, made visible.
const OUTPUTS = [
  { lang: 'TypeScript', ext: '.ts', code: `export interface User {\n  id:         string;\n  email:      string;\n  createdAt:  string;\n}` },
  { lang: 'Zod', ext: '.ts', code: `const UserSchema = z.object({\n  id:        z.uuid(),\n  email:     z.email(),\n  createdAt: z.iso.datetime(),\n});\n\ntype User = z.infer<typeof UserSchema>;` },
  { lang: 'Go', ext: '.go', code: `type User struct {\n\tID        string \`json:"id"\`\n\tEmail     string \`json:"email"\`\n\tCreatedAt string \`json:"createdAt"\`\n}` },
  { lang: 'Rust', ext: '.rs', code: `#[derive(Serialize, Deserialize)]\npub struct User {\n    pub id:         String,\n    pub email:      String,\n    pub created_at: String,\n}` },
  { lang: 'Prisma', ext: '.prisma', code: `model User {\n  id        String   @id @default(uuid())\n  email     String   @unique\n  createdAt DateTime @default(now())\n}` },
  { lang: 'Python', ext: '.py', code: `class User(BaseModel):\n    id:         UUID\n    email:      EmailStr\n    created_at: datetime` },
];

// Real JSON with real values — so the format inference (uuid/email/datetime) is honest, not a JSON-Schema guess.
const INPUT_TEXT = `{\n  "id": "8f14e45f-ceea-467a-9a3b-1c2d3e4f5a6b",\n  "email": "ada@example.com",\n  "createdAt": "2026-03-04T10:15:30Z"\n}`;

const FEATURES = [
  { mark: '160+', mono: true, title: 'Output Formats', body: 'TypeScript, Zod, Go, Rust, Python, Java, Kotlin, Swift, C#, GraphQL, Prisma, Protobuf, SQL, Mermaid — and 148 more.' },
  { mark: 'A+', mono: false, title: 'Schema Quality Score', body: 'A–F grading with field-level feedback. Know exactly where your schema needs work before it ships.' },
  { mark: 'v1→v2', mono: true, title: 'Breaking Change Detector', body: 'Semantic diff between schema versions with severity scoring. Never ship a silent breaking change.' },
  { mark: '⌃⇧T', mono: true, title: 'VS Code Extension', body: 'Convert schemas without leaving your editor. Ctrl+Shift+T to transform. Right-click to check quality.' },
  { mark: '$ npm', mono: true, title: 'CLI', body: 'typemorph-cli on npm. Integrate schema conversion into any CI pipeline or build script in seconds.' },
  { mark: '0 kb↑', mono: true, title: '100% Local', body: 'Your schema never leaves your machine. No servers, no accounts, no upload endpoints. Ever.' },
];

const STEPS = [
  { n: '01', title: 'Paste your schema', body: 'JSON, YAML, OpenAPI, SQL, or TypeScript — paste it directly in.', code: `{\n  "id": "8f14e45f-...",\n  "email": "ada@example.com",\n  "createdAt": "2026-03-04T..."\n}` },
  { n: '02', title: 'Parsed to AST', body: 'inferSchema() builds a language-agnostic AST — formats and all.', code: `SchemaAST {\n  fields: [\n    { name: "id",\n      format: "uuid" },\n    { name: "email",\n      format: "email" }\n  ]\n}` },
  { n: '03', title: 'Generate any format', body: 'Select a target. The generator turns the AST to production-ready code.', code: `export interface User {\n  id:        string;\n  email:     string;\n  createdAt: string;\n}\n\n// Zod · Go · Rust · +155` },
];

export function LandingView({ onSelect }: LandingViewProps) {
  const [typed, setTyped] = useState('');
  const [outputIdx, setOutputIdx] = useState(1); // start on Zod — the format-inference moat shows first
  const [fade, setFade] = useState(false);

  // Typewriter for the input pane (runs once).
  useEffect(() => {
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      if (i >= INPUT_TEXT.length) return;
      i += 1;
      setTyped(INPUT_TEXT.slice(0, i));
      const ch = INPUT_TEXT[i - 1];
      timer = setTimeout(tick, ch === '\n' ? 50 : Math.random() * 22 + 18);
    };
    timer = setTimeout(tick, 700);
    return () => clearTimeout(timer);
  }, []);

  // Cycle the output target with a soft fade.
  useEffect(() => {
    const id = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setOutputIdx((p) => (p + 1) % OUTPUTS.length);
        setFade(false);
      }, 260);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  const out = OUTPUTS[outputIdx];
  const openApp = () => onSelect('json-to-typescript');

  return (
    <div className="min-h-full" style={{ background: '#0d1117', color: '#fff', fontFamily: SANS }}>
      <div className="max-w-[1180px] mx-auto px-6 md:px-12">

        {/* HERO */}
        <section className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14 pt-16 pb-20">
          {/* Left copy */}
          <div className="w-full lg:w-[420px] lg:flex-shrink-0">
            <div className="flex items-center gap-2 mb-7">
              <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
              <span style={{ fontFamily: MONO, color: '#8b949e' }} className="text-xs tracking-wide">
                local-first · zero data retention
              </span>
            </div>
            <h1 className="font-bold leading-[1.08] tracking-tight mb-5 text-[44px] md:text-[54px]" style={{ textWrap: 'balance' } as React.CSSProperties}>
              Paste any schema.<br />Get 160+ formats.
            </h1>
            <p className="text-[16px] leading-[1.7] mb-10 max-w-[390px]" style={{ color: '#8b949e' }}>
              The schema workbench that runs entirely in your browser. It reads your real JSON —
              detecting emails, UUIDs, and dates — and emits Zod, TypeScript, Go, Rust, Prisma,
              and 155 more.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <button
                onClick={openApp}
                className="text-sm font-semibold px-6 py-3 rounded-md bg-white text-black hover:opacity-90 transition-opacity"
              >
                Open the workbench →
              </button>
              <span style={{ fontFamily: MONO, color: '#8b949e' }} className="text-[13px] select-all">
                npm i -g typemorph-cli
              </span>
            </div>
          </div>

          {/* Right: animated editor */}
          <div
            className="w-full lg:flex-1 min-w-0 rounded-[10px] overflow-hidden"
            style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
          >
            {/* title bar */}
            <div className="flex items-center h-[42px] px-3.5" style={{ background: '#0d1117', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex gap-1.5 mr-3.5">
                <span className="w-[11px] h-[11px] rounded-full" style={{ background: '#ff5f57' }} />
                <span className="w-[11px] h-[11px] rounded-full" style={{ background: '#febc2e' }} />
                <span className="w-[11px] h-[11px] rounded-full" style={{ background: '#28c840' }} />
              </div>
              <div className="flex items-stretch h-full" style={{ fontFamily: MONO }}>
                <div className="flex items-center px-4 text-xs" style={{ color: '#8b949e', borderRight: '1px solid rgba(255,255,255,0.07)' }}>input.json</div>
                <div className="flex items-center gap-2 px-4 text-xs" style={{ color: '#e6edf3', background: 'rgba(255,255,255,0.03)', borderRight: '1px solid rgba(255,255,255,0.07)' }}>
                  <span style={{ color: '#6e7681', fontSize: 10 }}>→</span>
                  <span>{out.lang}</span>
                  <span style={{ color: '#6e7681' }}>{out.ext}</span>
                </div>
              </div>
            </div>
            {/* body */}
            <div className="flex h-[268px]">
              <div className="flex-1 flex overflow-hidden" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="w-[34px] pt-[18px] flex-shrink-0 flex flex-col items-center" style={{ background: 'rgba(0,0,0,0.18)', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <span key={n} style={{ fontFamily: MONO, color: '#3c434e', fontSize: 11, lineHeight: '1.9' }}>{n}</span>
                  ))}
                </div>
                <div className="flex-1 px-4 py-[18px] overflow-hidden">
                  <pre style={{ fontFamily: MONO, color: '#c9d1d9', fontSize: 12.5, lineHeight: 1.85, margin: 0, whiteSpace: 'pre' }}>{typed}</pre>
                </div>
              </div>
              <div
                className="flex-1 px-5 py-[18px] overflow-hidden"
                style={{ opacity: fade ? 0 : 1, transform: fade ? 'translateY(6px)' : 'translateY(0)', transition: 'opacity 0.25s ease, transform 0.25s ease' }}
              >
                <pre style={{ fontFamily: MONO, color: '#c9d1d9', fontSize: 12.5, lineHeight: 1.85, margin: 0, whiteSpace: 'pre' }}>{out.code}</pre>
              </div>
            </div>
            {/* format strip */}
            <div className="flex gap-1.5 items-center px-3.5 py-2.5" style={{ borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.22)' }}>
              {OUTPUTS.slice(0, 5).map((o, i) => {
                const active = i === outputIdx;
                return (
                  <button
                    key={o.lang}
                    onClick={() => { setOutputIdx(i); }}
                    style={{
                      fontFamily: MONO, fontSize: 11, lineHeight: 1, padding: '5px 11px', borderRadius: 3,
                      background: active ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
                      color: active ? '#e6edf3' : '#8b949e',
                      border: '1px solid ' + (active ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.07)'),
                      transition: 'all 0.3s ease', whiteSpace: 'nowrap',
                    }}
                  >
                    {o.lang}
                  </button>
                );
              })}
              <span style={{ fontFamily: MONO, color: '#3c434e', fontSize: 11 }} className="ml-1.5">+155 more</span>
            </div>
          </div>
        </section>

        {/* WHY ZOD — the format-inference moat, shown not told */}
        <section className="py-20" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontFamily: MONO, color: '#8b949e' }} className="block text-[11px] tracking-[0.12em] uppercase mb-3.5">The Zod difference</span>
          <h2 className="text-[30px] md:text-[38px] font-bold tracking-tight leading-[1.1] mb-3.5">
            Most converters stop at <span style={{ color: '#8b949e' }}>z.string()</span>.
          </h2>
          <p className="text-[15px] leading-[1.7] mb-9 max-w-[520px]" style={{ color: '#8b949e' }}>
            TypeMorph reads the actual values and emits validators that catch bad data — emails, UUIDs,
            URLs, and ISO dates, not just strings.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-[740px]">
            <div className="rounded-lg overflow-hidden" style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 py-3 text-[11px] uppercase tracking-widest" style={{ fontFamily: MONO, color: '#6e7681', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>Typical JSON → Zod</div>
              <pre className="px-5 py-4 text-[12.5px]" style={{ fontFamily: MONO, color: '#8b949e', lineHeight: 1.9, margin: 0, whiteSpace: 'pre', overflowX: 'auto' }}>{`email:     z.string()\nid:        z.string()\ncreatedAt: z.string()`}</pre>
            </div>
            <div className="rounded-lg overflow-hidden" style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.18)' }}>
              <div className="px-5 py-3 text-[11px] uppercase tracking-widest" style={{ fontFamily: MONO, color: '#e6edf3', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>TypeMorph</div>
              <pre className="px-5 py-4 text-[12.5px]" style={{ fontFamily: MONO, color: '#c9d1d9', lineHeight: 1.9, margin: 0, whiteSpace: 'pre', overflowX: 'auto' }}>{`email:     z.email()\nid:        z.uuid()\ncreatedAt: z.iso.datetime()`}</pre>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginBottom: 52 }}>
            <span style={{ fontFamily: MONO, color: '#8b949e' }} className="block text-[11px] tracking-[0.12em] uppercase mb-3.5">Features</span>
            <h2 className="text-[40px] font-bold tracking-tight leading-[1.1]">Everything for schema work</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 rounded-lg overflow-hidden" style={{ gap: 1, background: 'rgba(255,255,255,0.07)' }}>
            {FEATURES.map((f) => (
              <div key={f.title} className="px-8 py-9" style={{ background: '#0d1117' }}>
                <div className="mb-[18px] text-[34px] font-bold leading-none tracking-tight" style={{ fontFamily: f.mono ? MONO : SANS, opacity: f.mono ? 0.9 : 1 }}>{f.mark}</div>
                <h3 className="text-[16px] font-semibold mb-2.5" style={{ color: '#e6edf3' }}>{f.title}</h3>
                <p className="text-[13px] leading-[1.7]" style={{ color: '#8b949e' }}>{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-24" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ marginBottom: 52 }}>
            <span style={{ fontFamily: MONO, color: '#8b949e' }} className="block text-[11px] tracking-[0.12em] uppercase mb-3.5">How it works</span>
            <h2 className="text-[40px] font-bold tracking-tight leading-[1.1]">One AST pipeline. Any format.</h2>
          </div>
          <div className="flex flex-col md:flex-row items-stretch md:items-start gap-6 md:gap-2">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.n}>
                <div className="flex-1">
                  <div style={{ fontFamily: MONO, color: '#8b949e' }} className="text-[12px] font-bold tracking-wider mb-4">{s.n}</div>
                  <h3 className="text-[17px] font-semibold mb-2" style={{ color: '#e6edf3' }}>{s.title}</h3>
                  <p className="text-[13px] leading-[1.6] mb-[18px]" style={{ color: '#8b949e' }}>{s.body}</p>
                  <div className="rounded-md px-4 py-3.5" style={{ background: '#161b22', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <pre style={{ fontFamily: MONO, color: '#c9d1d9', fontSize: 11.5, lineHeight: 1.75, margin: 0, whiteSpace: 'pre', overflowX: 'auto' }}>{s.code}</pre>
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block flex-shrink-0 pt-[72px] px-1.5" style={{ color: '#3c434e', fontFamily: MONO, fontSize: 18 }}>→</div>
                )}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <h2 className="text-[38px] font-bold tracking-tight mb-3.5">No signup. No upload.</h2>
          <p className="text-[15px]" style={{ color: '#8b949e' }}>Everything runs in your browser — no servers, no accounts, ever.</p>
        </section>

      </div>
      <GlobalFooter />
    </div>
  );
}
