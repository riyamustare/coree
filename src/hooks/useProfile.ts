import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  onboarding_intent: string | null;
  onboarding_completed: boolean;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_intent, onboarding_completed")
        .eq("id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // No profile yet — create one
        await supabase.from("profiles").insert({ id: userId } as any);
        setProfile({ onboarding_intent: null, onboarding_completed: false });
      } else if (data) {
        setProfile(data);
      }
      setLoading(false);
    };

    fetchProfile();
  }, [userId]);

  const completeOnboarding = useCallback(
    async (intent: string) => {
      if (!userId) return;
      await supabase
        .from("profiles")
        .update({ onboarding_intent: intent, onboarding_completed: true } as any)
        .eq("id", userId);
      setProfile({ onboarding_intent: intent, onboarding_completed: true });
    },
    [userId]
  );

  return { profile, loading: loading, completeOnboarding };
}
