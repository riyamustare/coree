import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

// Standard Webhooks verification. Polar's secret is used as raw bytes.
function verify(secret: string, id: string, ts: string, body: string, sigHeader: string): boolean {
  const key = secret.startsWith('whsec_') ? Buffer.from(secret.slice(6), 'base64') : Buffer.from(secret, 'utf8');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest();
  return sigHeader.split(' ').some((part) => {
    const sig = part.split(',')[1];
    if (!sig) return false;
    const got = Buffer.from(sig, 'base64');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('POLAR_WEBHOOK_SECRET');
  if (!secret) return new Response('Not configured', { status: 500 });

  const body = await req.text();
  const id = req.headers.get('webhook-id') ?? '';
  const ts = req.headers.get('webhook-timestamp') ?? '';
  const sig = req.headers.get('webhook-signature') ?? '';
  if (!id || !ts || !sig || Math.abs(Date.now() / 1000 - Number(ts)) > 300 || !verify(secret, id, ts, body, sig)) {
    return new Response('Invalid signature', { status: 403 });
  }

  const event = JSON.parse(body);
  const type: string = event.type ?? '';
  const d = event.data ?? {};
  if (!type.startsWith('subscription.') || !d.id) return new Response('ignored', { status: 202 });

  const userId = d.customer?.external_id ?? d.metadata?.user_id;
  if (!userId) {
    console.error('Webhook missing user id', d.id);
    return new Response('ignored', { status: 202 });
  }

  // Polar status: active, canceled (may still be in paid period), revoked, past_due, unpaid, incomplete...
  const now = new Date();
  const periodEnd = d.current_period_end ? new Date(d.current_period_end) : now;
  let status = 'inactive';
  if (d.status === 'active' || (d.status === 'canceled' && periodEnd > now && type !== 'subscription.revoked')) status = 'active';
  else if (d.status) status = d.status;

  const row = {
    user_id: userId,
    plan: 'pro',
    status,
    amount: d.amount ?? 19900,
    currency: (d.currency ?? 'INR').toUpperCase(),
    polar_subscription_id: d.id,
    polar_customer_id: d.customer_id ?? d.customer?.id ?? null,
    current_period_start: d.current_period_start ?? now.toISOString(),
    current_period_end: status === 'active' ? periodEnd.toISOString() : now.toISOString(),
  };

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { error } = await admin.from('subscriptions').upsert(row, { onConflict: 'polar_subscription_id' });
  if (error) {
    console.error('Upsert failed', error);
    return new Response('db error', { status: 500 });
  }
  return new Response('ok', { status: 202 });
});
