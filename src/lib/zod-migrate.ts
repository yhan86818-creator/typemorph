export interface MigrationChange {
  line: number;
  original: string;
  migrated: string;
  isIso: boolean;
}

export interface MigrationResult {
  output: string;
  changes: MigrationChange[];
  warnings: string[];
}

// z.string().<method>() → z.<method>()
const FORMAT_METHODS = [
  'email', 'url', 'uuid', 'cuid', 'cuid2', 'ulid',
  'emoji', 'base64', 'base64url', 'jwt', 'nanoid',
] as const;

// z.string().<method>() → z.iso.<method>()
const ISO_METHODS = ['datetime', 'date', 'time', 'duration'] as const;

// z.string().ip()/.cidr() were REMOVED in v4 (not renamed). They must be split
// into version-specific validators: ipv4/ipv6, cidrv4/cidrv6. Handled separately
// because the mapping depends on the `{ version }` argument.
const IP_CIDR_METHODS = ['ip', 'cidr'] as const;

// Builds the v4 replacement for a removed z.string().ip()/.cidr() call.
// `args` is the full parenthesised argument string, e.g. '()' or '({ version: "v4" })'.
function convertIpCidr(method: 'ip' | 'cidr', args: string): { expr: string; warn?: string } {
  const v4fn = method === 'ip' ? 'ipv4' : 'cidrv4';
  const v6fn = method === 'ip' ? 'ipv6' : 'cidrv6';
  const inner = args.slice(1, -1).trim(); // strip outer parens

  const versionMatch = inner.match(/version:\s*['"]v([46])['"]/);
  const objMsg = inner.match(/(?:message|error):\s*(['"][^'"]*['"])/);
  const bareMsg = /^['"][^'"]*['"]$/.test(inner) ? inner : null;
  const msg = objMsg ? objMsg[1] : bareMsg;

  if (versionMatch) {
    const fn = versionMatch[1] === '4' ? v4fn : v6fn;
    return { expr: msg ? `z.${fn}({ error: ${msg} })` : `z.${fn}()` };
  }
  // No version: legacy .ip()/.cidr() validated BOTH v4 and v6.
  const expr = `z.union([z.${v4fn}(), z.${v6fn}()])`;
  return {
    expr,
    warn: msg
      ? `${method}() with a custom message was split into a union; the message was dropped — re-add it on a member if needed`
      : undefined,
  };
}

function extractBalancedParen(src: string, openIdx: number): { content: string; end: number } | null {
  if (src[openIdx] !== '(') return null;
  let depth = 1;
  let i = openIdx + 1;
  let inStr: '"' | "'" | '`' | null = null;
  while (i < src.length && depth > 0) {
    const ch = src[i];
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === inStr) inStr = null;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') inStr = ch as '"' | "'" | '`';
      else if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    i++;
  }
  if (depth !== 0) return null;
  return { content: src.slice(openIdx, i), end: i };
}

export function migrateZodV3ToV4(source: string): MigrationResult {
  const changes: MigrationChange[] = [];
  const warnings: string[] = [];

  const allMethods = [...FORMAT_METHODS, ...ISO_METHODS];
  const methodPattern = allMethods.join('|');

  // Matches z.string().<format>( where <format> is immediately after string()
  const regex = new RegExp(`z\\.string\\(\\)\\.(${methodPattern})\\(`, 'g');

  const matches: Array<{ index: number; method: string; openParenIdx: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(source)) !== null) {
    matches.push({
      index: m.index,
      method: m[1],
      openParenIdx: m.index + m[0].length - 1,
    });
  }

  // Process from end to start so earlier indices stay valid
  let result = source;
  for (let i = matches.length - 1; i >= 0; i--) {
    const { index, method, openParenIdx } = matches[i];
    const extracted = extractBalancedParen(source, openParenIdx);
    if (!extracted) continue;

    const isIso = (ISO_METHODS as readonly string[]).includes(method);
    const newCall = isIso ? `z.iso.${method}${extracted.content}` : `z.${method}${extracted.content}`;
    const original = `z.string().${method}${extracted.content}`;

    result = result.slice(0, index) + newCall + result.slice(extracted.end);

    const lineNum = source.slice(0, index).split('\n').length;
    changes.unshift({ line: lineNum, original, migrated: newCall, isIso });
  }

  // ip()/cidr() were removed in v4 — split into ipv4/ipv6, cidrv4/cidrv6.
  // Scans the post-format `result` so indices stay self-consistent.
  const ipRe = new RegExp(`z\\.string\\(\\)\\.(${IP_CIDR_METHODS.join('|')})\\(`, 'g');
  const ipMatches: Array<{ index: number; method: 'ip' | 'cidr'; openParenIdx: number }> = [];
  let im: RegExpExecArray | null;
  while ((im = ipRe.exec(result)) !== null) {
    ipMatches.push({ index: im.index, method: im[1] as 'ip' | 'cidr', openParenIdx: im.index + im[0].length - 1 });
  }
  for (let i = ipMatches.length - 1; i >= 0; i--) {
    const { index, method, openParenIdx } = ipMatches[i];
    const extracted = extractBalancedParen(result, openParenIdx);
    if (!extracted) continue;
    const { expr, warn } = convertIpCidr(method, extracted.content);
    const original = `z.string().${method}${extracted.content}`;
    const lineNum = result.slice(0, index).split('\n').length;
    result = result.slice(0, index) + expr + result.slice(extracted.end);
    changes.unshift({ line: lineNum, original, migrated: expr, isIso: false });
    if (warn) warnings.push(`Line ${lineNum}: ${warn}`);
  }

  // Flag complex chains that weren't transformed: z.string().<something>.<format>()
  const chainedRe = new RegExp(
    `z\\.string\\(\\)(?:\\.[a-zA-Z]+\\([^)]*\\))+\\.(${[...allMethods, ...IP_CIDR_METHODS].join('|')})\\(`,
    'g'
  );
  let ch: RegExpExecArray | null;
  while ((ch = chainedRe.exec(source)) !== null) {
    const lineNum = source.slice(0, ch.index).split('\n').length;
    const snippet = ch[0].slice(0, 60) + (ch[0].length > 60 ? '…' : '');
    warnings.push(`Line ${lineNum}: "${snippet}..." — chained validators, review manually`);
  }

  return { output: result, changes, warnings };
}

export const ZOD_V4_SUMMARY = [
  { rule: 'z.string().email()', becomes: 'z.email()' },
  { rule: 'z.string().url()', becomes: 'z.url()' },
  { rule: 'z.string().uuid()', becomes: 'z.uuid()' },
  { rule: 'z.string().cuid()', becomes: 'z.cuid()' },
  { rule: 'z.string().ulid()', becomes: 'z.ulid()' },
  { rule: 'z.string().ip()', becomes: 'z.union([z.ipv4(), z.ipv6()])' },
  { rule: 'z.string().ip({ version: "v4" })', becomes: 'z.ipv4()' },
  { rule: 'z.string().cidr()', becomes: 'z.union([z.cidrv4(), z.cidrv6()])' },
  { rule: 'z.string().base64()', becomes: 'z.base64()' },
  { rule: 'z.string().jwt()', becomes: 'z.jwt()' },
  { rule: 'z.string().datetime()', becomes: 'z.iso.datetime()' },
  { rule: 'z.string().date()', becomes: 'z.iso.date()' },
  { rule: 'z.string().time()', becomes: 'z.iso.time()' },
  { rule: 'z.string().duration()', becomes: 'z.iso.duration()' },
];
