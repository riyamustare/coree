import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { trackFeedbackSubmitted } from "@/lib/analytics";

interface FeedbackModalProps {
  userId: string;
  open: boolean;
  onClose: () => void;
}

export function FeedbackModal({ userId, open, onClose }: FeedbackModalProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("feedback" as any)
      .insert({ user_id: userId, content: content.trim() } as any);
    setSubmitting(false);
    if (error) {
      toast.error("Failed to send feedback");
    } else {
      trackFeedbackSubmitted();
      toast.success("Thanks for your feedback!");
      setContent("");
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm px-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-active"
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="how can we improve core?"
              className="w-full resize-y rounded-xl border border-border-color bg-background p-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[120px]"
              autoFocus
            />
            <div className="flex items-center justify-between mt-4">
              <button
                onClick={onClose}
                className="text-sm font-medium text-foreground hover:text-muted-foreground transition"
              >
                cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || submitting}
                className="text-sm font-medium text-primary hover:text-primary/80 transition disabled:opacity-40"
              >
                {submitting ? "sending..." : "submit"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
