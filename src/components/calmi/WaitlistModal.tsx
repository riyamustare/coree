import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, MapPin } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const waitlistSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  phone: z
    .string()
    .trim()
    .min(5, "Phone number is too short")
    .max(32)
    .regex(/^[+\d\s\-()]+$/, "Enter a valid phone number"),
  email: z.string().trim().email("Enter a valid email").max(255),
  looking_for: z.string().trim().min(1, "Tell us what you're looking for").max(500),
});

interface WaitlistModalProps {
  open: boolean;
  onClose: () => void;
}

export function WaitlistModal({ open, onClose }: WaitlistModalProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>("");
  const { toast } = useToast();

  const reset = () => {
    setName(""); setPhone(""); setEmail(""); setLookingFor("");
    setDone(false); setError(""); setLoading(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const parsed = waitlistSchema.safeParse({ name, phone, email, looking_for: lookingFor });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please check your details");
      return;
    }
    setLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const { error: insertError } = await supabase.from("waitlist").insert({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        looking_for: parsed.data.looking_for,
        city: "Bangalore",
        user_id: userRes?.user?.id ?? null,
      });
      if (insertError) {
        if (insertError.code === "23505") {
          setError("You're already on the waitlist. We'll be in touch soon.");
        } else {
          throw insertError;
        }
        setLoading(false);
        return;
      }
      setDone(true);
      toast({ title: "you're on the list", description: "we'll reach out when spots open up in bangalore." });
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="card-duo bg-card w-full max-w-md p-6 sm:p-7 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-full flex items-center justify-center bg-muted hover:bg-muted/70 transition"
              aria-label="close"
            >
              <X className="h-4 w-4" strokeWidth={2.5} />
            </button>

            {!done ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border-2 border-primary/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                    <Sparkles className="h-3 w-3" strokeWidth={2.75} /> coming soon
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <MapPin className="h-3 w-3" strokeWidth={2.75} /> bangalore
                  </span>
                </div>
                <h2 className="text-2xl font-black text-foreground lowercase leading-tight mb-1">
                  find your people
                </h2>
                <p className="text-sm text-muted-foreground font-medium lowercase mb-5">
                  invite-only community to meet people who match your vibe. join the waitlist.
                </p>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">your name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="name"
                      maxLength={120}
                      className="w-full px-4 py-3 bg-background text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">phone</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98xxxxxxxx"
                      maxLength={32}
                      className="w-full px-4 py-3 bg-background text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      maxLength={255}
                      className="w-full px-4 py-3 bg-background text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-foreground mb-1.5">what are you looking for?</label>
                    <textarea
                      value={lookingFor}
                      onChange={(e) => setLookingFor(e.target.value)}
                      placeholder="new friends, weekend hangs, coffee chats, run buddies..."
                      maxLength={500}
                      rows={3}
                      className="w-full px-4 py-3 bg-background text-foreground border-2 border-border-color rounded-2xl focus:outline-none focus:border-primary text-sm font-medium placeholder:text-muted-foreground transition resize-none"
                      required
                    />
                  </div>

                  {error && (
                    <div className="text-destructive text-sm font-medium lowercase bg-destructive/10 border-2 border-destructive/30 rounded-xl px-3 py-2">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-duo w-full py-3.5 text-sm mt-1"
                  >
                    {loading ? "joining..." : "join the waitlist"}
                  </button>

                  <p className="text-[11px] text-muted-foreground font-medium lowercase text-center pt-1">
                    currently for bangalore only · invite-only rollout
                  </p>
                </form>
              </>
            ) : (
              <div className="text-center py-6">
                <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mb-4">
                  <Sparkles className="h-6 w-6 text-primary" strokeWidth={2.5} />
                </div>
                <h2 className="text-2xl font-black text-foreground lowercase mb-2">you're in ✨</h2>
                <p className="text-sm text-muted-foreground font-medium lowercase max-w-xs mx-auto">
                  we'll reach out on your phone or email when the first bangalore invites go out.
                </p>
                <button
                  onClick={handleClose}
                  className="btn-duo mt-6 px-6 py-3 text-sm"
                >
                  done
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
