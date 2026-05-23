import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { trackScreenViewed } from "@/lib/analytics";
import { CalmiShell } from "./CalmiShell";

interface SettingsScreenProps {
  userId: string;
  userEmail: string;
  onGoHome: () => void;
  onViewInsights: () => void;
  onViewHistory: () => void;
  onOpenNotes: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  genzMode: boolean;
  onGenzToggle: (enabled: boolean) => void;
}

export function SettingsScreen({ userId, userEmail, onGoHome, onViewInsights, onViewHistory, onOpenNotes, onOpenSettings, onSignOut, genzMode, onGenzToggle }: SettingsScreenProps) {
  const [resetConfirm, setResetConfirm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);

  useEffect(() => {
    trackScreenViewed("settings");
    const fetchUsage = async () => {
      const [sessions, messages] = await Promise.all([
        supabase.from("sessions").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ]);
      setSessionCount(sessions.count || 0);
      setMessageCount(messages.count || 0);
    };
    fetchUsage();
  }, [userId]);

  const handleResetHistory = async () => {
    await supabase.from("messages").delete().eq("user_id", userId);
    await supabase.from("sessions").delete().eq("user_id", userId);
    await supabase.from("memories").delete().eq("user_id", userId);
    await supabase.from("notes").delete().eq("user_id", userId);
    setResetConfirm(false);
    setSessionCount(0);
    setMessageCount(0);
  };

  const handleDeleteAccount = async () => {
    await supabase.from("messages").delete().eq("user_id", userId);
    await supabase.from("sessions").delete().eq("user_id", userId);
    await supabase.from("memories").delete().eq("user_id", userId);
    await supabase.from("notes").delete().eq("user_id", userId);
    await supabase.from("feedback").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);
    await supabase.auth.signOut();
  };

  return (
    <CalmiShell
      userId={userId}
      genzMode={genzMode}
      onGenzToggle={onGenzToggle}
      onGoHome={onGoHome}
      onViewInsights={onViewInsights}
      onViewHistory={onViewHistory}
      onOpenNotes={onOpenNotes}
      onOpenSettings={onOpenSettings}
      onSignOut={onSignOut}
    >
      <div className="flex min-h-screen flex-col bg-[#FAF7F2] px-4 py-6">
        <div className="mx-auto w-full max-w-md">
          

          {/* User info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary" aria-hidden="true" />
            <p className="text-sm text-foreground">{userEmail}</p>
          </div>
        </motion.div>


        {/* Usage analytics */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-1">usage analytics</h2>
          <p className="text-xs text-muted-foreground mb-3">how much you've used core</p>
          <div className="rounded-2xl bg-surface px-5 py-4 shadow-soft space-y-3">
            <span className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary">free</span>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">sessions</span>
              <span className="text-foreground font-medium">{sessionCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">messages</span>
              <span className="text-foreground font-medium">{messageCount}</span>
            </div>
          </div>
        </motion.div>

        <hr className="border-border-color mb-6" />

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
          <h2 className="text-base font-semibold text-foreground mb-1">danger zone</h2>
          <p className="text-xs text-muted-foreground mb-4">be careful with these settings</p>

          <div className="space-y-4">
            {/* Reset chat history */}
            {!resetConfirm ? (
              <div>
                <button
                  onClick={() => setResetConfirm(true)}
                  className="rounded-xl border border-border-color px-4 py-2 text-sm font-medium text-foreground hover:bg-surface transition"
                >
                  reset chat history
                </button>
                <p className="text-xs text-muted-foreground mt-1.5">
                  this will reset all of your previous conversations and you start from a clean slate. core will not remember what you've talked about earlier.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-surface p-5 shadow-soft"
              >
                <h3 className="text-base font-semibold text-foreground mb-1">reset chat history – be careful!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  if you confirm, your chat history will be reset and core won't remember anything you've chatted about.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResetConfirm(false)}
                    className="rounded-xl border border-border-color px-4 py-2 text-sm font-medium text-foreground hover:bg-surface transition"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleResetHistory}
                    className="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition"
                  >
                    reset chat history
                  </button>
                </div>
              </motion.div>
            )}

            {/* Delete account */}
            {!deleteConfirm ? (
              <div>
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition"
                >
                  delete account
                </button>
                <p className="text-xs text-muted-foreground mt-1.5">
                  this will delete your account and everything related to it. be careful, it cannot be undone.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-2xl bg-surface p-5 shadow-soft"
              >
                <h3 className="text-base font-semibold text-foreground mb-1">delete account – this is permanent!</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  all your data will be permanently deleted. this action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="rounded-xl border border-border-color px-4 py-2 text-sm font-medium text-foreground hover:bg-surface transition"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="rounded-xl bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition"
                  >
                    delete account
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>

        <div className="text-center pb-8">
          <button
            onClick={onSignOut}
            className="text-xs text-muted-foreground hover:text-foreground transition"
          >
            log out
          </button>
        </div>
      </div>
    </div>
  </CalmiShell>
  );
}
