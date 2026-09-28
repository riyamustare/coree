import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { Buffer } from 'node:buffer';

// Verifies Standard Webhooks signatures used by Dodo Payments.
function verify(secret: string, id: string, ts: string, body: string, sigHeader: string): boolean {
  const key = Buffer.from(secret.startsWith('whsec_') ? secret.slice(6) : secret, 'base64');
  const expected = createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest();
  return sigHeader.split(' ').some((part) => {
    const [, sig] = part.split(',');
    if (!sig) return false;
    const got = Buffer.from(sig, 'base64');
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const secret = Deno.env.get('DODO_WEBHOOK_SECRET');
  if (!secret) return new Response('Not configured', { status: 500 });

  const body = await req.text();
  const id = req.headers.get('webhook-id') ?? '';
  const ts = req.headers.get('webhook-timestamp') ?? '';
  const sig = req.headers.get('webhook-signature') ?? '';
  if (!id || !ts || !sig || Math.abs(Date.now() / 1000 - Number(ts)) > 300 || !verify(secret, id, ts, body, sig)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const event = JSON.parse(body);
  const type: string = event.type;
  const d = event.data ?? {};
  if (!type?.startsWith('subscription.') || !d.subscription_id) return new Response('ignored');

  const userId = d.metadata?.user_id;
  if (!userId) {
    console.error('Webhook missing user_id metadata', d.subscription_id);
    return new Response('ignored');
  }

  const statusMap: Record<string, string> = {
    'subscription.active': 'active',
    'subscription.renewed': 'active',
    'subscription.plan_changed': 'active',
    'subscription.on_hold': 'on_hold',
    'subscription.failed': 'failed',
    'subscription.cancelled': 'cancelled',
    'subscription.expired': 'expired',
  };
  const status = statusMap[type];
  if (!status) return new Response('ignored');

  const now = new Date();
  const periodEnd = d.next_billing_date
    ? new Date(d.next_billing_date)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const row: Record<string, unknown> = {
    user_id: userId,
    plan: 'pro',
    status,
    amount: d.recurring_pre_tax_amount ?? 19900,
    currency: d.currency ?? 'INR',
    dodo_subscription_id: d.subscription_id,
    dodo_customer_id: d.customer?.customer_id ?? null,
  };
  // Cancelled subs keep access until the paid period ends.
  if (status === 'cancelled') row.status = 'active';
  if (status === 'active' || status === 'cancelled') {
    row.current_period_end = periodEnd.toISOString();
    if (d.previous_billing_date) row.current_period_start = new Date(d.previous_billing_date).toISOString();
  } else {
    row.current_period_end = now.toISOString();
  }

  const { error } = await admin.from('subscriptions').upsert(row, { onConflict: 'dodo_subscription_id' });
  if (error) {
    console.error('Upsert failed', error);
    return new Response('db error', { status: 500 });
  }
  return new Response('ok');
});
