import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    Razorpay: any;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export interface StartCheckoutOpts {
  userEmail?: string;
  userName?: string;
  onSuccess: () => void;
  onDismiss?: () => void;
  onError?: (msg: string) => void;
}

export async function startProCheckout(opts: StartCheckoutOpts) {
  const ok = await loadRazorpayScript();
  if (!ok) {
    opts.onError?.("Failed to load payment gateway");
    return;
  }

  const { data, error } = await supabase.functions.invoke("razorpay-create-order", {
    body: {},
  });
  if (error || !data?.orderId) {
    opts.onError?.(error?.message || "Failed to create order");
    return;
  }

  const rzp = new window.Razorpay({
    key: data.keyId,
    amount: data.amount,
    currency: data.currency,
    order_id: data.orderId,
    name: "coree Pro",
    description: "Unlimited voice mode — 1 month",
    theme: { color: "#277BD9" },
    prefill: {
      email: opts.userEmail || "",
      name: opts.userName || "",
    },
    modal: {
      ondismiss: () => opts.onDismiss?.(),
    },
    handler: async (response: any) => {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
        "razorpay-verify-payment",
        {
          body: {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          },
        }
      );
      if (verifyError || !verifyData?.success) {
        opts.onError?.(verifyError?.message || "Payment verification failed");
        return;
      }
      opts.onSuccess();
    },
  });
  rzp.open();
}