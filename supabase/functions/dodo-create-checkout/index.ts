import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

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

    const apiKey = Deno.env.get('DODO_PAYMENTS_API_KEY');
    const productId = Deno.env.get('DODO_PRODUCT_ID');
    if (!apiKey || !productId) return json({ error: 'Payments are not configured yet' }, 500);
    const base = Deno.env.get('DODO_ENV') === 'live' ? 'https://live.dodopayments.com' : 'https://test.dodopayments.com';

    let returnUrl = 'https://www.thecoree.com/settings?upgraded=1';
    try {
      const body = await req.json();
      if (typeof body?.returnUrl === 'string' && /^https?:\/\//.test(body.returnUrl) && body.returnUrl.length < 500) {
        returnUrl = body.returnUrl;
      }
    } catch { /* no body */ }

    const resp = await fetch(`${base}/checkouts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_cart: [{ product_id: productId, quantity: 1 }],
        customer: email ? { email } : undefined,
        return_url: returnUrl,
        metadata: { user_id: userId },
      }),
    });
    const data = await resp.json();
    if (!resp.ok || !data?.checkout_url) {
      console.error('Dodo checkout error', resp.status, data);
      return json({ error: 'Could not start checkout' }, 500);
    }
    return json({ url: data.checkout_url });
  } catch (err) {
    console.error(err);
    return json({ error: 'Unexpected error' }, 500);
  }
});
