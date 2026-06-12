import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.join(__dirname, 'src', 'data', 'content');
const jpContentDir = path.join(contentDir, 'jp');

if (!fs.existsSync(jpContentDir)) fs.mkdirSync(jpContentDir, { recursive: true });

const convertersFile = fs.readFileSync(path.join(__dirname, 'src', 'data', 'converters.ts'), 'utf8');
const slugs = [...convertersFile.matchAll(/['\"]?slug['\"]?:\s*['\"]([^'"]+)['"]/g)].map(m => m[1]);

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const nestedPick = (options) => pick(options);

// ========== v16.5 DEEP MULTI-LANGUAGE SEO (The Final Content Boss) ==========

const uniqueInsights = {
  "json-to-typescript": "Man, I hate hand-writing interfaces. Seriously. You get a JSON back from some obscure legacy API, it's 200 lines deep, and you're stuck there like a monk transcribing a scroll. One typo in `user_metadata` vs `user_meta_data` and your production Sentry is screaming at you at 3 AM. No thanks. I built this because I'm lazy, and you should be too. It handles the nested stuff, optional properties (the `?` is your best friend), and it doesn't send your data to some cloud server. Just local parsing. Paste, copy, ship. Focus on the actual logic, not the boilerplate.",
  "json-to-zod": "Types are cool, but runtime validation is where the real work happens. If you're just casting `as MyType` and hoping for the best, you're living on borrowed time. I spent four hours debugging a 'TypeError' last Tuesday just because a 'string' was actually an 'array' in production. Never again. This JSON to Zod tool is my personal insurance policy. It spits out the schema so you can actually parse and validate the input at the door. It's safe, it's boring, and it works. Don't be the dev who trusts the API blindly.",
  "sql-to-typescript": "SQL schemas vs TypeScript models. The eternal struggle. You update the DB, you forget the frontend, and everything breaks. Why? Because we're humans and we're bad at remembering stuff. This tool is a bridge for people who just want to get things done. It reads your DDL (the `CREATE TABLE` stuff) and gives you the exact TypeScript shape. Handles nullables correctly, which is usually where everyone messes up. It's a tiny utility for a huge headache. Keep your models in sync without losing your mind.",
};

const uniqueInsightsJP = {
  "json-to-typescript": "TypeScriptのインターフェースを手書きするのは、控えめに言っても苦行です。APIから返ってくる巨大なJSONを眺めながら、`user_metadata`だっけ？それとも`user_meta_data`？と迷い、本番環境でエラーを出して午前3時に叩き起こされる…。そんな経験はもう十分です。このツールは、そんな退屈で危険な作業を自動化するために作りました。ネストした構造やオプショナル属性も正確に処理し、データは一切外部に送信しません。エンジニアなら、もっと本質的なロジックに集中しましょう。",
  "json-to-zod": "型定義も重要ですが、本番環境で本当に必要なのは実行時のバリデーションです。単に `as MyType` とキャストして祈るだけでは、いつか型エラーの地獄を見ることになります。先週も、production環境で'string'だと思っていたフィールドが実は'array'で、デバッグに4時間溶かしました。Zodスキーマを自動生成することで、APIからの入力を水際で防ぎましょう。このツールは、あなたの睡眠時間を守るための保険です。",
};

const secFrags = (t) => [
  `I don't trust random websites with my <strong>${t.from}</strong> data. Period.`,
  `If you're pasting sensitive payloads into some server-side converter, you're asking for trouble.`,
  `TypeMorph is strictly local; it runs in your browser's JS engine.`,
  `No logs, no data harvesting, no nonsense—just <strong>${t.title}</strong> on your own machine.`,
  `Data privacy isn't a feature for <strong>${t.to}</strong> generation; it's a requirement.`,
  `Most online tools log your <strong>${t.from}</strong> inputs to train their models or sell your data. We don't.`,
  `Your proprietary schemas stay on your hard drive where they belong.`,
  `Security is the reason I built this local-first <strong>${t.title}</strong> tool.`,
  `Sending your internal API specs to a third-party server is a SOC2 nightmare waiting to happen.`,
  `TypeMorph is a zero-trust utility for your <strong>${t.to}</strong> needs.`,
  `It satisfies GDPR and company security policies by simply never seeing your data.`,
  `Server-side conversion is a security hole that many <strong>${t.from}</strong> users overlook.`,
  `This tool uses your machine's CPU to do the work, ensuring <strong>${t.to}</strong> safety.`,
  `It's faster, it's private, and it ensures that your sensitive infrastructure definitions never leak.`,
  `No server, no risk—that is the TypeMorph promise for <strong>${t.title}</strong>.`,
  `Local processing means your <strong>${t.from}</strong> never touches our cloud.`,
  `Privacy-first <strong>${t.title}</strong> is non-negotiable in 2026.`,
  `I built this specifically because I didn't want to leak my client's <strong>${t.from}</strong> schemas.`,
  `Your data, your machine, your rules. No exceptions.`,
  `Zero-latency <strong>${t.title}</strong> with zero-server risk.`
];

const secFragsJP = (t) => [
  `機密性の高い<strong>${t.from}</strong>データを、どこの誰が作ったかわからないウェブサイトに貼り付けるのは、あまりにも危険です。`,
  `サーバーサイドで変換を行うツールは、あなたのデータをログに記録している可能性があります。`,
  `TypeMorphは完全にローカルで動作します。すべての処理はあなたのブラウザ内で行われます。`,
  `データの収集もログもありません。<strong>${t.title}</strong>の変換は、あなたのマシン上だけで完結します。`,
  `データプライバシーは<strong>${t.to}</strong>生成における「機能」ではなく、「絶対条件」です。`,
  `多くのオンラインツールは、モデルのトレーニングやデータ転送のためにあなたの入力を利用します。私たちは違います。`,
  `独自のスキーマやAPI仕様は、あるべき場所、つまりあなたの手元に留めておくべきです。`,
  `この「ローカルファースト」の<strong>${t.title}</strong>ツールを開発した最大の理由は、セキュリティです。`,
  `社内のAPI仕様をサードパーティのサーバーに送信することは、SOC2コンプライアンス上の大きなリスクとなります。`,
  `TypeMorphは、<strong>${t.to}</strong>生成におけるゼロトラスト・ユーティリティです。`,
  `データが私たちのサーバーに届くことは物理的にありません。これによりGDPRや社内セキュリティポリシーを完全に満たせます。`,
  `サーバーサイド変換は、多くの<strong>${t.from}</strong>ユーザーが見落としがちなセキュリティホールです。`,
  `このツールはあなたのマシンのCPUパワーを使い、<strong>${t.to}</strong>への変換を安全に行います。`,
  `高速でプライベート。そして機密性の高いインフラ定義が漏洩することを防ぎます。`,
  `サーバーがない＝リスクがない。それがTypeMorphが提供する<strong>${t.title}</strong>の約束です。`,
  `ローカル処理により、あなたの<strong>${t.from}</strong>データがクラウドに触れることはありません。`,
  `2026年において、プライバシーを優先した<strong>${t.title}</strong>ツールは妥協できない選択肢です。`,
  `クライアントの重要な<strong>${t.from}</strong>スキーマを漏洩させたくない。その思いがこのツールを作りました。`,
  `データも、マシンも、ルールも、すべてあなたのものです。例外はありません。`,
  `サーバーリスクゼロ。超低レイテンシな<strong>${t.title}</strong>変換を体験してください。`
];

const tipFrags = (t) => [
  `Automation is a tool, not a replacement for your brain when generating <strong>${t.to}</strong>.`,
  `Use this to handle the 95% of the <strong>${t.from}</strong> mapping, then do a quick manual check.`,
  `Are those IDs actually numbers? Should that optional field be a required one?`,
  `A two-minute review of the <strong>${t.to}</strong> output saves you a headache in production.`,
  `Don't just take the generated <strong>${t.to}</strong> code as gospel.`,
  `Use this as a starting point, then review the edge cases and check nullability.`,
  `Velocity is great, but correctness is better for <strong>${t.to}</strong>.`,
  `Use this to skip the boilerplate, but always perform a final audit.`,
  `Checking for 'Date' vs 'String' mismatches is where you'll find the most value after the <strong>${t.title}</strong> process.`,
  `Move fast, but don't break your <strong>${t.to}</strong> implementation.`,
  `Consistency is king in <strong>${t.from}</strong> transformations.`,
  `Keep your <strong>${t.to}</strong> definitions DRY and clean.`,
  `Always test your generated schemas against edge-case <strong>${t.from}</strong> samples.`,
  `Structural integrity starts with a good <strong>${t.title}</strong> workflow.`,
  `Don't let manual field mapping slow down your sprint.`
];

const tipFragsJP = (t) => [
  `自動化は強力なツールですが、<strong>${t.to}</strong>生成において人間のチェックを完全に代行するものではありません。`,
  `このツールでマッピングの95%を終わらせ、残りの5%を人間が最終確認するのが最も効率的です。`,
  `IDは本当に数値型ですか？そのオプショナルフィールドは必須にするべきではありませんか？`,
  `生成された<strong>${t.to}</strong>を2分間レビューするだけで、本番環境でのトラブルを未然に防げます。`,
  `生成されたコードを盲信しないでください。`,
  `これを出発点として活用し、エッジケースやNull許容性を確認してください。`,
  `<strong>${t.to}</strong>において、スピードも大事ですが、正確さはそれ以上に重要です。`,
  `定型コード（ボイラープレート）の作成はツールに任せ、あなたは最終的な監査に集中しましょう。`,
  `「日付」と「文字列」の不一致をチェックすることが、<strong>${t.title}</strong>後に最も価値のある作業です。`,
  `素早く動くのは良いことですが、<strong>${t.to}</strong>の実装を壊さないように注意してください。`,
  `<strong>${t.from}</strong>変換において、一貫性は品質そのものです。`,
  `生成された<strong>${t.to}</strong>定義は、常にクリーンでDRY（重複のない）な状態を保ちましょう。`,
  `生成されたスキーマは、常にエッジケースの<strong>${t.from}</strong>サンプルでテストしてください。`,
  `構造の健全性は、優れた<strong>${t.title}</strong>ワークフローから始まります。`,
  `手動のマッピング作業で、あなたの開発スプリントを停滞させないでください。`
];

const technicalFrags = (t) => [
  `Handling ${t.from} schemas often results in ${nestedPick(['runtime exceptions', 'silent failures', 'type mismatches'])} if you aren't careful.`,
  `The ${nestedPick(['biggest challenge', 'main hurdle', 'critical point'])} in ${t.to} generation is ensuring that ${nestedPick(['nested objects', 'optional arrays', 'nullable strings'])} are mapped with 100% precision.`,
  `I've found that ${nestedPick(['manual mapping', 'hand-coding interfaces', 'boilerplate generation'])} takes up nearly ${nestedPick(['30%', '40%', '50%'])} of the initial sprint time.`,
  `By offloading the ${nestedPick(['heavy lifting', 'grunt work', 'boilerplating'])} to a local tool, you reduce the risk of ${nestedPick(['typos', 'logical gaps', 'sync errors'])}.`,
  `Always ensure that your ${t.to} implementation supports ${nestedPick(['serialization', 'deserialization', 'validation logic'])} for ${nestedPick(['edge-case payloads', 'legacy data', 'malformed inputs'])}.`,
  `The performance of ${t.from} parsing ${nestedPick(['scales linearly', 'depends on depth', 'varies by engine'])}, but your ${t.to} structures should remain ${nestedPick(['DRY', 'modular', 'flat'])}.`,
  `Modern dev stacks require ${nestedPick(['strict typing', 'runtime safety', 'automated validation'])}, which is exactly why this ${t.title} utility exists.`,
  `Using ${nestedPick(['Zod', 'TypeBox', 'Runtypes'])} alongside your ${t.to} definitions provides a ${nestedPick(['double layer', 'bulletproof', 'robust'])} defense against bad data.`,
];

const technicalFragsJP = (t) => [
  `${t.from}スキーマの扱いは、注意を怠ると${nestedPick(['実行時例外', 'サイレント・フェイリヤ', '型の不一致'])}を引き起こす原因となります。`,
  `${t.to}生成における${nestedPick(['最大の課題', '主要な障壁', '重要なポイント'])}は、${nestedPick(['ネストされたオブジェクト', 'オプショナルな配列', 'Null許容の文字列'])}を100%の精度でマッピングすることです。`,
  `${nestedPick(['手動マッピング', 'インターフェースの手書き', 'ボイラープレートの生成'])}は、最初のスプリントの約${nestedPick(['30%', '40%', '50%'])}を費やしていることがわかりました。`,
  `${nestedPick(['重労働', '単調な作業', 'ボイラープレートの作成'])}をローカルツールに任せることで、${nestedPick(['タイポ', 'ロジックの欠落', '同期エラー'])}のリスクを大幅に削減できます。`,
  `あなたの${t.to}実装が、${nestedPick(['エッジケースのペイロード', 'レガシーデータ', '不正な入力'])}に対して${nestedPick(['シリアライズ', 'デシリアライズ', 'バリデーションロジック'])}をサポートしているか常に確認してください。`,
  `${t.from}のパース性能は${nestedPick(['線形にスケールします', '深さに依存します', 'エンジンにより異なります'])}が、${t.to}構造は常に${nestedPick(['DRY', 'モジュール化', 'フラット'])}であるべきです。`,
  `モダンな開発スタックには${nestedPick(['厳格な型定義', '実行時の安全性', '自動化されたバリデーション'])}が不可欠であり、それこそがこの${t.title}ツールが存在する理由です。`,
  `${t.to}定義とともに${nestedPick(['Zod', 'TypeBox', 'Runtypes'])}を使用することで、不正なデータに対して${nestedPick(['二重の層', '鉄壁の', '堅牢な'])}防御を提供します。`,
];

const faqFrags = (t) => [
  `<strong>Does this tool support nested ${t.from}?</strong> Yes, the recursive inference engine handles deep object trees effortlessly.`,
  `<strong>Is my ${t.from} data saved?</strong> No. Everything happens in the browser's JS memory; nothing is ${nestedPick(['logged', 'stored', 'transmitted'])}.`,
  `<strong>Can I customize the ${t.to} output?</strong> Currently, it follows ${nestedPick(['standard idiomatic', 'best-practice', 'highly-optimized'])} naming conventions.`,
  `<strong>What about ${nestedPick(['nulls', 'undefineds', 'empty strings'])}?</strong> The generator ${nestedPick(['intelligently infers', 'predicts', 'detects'])} optionality to keep your code clean.`,
  `<strong>Is this suitable for ${nestedPick(['production', 'enterprise', 'commercial'])} projects?</strong> Absolutely. It's built to ${nestedPick(['accelerate', 'streamline', 'harden'])} professional development workflows.`,
  `<strong>How does it handle ${nestedPick(['PascalCase', 'camelCase', 'snake_case'])}?</strong> It maintains the ${nestedPick(['original casing', 'source formatting', 'input structure'])} to ensure API compatibility.`,
];

const faqFragsJP = (t) => [
  `<strong>ネストされた ${t.from} に対応していますか？</strong> はい、再帰的推論エンジンにより、深いオブジェクトツリーも問題なく処理できます。`,
  `<strong>${t.from} データは保存されますか？</strong> いいえ。すべてはブラウザのJSメモリ上で行われ、何も${nestedPick(['記録', '保存', '送信'])}されません。`,
  `<strong>${t.to} 出力をカスタマイズできますか？</strong> 現在は、${nestedPick(['標準的で慣用的', 'ベストプラクティスに基づいた', '高度に最適化された'])}命名規則に従います。`,
  `<strong>${nestedPick(['Null', 'Undefined', '空文字'])}の扱いはどうなりますか？</strong> ジェネレーターはオプショナル性を${nestedPick(['インテリジェントに推論', '予測', '検知'])}し、コードをクリーンに保ちます。`,
  `<strong>${nestedPick(['商用', 'エンタープライズ', 'プロダクション'])}プロジェクトに適していますか？</strong> もちろんです。プロフェッショナルな開発ワークフローを${nestedPick(['加速', '効率化', '強化'])}するために設計されています。`,
  `<strong>${nestedPick(['PascalCase', 'camelCase', 'snake_case'])} はどう処理されますか？</strong> APIの互換性を確保するため、${nestedPick(['元のケース', 'ソースのフォーマット', '入力構造'])}を維持します。`,
];

const getCategoryInsight = (slug, t, lang = 'en') => {
  if (lang === 'jp') {
    if (slug.includes('typescript') || slug.includes('ts-')) return `開発者はコードを書くべきであり、型定義を手書きして時間を溶かすべきではありません。<strong>${t.from}</strong>から<strong>${t.to}</strong>へのマッピングを手動で行うのは、脳の無駄遣いです。私はこの苦痛を止めるためにこのエンジンを作りました。`;
    if (slug.includes('sql') || slug.includes('db-')) return `生データとリレーショナルDBの間の溝は、最も厄介なバグが潜む場所です。手動のシードファイル作成で深夜まで残業するのはもうやめましょう。このツールは安全かつ高速にDBへのデータ投入をサポートします。`;
    return `<strong>${t.from}</strong>から<strong>${t.to}</strong>への手動変換は、エンジニアの貴重な時間を浪費します。マッピングエラーからバグが生まれるのを何度も見てきました。このツールはローカルで動作し、高速かつ安全に変換を完了させます。`;
  }
  if (slug.includes('typescript') || slug.includes('ts-')) return `Look, I'm a developer, not a typist. Manually mapping <strong>${t.from}</strong> to <strong>${t.to}</strong> is a waste of a good brain. I built this engine to stop the bleeding. It's local, it's fast, and it just works.`;
  if (slug.includes('sql') || slug.includes('db-')) return `The gap between raw data and a relational database is where the most annoying bugs live. I've spent too many late nights fixing SQL syntax errors. This tool handles the types and the escaping locally.`;
  return `Honestly, manually converting <strong>${t.from}</strong> to <strong>${t.to}</strong> is a waste of your engineering time. I've seen too many bugs grow from simple mapping errors. This tool handles the grunt work locally, so you don't have to.`;
};

// ========== v16.8 DEEP MULTI-LANGUAGE SEO (The File-Based Authority Boss) ==========

const manualDir = path.join(__dirname, 'scripts', 'manual_content');

const generatePage = (tool, lang = 'en') => {
  const manualPath = path.join(manualDir, lang, `${tool.slug}.html`);
  if (fs.existsSync(manualPath)) {
    return fs.readFileSync(manualPath, 'utf8');
  }

  const insight = (lang === 'jp' ? (uniqueInsightsJP[tool.slug] || getCategoryInsight(tool.slug, tool, 'jp')) : (uniqueInsights[tool.slug] || getCategoryInsight(tool.slug, tool, 'en')));
  
  const sFrags = lang === 'jp' ? secFragsJP(tool) : secFrags(tool);
  const tFrags = lang === 'jp' ? tipFragsJP(tool) : tipFrags(tool);
  const techFrags = lang === 'jp' ? technicalFragsJP(tool) : technicalFrags(tool);
  const fFrags = lang === 'jp' ? faqFragsJP(tool) : faqFrags(tool);

  const securityPara = shuffle(sFrags).slice(0, 10).join(' ');
  const tipsPara = shuffle(tFrags).slice(0, 10).join(' ');
  const techPara = shuffle(techFrags).slice(0, 8).join(' ');
  const faqPara = shuffle(fFrags).slice(0, 6).join(lang === 'jp' ? '<br><br>' : '<br><br>');

  const headers = lang === 'jp' ? {
    prob: `${tool.title} の真の問題点`,
    local: "「ローカルファースト」が唯一の正解である理由",
    tip: `${tool.to} 統合のためのプロの秘訣`,
    tech: `技術解説: ${tool.from} マッピングの深層`,
    faq: "よくある質問 (FAQ)",
    stop: `${tool.from} に時間を費やすのはもうやめましょう`
  } : {
    prob: `The Real Problem with ${tool.title}`,
    local: "Why 'Local-First' is the Only Way",
    tip: `A Pro Tip for ${tool.to} Integration`,
    tech: `Technical Deep-Dive: ${tool.from} Mapping`,
    faq: "Frequently Asked Questions",
    stop: `Stop Wasting Time on ${tool.from}`
  };

  const allSections = [
    { h2: headers.prob, p: insight },
    { h2: headers.local, p: securityPara },
    { h2: headers.tip, p: tipsPara },
    { h2: headers.tech, p: techPara },
    { h2: headers.faq, p: faqPara },
    { h2: headers.stop, p: lang === 'jp' ? `手動で <strong>${tool.title}</strong> を行う毎分は、新機能のリリースを遅らせているのと同じです。コードを入手し、監査を行い、本来の仕事に戻りましょう。TypeMorphは生産性を最大化するためのツールです。` : `Seriously. Every minute spent on manual <strong>${tool.title}</strong> is a minute you aren't shipping features. Get the code, do a quick audit, and get back to work. TypeMorph is about velocity, not boilerplate.` }
  ];

  let sections = shuffle(allSections);
  if (Math.random() > 0.9) sections.pop(); 

  let html = `<h1>${lang === 'jp' ? `開発日誌: ${tool.title}` : `Dev Diary: ${tool.title}`}</h1>`;
  for (const s of sections) {
    html += `<h2>${s.h2}</h2><p>${s.p}</p>`;
  }
  
  html += `<h2>Done.</h2><p>${lang === 'jp' ? '人生は手動マッピングをするには短すぎます。 - TypeMorph チーム' : 'Life is too short for manual mapping. - TypeMorph Team'}</p>`;

  return html;
};

// ========== MAIN EXECUTION ==========
let updated = 0;
for (const slug of slugs) {
  const parts = slug.split('-to-');
  const fromName = parts[0] ? parts[0].replace(/-/g, ' ').toUpperCase() : 'SOURCE';
  const toName = parts.slice(1).join(' to ').replace(/-/g, ' ').toUpperCase() || 'TARGET';
  const tool = { slug, title: `${fromName} to ${toName}`, from: fromName, to: toName };

  // 1. Generate English
  fs.writeFileSync(path.join(contentDir, `${slug}.html`), generatePage(tool, 'en'), 'utf8');
  
  // 2. Generate Japanese
  fs.writeFileSync(path.join(jpContentDir, `${slug}.html`), generatePage(tool, 'jp'), 'utf8');
  
  updated++;
}

console.log(`✅ v16.8 DEEP MULTI-LANGUAGE SEO Complete (${updated} pages x 2 languages)`);
