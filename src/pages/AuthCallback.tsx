import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function AuthCallback() {
  useEffect(() => {
    const handle = async () => {
      try {
        const url = new URL(window.location.href);
        const hash = window.location.hash.replace(/^#/, "");
        const params = new URLSearchParams(hash || url.search);
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        if (access_token && refresh_token) {
          await supabase.auth.setSession({ access_token, refresh_token });
        }
      } catch (e) {
        // ignore
      } finally {
        window.location.replace("/");
      }
    };
    handle();
  }, []);

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="text-sm text-gray-600">Signing you in…</div>
    </div>
  );
}
