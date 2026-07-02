import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
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
  isPro?: boolean;
  currentPeriodEnd?: string | null;
  onUpgrade?: () => void;
}

export function SettingsScreen({ userId, userEmail, onGoHome, onViewInsights, onViewHistory, onOpenNotes, onOpenSettings, onSignOut, genzMode, onGenzToggle, isPro, currentPeriodEnd, onUpgrade }: SettingsScreenProps) {
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
      <div className="flex min-h-screen flex-col bg-background px-4 py-6 pt-16 md:pt-6">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-primary mb-1">your space</p>
            <h1 className="text-3xl sm:text-4xl font-black lowercase tracking-tight text-foreground">settings</h1>
          </div>

          {/* User info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="card-duo flex items-center gap-3 p-4">
            <div className="h-12 w-12 rounded-2xl bg-primary border-2 border-primary flex items-center justify-center text-primary-foreground font-black text-lg lowercase">
              {userEmail?.[0] || "u"}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">signed in as</p>
              <p className="text-sm font-bold text-foreground truncate">{userEmail}</p>
            </div>
          </div>
        </motion.div>


        {/* Usage analytics */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">usage</h2>
          <p className="text-xs text-muted-foreground mb-3 font-medium lowercase">how much you've used coree</p>
          <div className="card-duo px-5 py-4 space-y-3">
            <span className="inline-block rounded-full border-2 border-primary bg-primary/10 px-3 py-0.5 text-[11px] font-black uppercase tracking-wider text-primary">
              {isPro ? "pro" : "free"}
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border-2 border-border-color bg-background px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">sessions</p>
                <p className="text-2xl font-black text-foreground">{sessionCount}</p>
              </div>
              <div className="rounded-xl border-2 border-border-color bg-background px-3 py-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">messages</p>
                <p className="text-2xl font-black text-foreground">{messageCount}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Subscription / Upgrade */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground mb-1">subscription</h2>
          <p className="text-xs text-muted-foreground mb-3 font-medium lowercase">
            {isPro ? "you're on the pro plan" : "unlock unlimited voice mode"}
          </p>
          {isPro ? (
            <div className="card-duo px-5 py-4 border-primary/60 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-black lowercase text-foreground">coree pro</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium lowercase">
                renews on{" "}
                {currentPeriodEnd
                  ? new Date(currentPeriodEnd).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
          ) : (
            <div className="card-duo px-5 py-4">
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-3xl font-black text-foreground">₹199</span>
                <span className="text-xs text-muted-foreground font-bold lowercase">/ month</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3 font-medium lowercase">
                unlimited voice conversations, priority responses.
              </p>
              <button
                onClick={onUpgrade}
                className="btn-duo w-full text-sm py-3 gap-2"
              >
                <Sparkles className="h-4 w-4" />
                upgrade to pro
              </button>
            </div>
          )}
        </motion.div>

        <hr className="border-border-color border-t-2 mb-6" />

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-destructive mb-1">danger zone</h2>
          <p className="text-xs text-muted-foreground mb-4 font-medium lowercase">be careful with these settings</p>

          <div className="space-y-4">
            {/* Reset chat history */}
            {!resetConfirm ? (
              <div>
                <button
                  onClick={() => setResetConfirm(true)}
                  className="btn-duo-secondary text-xs py-2.5 px-4"
                >
                  reset chat history
                </button>
                <p className="text-xs text-muted-foreground mt-2 font-medium lowercase">
                  this will reset all of your previous conversations and you start from a clean slate. core will not remember what you've talked about earlier.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-duo p-5"
              >
                <h3 className="text-base font-black lowercase text-foreground mb-1">reset chat history - be careful!</h3>
                <p className="text-sm text-muted-foreground mb-4 font-medium lowercase">
                  if you confirm, your chat history will be reset and core won't remember anything you've chatted about.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setResetConfirm(false)}
                    className="btn-duo-secondary text-xs py-2.5 px-4"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleResetHistory}
                    className="rounded-2xl bg-destructive text-destructive-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wide hover:brightness-105 transition"
                    style={{ boxShadow: "0 4px 0 0 hsl(0 62% 25%)" }}
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
                  className="rounded-2xl bg-destructive text-destructive-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wide hover:brightness-105 transition"
                  style={{ boxShadow: "0 4px 0 0 hsl(0 62% 25%)" }}
                >
                  delete account
                </button>
                <p className="text-xs text-muted-foreground mt-2 font-medium lowercase">
                  this will delete your account and everything related to it. be careful, it cannot be undone.
                </p>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-duo p-5"
              >
                <h3 className="text-base font-black lowercase text-foreground mb-1">delete account - this is permanent!</h3>
                <p className="text-sm text-muted-foreground mb-4 font-medium lowercase">
                  all your data will be permanently deleted. this action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="btn-duo-secondary text-xs py-2.5 px-4"
                  >
                    cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    className="rounded-2xl bg-destructive text-destructive-foreground px-4 py-2.5 text-xs font-bold uppercase tracking-wide hover:brightness-105 transition"
                    style={{ boxShadow: "0 4px 0 0 hsl(0 62% 25%)" }}
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
            className="text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition"
          >
            log out
          </button>
        </div>
      </div>
    </div>
  </CalmiShell>
  );
}
