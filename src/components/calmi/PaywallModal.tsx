import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Loader2 } from "lucide-react";
import { useState } from "react";
import { startProCheckout } from "@/lib/razorpay";
import { toast } from "@/hooks/use-toast";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userEmail?: string;
  userName?: string;
}

export function PaywallModal({ open, onClose, onSuccess, userEmail, userName }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    await startProCheckout({
      userEmail,
      userName,
      onSuccess: () => {
        setLoading(false);
        toast({ title: "Welcome to Pro!", description: "Enjoy unlimited voice mode for 30 days." });
        onSuccess();
      },
      onDismiss: () => setLoading(false),
      onError: (msg) => {
        setLoading(false);
        toast({ title: "Payment failed", description: msg, variant: "destructive" });
      },
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5">
              <span className="inline-block rounded-full bg-primary/15 px-3 py-0.5 text-xs font-semibold text-primary mb-3">
                coree Pro
              </span>
              <h2 className="text-2xl font-bold text-foreground mb-1">Unlock voice mode</h2>
              <p className="text-sm text-muted-foreground">
                You've used your free voice session. Upgrade to keep talking with coree.
              </p>
            </div>

            <div className="mb-6 rounded-xl bg-background border border-border p-5">
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-foreground">₹199</span>
                <span className="text-sm text-muted-foreground">/ month</span>
              </div>
              <ul className="space-y-2.5">
                {[
                  "Unlimited voice conversations",
                  "Unlimited text conversations",
                  "Full session history & insights",
                  "Priority response quality",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="btn-duo w-full text-sm gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening secure checkout…
                </>
              ) : (
                "Upgrade to Pro"
              )}
            </button>

            <p className="text-[11px] text-muted-foreground text-center mt-3">
              Secure payment via Razorpay. One-time charge — renew manually next month.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}