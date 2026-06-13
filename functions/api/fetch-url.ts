// functions/api/fetch-url.ts
// Cloudflare Pages Function — server-side proxy for CORS-blocked URL imports.
// Called only as a fallback when the browser's direct fetch is blocked by CORS.

const MAX_BYTES = 524_288; // 512 KB

const BLOCKED_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
  /^https?:\/\/192\.168\./,
  /^https?:\/\/::1/,
];

export async function onRequestGet(context: any): Promise<Response> {
  const { searchParams } = new URL(context.request.url);
  const targetUrl = searchParams.get('url') ?? '';

  if (!targetUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }
  if (!targetUrl.startsWith('https://')) {
    return new Response('Only HTTPS URLs are allowed', { status: 400 });
  }
  if (BLOCKED_PATTERNS.some(re => re.test(targetUrl))) {
    return new Response('Private/loopback addresses are not allowed', { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(targetUrl, {
      headers: {
        'Accept': 'application/json, text/plain, application/yaml, */*',
        'User-Agent': 'TypeMorph-URLImport/1.0',
      },
      redirect: 'follow',
    });
  } catch (err: any) {
    return new Response(`Fetch failed: ${err?.message ?? 'unknown error'}`, { status: 502 });
  }

  if (!upstream.ok) {
    return new Response(`Upstream returned ${upstream.status} ${upstream.statusText}`, {
      status: upstream.status,
    });
  }

  // Stream up to MAX_BYTES — reject oversized responses
  const reader = upstream.body?.getReader();
  if (!reader) {
    return new Response('No response body', { status: 502 });
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BYTES) {
      reader.cancel();
      return new Response('Response too large (max 512 KB)', { status: 413 });
    }
    chunks.push(value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store',
    },
  });
}
