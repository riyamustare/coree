import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const PRODUCT_NAME = 'coree Pro';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (error || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub as string;
    const email = (claims.claims.email as string) || undefined;

    const token = Deno.env.get('POLAR_ACCESS_TOKEN');
    if (!token) return json({ error: 'Payments are not configured yet' }, 500);
    const base = Deno.env.get('POLAR_SERVER') === 'sandbox' ? 'https://sandbox-api.polar.sh' : 'https://api.polar.sh';
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Find or create the ₹199/month subscription product.
    let productId = Deno.env.get('POLAR_PRODUCT_ID');
    if (!productId) {
      const list = await fetch(`${base}/v1/products/?query=${encodeURIComponent(PRODUCT_NAME)}&is_archived=false&is_recurring=true`, { headers });
      const listData = await list.json();
      productId = listData?.items?.find((p: any) => p.name === PRODUCT_NAME)?.id;
      if (!productId) {
        const created = await fetch(`${base}/v1/products/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: PRODUCT_NAME,
            description: 'Unlimited voice conversations with coree.',
            recurring_interval: 'month',
            prices: [{ amount_type: 'fixed', price_amount: 19900, price_currency: 'inr' }],
          }),
        });
        const p = await created.json();
        if (!created.ok) {
          console.error('Polar product error', p);
          return json({ error: 'Could not set up the plan' }, 500);
        }
        productId = p.id;
      }
    }

    let origin = 'https://www.thecoree.com';
    try {
      const body = await req.json();
      if (typeof body?.origin === 'string' && /^https?:\/\/[^\s]{1,200}$/.test(body.origin)) origin = body.origin;
    } catch { /* no body */ }

    const resp = await fetch(`${base}/v1/checkouts/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        products: [productId],
        external_customer_id: userId,
        customer_email: email,
        success_url: `${origin}/settings?upgraded=1&checkout_id={CHECKOUT_ID}`,
        metadata: { user_id: userId },
      }),
    });
    const data = await resp.json();
    if (!resp.ok || !data?.url) {
      console.error('Polar checkout error', resp.status, data);
      return json({ error: 'Could not start checkout' }, 500);
    }
    return json({ url: data.url });
  } catch (err) {
    console.error(err);
    return json({ error: 'Unexpected error' }, 500);
  }
});
