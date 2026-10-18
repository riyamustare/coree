import { supabase } from "@/integrations/supabase/client";

export const PAYMENTS_ENABLED = false;

/** Redirects the user to Polar hosted checkout for the core Pro subscription. */
export async function startProCheckout(): Promise<{ error?: string }> {
  if (!PAYMENTS_ENABLED) {
    return { error: "Payments are temporarily unavailable." };
  }

  const { data, error } = await supabase.functions.invoke("polar-checkout", {
    body: { origin: window.location.origin },
  });
  if (error || !data?.url) return { error: data?.error || "Could not open checkout. Please try again." };
  window.location.href = data.url;
  return {};
}
