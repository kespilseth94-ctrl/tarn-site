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
//
// Email alert: on every accepted submission, an internal notification is
// sent via Resend to a fixed internal address (never exposed to the
// submitter — the client only ever sees {ok:true} or {ok:false}). Requires
// a RESEND_API_KEY secret set via Workers & Pages > the tarn-site project >
// Settings > Variables and Secrets. Without that secret configured, sending
// is skipped (logged) — never blocks or fails the submission. Optionally,
// a FEEDBACK_ALERT_FROM secret/var can override the default sender once a
// domain is verified in Resend (e.g. "Tarn Feedback <alerts@tarnhome.com>").
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const ALLOWED_KINDS = new Set(['overall', 'overall_detail', 'finding', 'general']);
const ALERT_TO = 'kespilseth@verifihouse.com';
const KIND_LABELS: Record<string, string> = {
  overall: 'Overall report vote',
  overall_detail: 'Overall report vote (with detail)',
  finding: 'Finding-level vote',
  general: 'General feedback',
};

function clamp(value: unknown, max: number): string {
  return typeof value === 'string' ? value.slice(0, max) : '';
}

type FeedbackRecord = {
  kind: string;
  vote: 'up' | 'down' | null;
  city: string;
  address: string;
  category: string;
  message: string;
  detail: string;
  email: string;
  path: string;
  ts: number;
};

// Sends the internal alert email. Never throws — a Resend outage or a
// missing secret must never surface to (or slow down) the submitter beyond
// this one awaited call, and must never fail the request.
async function sendAlertEmail(record: FeedbackRecord): Promise<void> {
  const apiKey = (env as any)?.RESEND_API_KEY;
  if (!apiKey) {
    console.log('feedback alert email skipped (no RESEND_API_KEY configured)');
    return;
  }

  const label = KIND_LABELS[record.kind] ?? record.kind;
  const lines = [
    `Kind: ${label}`,
    record.vote ? `Vote: ${record.vote}` : null,
    record.city ? `City: ${record.city}` : null,
    record.address ? `Address: ${record.address}` : null,
    record.category ? `Category: ${record.category}` : null,
    record.message ? `Message: ${record.message}` : null,
    record.detail ? `Detail: ${record.detail}` : null,
    record.email ? `Submitter left an email (also set as reply-to): ${record.email}` : null,
    record.path ? `Page: ${record.path}` : null,
    `Time: ${new Date(record.ts).toISOString()}`,
  ].filter((l): l is string => Boolean(l));

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: (env as any)?.FEEDBACK_ALERT_FROM || 'Tarn Feedback <onboarding@resend.dev>',
        to: [ALERT_TO],
        ...(record.email ? { reply_to: [record.email] } : {}),
        subject: `Tarn feedback: ${label}`,
        text: lines.join('\n'),
      }),
    });
    if (!res.ok) {
      console.error('feedback alert email failed', res.status, await res.text());
    }
  } catch (e) {
    console.error('feedback alert email threw', e);
  }
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

  const record: FeedbackRecord = {
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

  // Internal alert — awaited so it actually runs before the Worker can
  // suspend post-response, but its own try/catch guarantees it never
  // delays failure or blocks the {ok:true} the submitter gets back.
  await sendAlertEmail(record);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
