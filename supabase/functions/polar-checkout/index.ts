import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const PRODUCT_NAME = 'core Pro';
const APP_ORIGIN = 'https://www.trycore.xyz';
const PAYMENTS_ENABLED = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProduct(value: unknown): value is { id: string; name: string } {
  return isRecord(value) && typeof value.id === 'string' && typeof value.name === 'string';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (!PAYMENTS_ENABLED) return json({ error: 'Payments are temporarily unavailable' }, 503);
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
      const listData: unknown = await list.json();
      const products = isRecord(listData) && Array.isArray(listData.items) ? listData.items : [];
      productId = products.find((product): product is { id: string; name: string } =>
        isProduct(product) && product.name === PRODUCT_NAME
      )?.id;
      if (!productId) {
        const created = await fetch(`${base}/v1/products/`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            name: PRODUCT_NAME,
            description: 'Unlimited voice conversations with core.',
            recurring_interval: 'month',
            prices: [{ amount_type: 'fixed', price_amount: 19900, price_currency: 'inr' }],
          }),
        });
        const product: unknown = await created.json();
        if (!created.ok) {
          console.error('Polar product error', product);
          return json({ error: 'Could not set up the plan' }, 500);
        }
        if (!isProduct(product)) return json({ error: 'Could not set up the plan' }, 500);
        productId = product.id;
      }
    }

    const resp = await fetch(`${base}/v1/checkouts/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        products: [productId],
        external_customer_id: userId,
        customer_email: email,
        success_url: `${APP_ORIGIN}/settings?upgraded=1&checkout_id={CHECKOUT_ID}`,
        metadata: { user_id: userId },
      }),
    });
    const data: unknown = await resp.json();
    if (!resp.ok || !isRecord(data) || typeof data.url !== 'string') {
      console.error('Polar checkout error', resp.status, data);
      return json({ error: 'Could not start checkout' }, 500);
    }
    return json({ url: data.url });
  } catch (err) {
    console.error(err);
    return json({ error: 'Unexpected error' }, 500);
  }
});
