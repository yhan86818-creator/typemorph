/**
 * GA4 custom events (measurement ID is configured in layout.tsx).
 * Events appear in GA4 → Reports → Engagement → Events (may take 24–48h).
 */

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
  }
}

export type AnalyticsEvent =
  | 'workbench_open'
  | 'convert_success'
  | 'pro_click'
  | 'infer_worker_fallback'
  | 'infer_error'
  | 'infer_unsupported_output';

function gtagEvent(event: AnalyticsEvent, params?: Record<string, string>) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('event', event, params);
}

const sessionKey = (name: string) => `typemorph_analytics_${name}`;

/** User opened the main converter workbench (once per browser session). */
export function trackWorkbenchOpen(converterSlug: string) {
  if (typeof window === 'undefined') return;
  if (sessionStorage.getItem(sessionKey('workbench_open'))) return;
  sessionStorage.setItem(sessionKey('workbench_open'), '1');
  gtagEvent('workbench_open', {
    converter_slug: converterSlug || 'unknown',
  });
}

/** First successful schema conversion in this session (deduped by input fingerprint). */
export function trackConvertSuccess(converterSlug: string, outputLang: string) {
  gtagEvent('convert_success', {
    converter_slug: converterSlug || 'unknown',
    output_lang: outputLang || 'typescript',
  });
}

/** User clicked a Pro / Gumroad / pricing CTA. */
export function trackProClick(linkSource: string) {
  gtagEvent('pro_click', {
    link_source: linkSource,
  });
}

/** Dedupe convert_success for the same pasted payload within a session. */
export function shouldReportConvert(inputFingerprint: string): boolean {
  if (typeof window === 'undefined') return false;
  const key = sessionKey('convert');
  const prev = sessionStorage.getItem(key);
  if (prev === inputFingerprint) return false;
  sessionStorage.setItem(key, inputFingerprint);
  return true;
}

export function trackInferenceFallback(reason: string, params?: Record<string, string>) {
  gtagEvent('infer_worker_fallback', { reason, ...params });
}

export function trackInferenceError(reason: string, params?: Record<string, string>) {
  gtagEvent('infer_error', { reason, ...params });
}

export function trackUnsupportedOutputTarget(target: string, requested: string) {
  gtagEvent('infer_unsupported_output', {
    target,
    requested,
  });
}
