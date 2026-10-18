import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PAYMENTS_ENABLED } from "@/lib/payments";

export interface SubscriptionState {
  isPro: boolean;
  currentPeriodEnd: string | null;
  voiceSessionCount: number;
  loading: boolean;
}

export const FREE_VOICE_LIMIT = 1;

export function useSubscription(userId: string | undefined) {
  const [state, setState] = useState<SubscriptionState>({
    isPro: false,
    currentPeriodEnd: null,
    voiceSessionCount: 0,
    loading: true,
  });

  const refresh = useCallback(async () => {
    if (!PAYMENTS_ENABLED) {
      setState({
        isPro: false,
        currentPeriodEnd: null,
        voiceSessionCount: 0,
        loading: false,
      });
      return;
    }
    if (!userId) {
      setState({ isPro: false, currentPeriodEnd: null, voiceSessionCount: 0, loading: false });
      return;
    }
    setState((s) => ({ ...s, loading: true }));

    const nowIso = new Date().toISOString();
    const [subRes, countRes] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("current_period_end, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .gt("current_period_end", nowIso)
        .order("current_period_end", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc("count_qualifying_voice_sessions", { _user_id: userId }),
    ]);

    const sub = subRes.data as { current_period_end: string } | null;
    const count = (countRes.data as number | null) ?? 0;

    setState({
      isPro: !!sub,
      currentPeriodEnd: sub?.current_period_end || null,
      voiceSessionCount: count,
      loading: false,
    });
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const canStartVoice =
    !PAYMENTS_ENABLED ||
    state.isPro ||
    state.voiceSessionCount < FREE_VOICE_LIMIT;

  return { ...state, canStartVoice, refresh };
}