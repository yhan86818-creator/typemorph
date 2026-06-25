interface Env {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DB: any;
  ADMIN_PASSWORD: string;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const { password } = await context.request.json() as { password: string };
    const expected = context.env.ADMIN_PASSWORD;

    // No hardcoded fallback: if the secret is not configured, the endpoint is
    // closed rather than guessable.
    if (!expected) {
      return new Response(JSON.stringify({ error: 'Admin access not configured' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!password || password !== expected) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { results } = await context.env.DB
      .prepare('SELECT * FROM feedback ORDER BY rowid DESC LIMIT 500')
      .all();

    return new Response(JSON.stringify({ ok: true, rows: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
