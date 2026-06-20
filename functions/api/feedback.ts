interface Env {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  DB: any;
}

export async function onRequestPost(context: { request: Request; env: Env }) {
  try {
    const body = await context.request.json() as Record<string, unknown>;
    const { source, message, vote, context: feedbackContext } = body;

    if (!source || !['modal', 'mini'].includes(source as string)) {
      return new Response(JSON.stringify({ error: 'Invalid source' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await context.env.DB
      .prepare('INSERT INTO feedback (source, message, vote, context) VALUES (?, ?, ?, ?)')
      .bind(
        source as string,
        (message as string) ?? null,
        (vote as string) ?? null,
        (feedbackContext as string) ?? null,
      )
      .run();

    return new Response(JSON.stringify({ ok: true }), {
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
