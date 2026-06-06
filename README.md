# TypeFlow Pro

> **Premium, Local-First Schema Engineering Workbench for Modern Software Architects.**

[![Live Demo](https://img.shields.io/badge/Demo-Live_on_Cloudflare-3B82F6?style=for-the-badge&logo=cloudflare&logoColor=white)](https://typemorph.dev)
[![GitHub Stars](https://img.shields.io/github/stars/yhan86818-creator/ai-factory?style=for-the-badge&logo=github&logoColor=white&color=yellow)](https://github.com/yhan86818-creator/ai-factory)
[![License](https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge)](LICENSE)

TypeFlow Pro is an institutional-grade schema transformation and visualization platform. Engineered for elite developers, it delivers a **100% client-side sandbox** supporting 290+ developer and financial converter utilities, augmented by opt-in direct AI synthesis (BYOK).

---

## The Privacy Manifesto

We value corporate data sovereignty above all else. TypeFlow Pro clearly separates standard offline browser-only processing from transparent direct AI operations:

```
[ Your Sensitive Schema ]
       │
       ├─► (100% Local-First Engine) ──► Executed in Sandboxed Browser Memory (Zero Network Traffic)
       │
       └─► (BYOK AI Workbenches)    ──► Direct SSL Connection ──► Google Gemini API (No Proxy, No Interception)
```

1. **Local-First Engine**: All standard conversions (JSON to TypeScript/Go/Rust, SQL DDL, FIX protocol, etc.) run **entirely inside your browser's client-side JavaScript sandbox**. Your code never leaves your local device.
2. **BYOK AI Model**: Advanced neural features connect directly from your client to Google Gemini's official API using **your own Gemini API Key (Bring Your Own Key)**. TypeFlow does not proxy, store, or intercept your keys or intellectual property on conversion servers.
3. **Zero Data Retention**: Guest history resides solely in your browser's local storage. Cloud history sync (Supabase) is strictly opt-in and active only for logged-in accounts. A **Nuclear Wipe option** is available in the CONFIG popover to instantly purge all local, cloud, and URL hash parameters.
4. **100% Ethical & Open**: No third-party advertisements, no retargeting tracking, and **absolutely zero training** of AI models using your input payloads.
5. **Explicit-Only Share Policy**: By default, the **Share** button encodes your schema into an LZ-compressed `#data=...` URL hash — the data lives entirely in the URL string, no server is ever contacted. Only when your schema is too large for a URL (> 2,000 characters compressed) does the app automatically escalate to cloud storage — and **only if you explicitly click the Share button**. The raw auto-sync to URL hash on every keystroke has been intentionally removed to prevent inadvertent data exposure via browser history.

---

## Key Architectural Pillars

TypeFlow Pro is divided into 4 specialized, highly optimized workspaces:

### 1. Interactive Workbench (Monaco Editor)
*   **290+ High-Performance Parsers**: Convert from JSON, XML, YAML, SQL DDL, cURL, SWIFT MT/MX, FIX Protocol to 15+ target languages.
*   **Dynamic Privacy Indicators**: Real-time visual badge switching between `Local Mode (100% Private)` and `AI Mode (BYOK Cloud)` based on your current API configuration.
*   **Smart Empty-State Drag & Drop**: Load schemas instantly by dropping `.json` or `.yaml` files directly into the Monaco editor, or launch a complex sample payload with one click.
*   **Auto-Healing Syntax Parser**: Paste malformed or trailing-comma payloads and let the sandboxed AI automatically repair it on the fly.

### 2. Logic Lab (Complete Service Synthesis)
*   Don't just generate static TS interfaces. Synthesize complete operational codebases including:
    *   **1-Click React Query hooks** mapped to your schema structure.
    *   **Fully typed Mock Services** and database mock class generators.
    *   **Pristine documentation** with clean dependency installation instructions.

### 3. Architecture Visuals (Interactive ER Diagrams)
*   Paste raw structures or SQL DDL, and watch a beautiful entity-relationship diagram render instantly.
*   **Role-Based Dynamic Styling**: The engine automatically classifies nodes (`API`, `Database`, `Client`) and applies sleek, color-coordinated dark mode neon themes.
*   **High-Resolution Export**: Export 3x transparent PNGs or SVGs ready for slide presentations or architectural reviews.

### 4. Smart Structural Diff (AST Semantic Compare)
*   Standard text-diffs fail when keys are reordered or whitespaces change.
*   TypeFlow's **Smart Diff parses schemas into an abstract AST**, matching properties semantically.
*   Filters out formatting noise to highlight actual, structural payload changes.

---

## 1-Click Self-Host & Deployment

Deploy your own private instance of TypeFlow Pro to Cloudflare Pages in less than a minute.

### Deploy to Cloudflare Pages
1. Fork this repository.
2. Run the build command:
   ```bash
   npm run build
   ```
3. Deploy the static `out` directory to Cloudflare Pages via Wrangler or your Cloudflare Dashboard.

---

## Local Development & Setup

TypeFlow Pro is built using **Next.js 16 (App Router)** and styled with **Vanilla CSS & modern dark-mode layouts**.

### Prerequisites
*   Node.js 18+
*   npm or pnpm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/yhan86818-creator/ai-factory.git
   cd ai-factory/typeflow
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Launch the local development server:
   ```bash
   npm run dev
   ```
4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

*Crafted with care by engineers, for software architects.*
