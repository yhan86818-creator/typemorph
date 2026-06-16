import { Schema } from './types';

export interface QualityIssue {
  severity: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
}

export interface QualityResult {
  score: number; // 0–100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  issues: QualityIssue[];
  stats: {
    totalFields: number;
    anyFields: number;
    formattedFields: number;
    optionalFields: number;
    requiredFields: number;
    maxDepth: number;
    namingStyle: 'camelCase' | 'snake_case' | 'PascalCase' | 'mixed' | 'unknown';
  };
}

// Fields that SHOULD have a format constraint when typed as string
const SEMANTIC_STRING: RegExp =
  /email|url|link|href|website|endpoint|uuid|guid|^id$|_id$|Id$|ID$|date|_at$|At$|time|timestamp|phone|\btel\b|zip|postal|^ip$|ip_/i;

// Legitimately free-text fields — no format constraint expected
const FREE_TEXT: RegExp =
  /^(name|label|title|description|desc|summary|body|content|text|message|note|notes|comment|comments|bio|about|reason|details|info|caption|heading|subtitle|excerpt|overview|remark|remarks|placeholder|hint|tooltip|instruction|instructions|query|search|address|street|city|country|state|province|slug|tag|category|type|status|kind|mode|locale|lang|language|currency|unit|format|source|target|key|value|data)$/i;

// Sensitive fields worth flagging
const SENSITIVE: RegExp = /password|passwd|secret|token|apikey|api_key|auth|credential|private/i;

const FORMAT_KEYWORDS: Record<string, RegExp> = {
  email: /email/i,
  url: /url|link|href|website|endpoint/i,
  uuid: /uuid|guid/i,
  id: /^id$|_id$|Id$|ID$/,
  date: /date|_at$|At$|time|timestamp/i,
  phone: /phone|tel/i,
  ip: /^ip$|ip_|ipAddr|ip_address/i,
};

function isCamel(s: string): boolean {
  // Single lowercase words (id, name, email) are valid camelCase — don't require uppercase
  return /^[a-z][a-zA-Z0-9]*$/.test(s) && s !== s.toUpperCase();
}
function isSnake(s: string): boolean {
  return /^[a-z][a-z0-9_]*$/.test(s) && s.includes('_');
}
function isPascal(s: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(s);
}

type NamingStyle = 'camelCase' | 'snake_case' | 'PascalCase' | 'other';

function classifyName(name: string): NamingStyle {
  if (isSnake(name)) return 'snake_case';
  if (isPascal(name)) return 'PascalCase';
  if (isCamel(name)) return 'camelCase';
  return 'other';
}

interface FieldStats {
  total: number;
  anyCount: number;
  formattedCount: number;
  semanticUnformatted: { path: string }[];
  optionalCount: number;
  requiredCount: number;
  nameCounts: Record<NamingStyle, number>;
  maxDepth: number;
}

function collectFields(
  schema: Schema,
  path: string,
  depth: number,
  stats: FieldStats,
  issues: QualityIssue[]
): void {
  if (depth > 20) return;
  stats.maxDepth = Math.max(stats.maxDepth, depth);

  if (schema.type === 'object' && schema.fields) {
    for (const [key, field] of Object.entries(schema.fields)) {
      const fieldPath = path ? `${path}.${key}` : key;
      stats.total++;

      stats.nameCounts[classifyName(key)] = (stats.nameCounts[classifyName(key)] ?? 0) + 1;

      if (field.type === 'any') {
        stats.anyCount++;
        issues.push({ severity: 'warning', message: 'Has `any` type — add a specific type', path: fieldPath });
      }

      if (field.optional) {
        stats.optionalCount++;
      } else {
        stats.requiredCount++;
      }

      if (field.type === 'string') {
        const hasExplicitFormat = !!field.format;
        const hasNameHint = Object.values(FORMAT_KEYWORDS).some(re => re.test(key));

        if (hasExplicitFormat || hasNameHint) {
          stats.formattedCount++;
        } else if (SEMANTIC_STRING.test(key) && !FREE_TEXT.test(key)) {
          // Looks like it should have a format but doesn't
          stats.semanticUnformatted.push({ path: fieldPath });
        }

        if (SENSITIVE.test(key)) {
          issues.push({ severity: 'info', message: 'May contain sensitive data — consider hashing or omitting', path: fieldPath });
        }
      }

      collectFields(field, fieldPath, depth + 1, stats, issues);
    }
  } else if (schema.type === 'array' && schema.itemType) {
    collectFields(schema.itemType, `${path}[]`, depth + 1, stats, issues);
  }
}

