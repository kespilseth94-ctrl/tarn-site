// POST /api/feedback — captures buyer feedback on report output: the
// per-finding "Is this right?" micro-ask and the overall "Was this report
// accurate and useful?" ask (plus its optional one-line follow-up) on
// results.astro. Also captures general, ungated feedback from the "Have
// thoughts on Tarn?" form in Footer.astro (kind: 'general'), which appears
// on every page and accepts a free-text message plus an optional email.
//
// Storage: Cloudflare KV, binding name FEEDBACK_KV. This code does not (and
// cannot) create that binding — KV namespaces for a Workers Builds project
// without a committed wrangler config are created and bound from the
// Cloudflare dashboard (Workers & Pages > the tarn-site project > Settings >
// Bindings > Add > KV Namespace, variable name FEEDBACK_KV). Until that
// one-time step is done, submissions are still accepted (200 OK) and logged
// via console.log so they're visible in Workers live logs, but not
// persisted — the report page should never break or show an error over a
// feedback storage gap.
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ALLOWED_KINDS = new Set(['overall', 'overall_detail', 'finding', 'general']);

function clamp(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const kind = typeof body?.kind === 'string' ? body.kind : '';
  const vote = body?.vote === 'up' || body?.vote === 'down' ? body.vote : null;

  if (!ALLOWED_KINDS.has(kind)) {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_payload' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const record = {
    kind,
    vote,
    city: clamp(body?.city, 100),
    address: clamp(body?.address, 150),
    category: clamp(body?.category, 100),
    message: clamp(body?.message, 1000),
    detail: clamp(body?.detail, 300),
    email: clamp(body?.email, 200),
    path: clamp(body?.path, 300),
    ts: Date.now(),
  };

  const kv = (env as any)?.FEEDBACK_KV;
  if (kv) {
    const key = `fb:${record.ts}:${crypto.randomUUID()}`;
    try {
      await kv.put(key, JSON.stringify(record));
    } catch (e) {
      // A storage hiccup shouldn't surface to the buyer — log and move on.
      console.error('feedback KV put failed', e);
    }
  } else {
    // FEEDBACK_KV binding not yet configured — see the header comment above.
    console.log('feedback (no FEEDBACK_KV binding configured):', record);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
