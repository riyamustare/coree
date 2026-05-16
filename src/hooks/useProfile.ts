import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  onboarding_intent: string | null;
  onboarding_completed: boolean;
  genz_mode: boolean;
  theme: string;
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setProfile(null);
    setLoading(true);

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_intent, onboarding_completed, genz_mode, theme")
        .eq("id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        await supabase.from("profiles").insert({ id: userId } as any);
        setProfile({ onboarding_intent: null, onboarding_completed: false, genz_mode: false, theme: "light" });
      } else if (data) {
        setProfile(data as Profile);
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
      setProfile((prev) => prev ? { ...prev, onboarding_intent: intent, onboarding_completed: true } : prev);
    },
    [userId]
  );

  const setGenzMode = useCallback(
    async (enabled: boolean) => {
      if (!userId) return;
      await supabase.from("profiles").update({ genz_mode: enabled } as any).eq("id", userId);
      setProfile((prev) => prev ? { ...prev, genz_mode: enabled } : prev);
    },
    [userId]
  );

  const setTheme = useCallback(
    async (theme: string) => {
      if (!userId) return;
      await supabase.from("profiles").update({ theme } as any).eq("id", userId);
      setProfile((prev) => prev ? { ...prev, theme } : prev);
    },
    [userId]
  );

  return { profile, loading, completeOnboarding, setGenzMode, setTheme };
}