function dominantStyle(
  counts: Record<NamingStyle, number>
): 'camelCase' | 'snake_case' | 'PascalCase' | 'mixed' | 'unknown' {
  const entries = Object.entries(counts).filter(([, n]) => n > 0) as [NamingStyle, number][];
  if (entries.length === 0) return 'unknown';
  entries.sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  const [topStyle, topCount] = entries[0];
  if (topCount / total >= 0.8) return topStyle as 'camelCase' | 'snake_case' | 'PascalCase';
  return 'mixed';
}

function scoreGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 60) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export function analyzeQuality(schema: Schema): QualityResult {
  const issues: QualityIssue[] = [];
  const stats: FieldStats = {
    total: 0,
    anyCount: 0,
    formattedCount: 0,
    semanticUnformatted: [],
    optionalCount: 0,
    requiredCount: 0,
    nameCounts: { camelCase: 0, snake_case: 0, PascalCase: 0, other: 0 },
    maxDepth: 0,
  };

  collectFields(schema, '', 0, stats, issues);

  let score = 100;

  // 1. any-type ratio — max -50pt (enough to reach D/F)
  if (stats.total > 0) {
    const anyRatio = stats.anyCount / stats.total;
    const anyPenalty = Math.round(anyRatio * 50);
    if (anyPenalty > 0) score -= anyPenalty;
  }

  // 2. Semantic string fields missing format — -5pt each, capped at -20pt
  if (stats.semanticUnformatted.length > 0) {
    const formatPenalty = Math.min(20, stats.semanticUnformatted.length * 5);
    score -= formatPenalty;
    for (const { path } of stats.semanticUnformatted.slice(0, 3)) {
      issues.push({
        severity: 'info',
        message: 'Looks like it needs a format constraint (uuid, email, datetime…)',
        path,
      });
    }
    if (stats.semanticUnformatted.length > 3) {
      issues.push({
        severity: 'info',
        message: `${stats.semanticUnformatted.length - 3} more fields may need format constraints`,
      });
    }
  }

  // 3. Naming consistency — -15pt for mixed camelCase/snake_case
  const style = dominantStyle(stats.nameCounts);
  if (style === 'mixed' && stats.total >= 2) {
    score -= 15;
    issues.push({ severity: 'warning', message: 'Field names mix camelCase and snake_case — pick one style consistently' });
  }

  // 4. Depth — -2pt per level beyond 4, capped at -10pt
  if (stats.maxDepth > 4) {
    const depthPenalty = Math.min(10, (stats.maxDepth - 4) * 2);
    score -= depthPenalty;
    if (stats.maxDepth > 6) {
      issues.push({ severity: 'warning', message: `Schema is ${stats.maxDepth} levels deep — consider flattening or splitting` });
    }
  }

  // 5. All-optional — -10pt
  if (stats.total >= 3 && stats.requiredCount === 0) {
    score -= 10;
    issues.push({ severity: 'warning', message: 'All fields are optional — mark required fields to improve type safety' });
  }

  // 6. Tiny schema bonus issue (informational only, no score change)
  if (stats.total === 1) {
    issues.push({ severity: 'info', message: 'Only 1 field — quality score is based on limited data' });
  }

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    grade: scoreGrade(score),
    issues,
    stats: {
      totalFields: stats.total,
      anyFields: stats.anyCount,
      formattedFields: stats.formattedCount,
      optionalFields: stats.optionalCount,
      requiredFields: stats.requiredCount,
      maxDepth: stats.maxDepth,
      namingStyle: style,
    },
  };
}
