import { supabase } from "@/integrations/supabase/client";

/** Redirects the user to Dodo Payments hosted checkout for coree Pro. */
export async function startProCheckout(): Promise<{ error?: string }> {
  const { data, error } = await supabase.functions.invoke("dodo-create-checkout", {
    body: { returnUrl: `${window.location.origin}/settings?upgraded=1` },
  });
  if (error || !data?.url) return { error: data?.error || "Could not open checkout. Please try again." };
  window.location.href = data.url;
  return {};
}
