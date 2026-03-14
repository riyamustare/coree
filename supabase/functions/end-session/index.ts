import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all messages from the session
    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;
    if (!messages || messages.length === 0) {
      // No messages, just mark session as ended
      await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get session to find user_id
    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");

    // Generate summary and extract emotional insights
    const conversationText = messages
      .map((m: any) => `${m.role === "user" ? "User" : "Calmi"}: ${m.content}`)
      .join("\n");

    const summaryResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `Summarize this emotional support conversation in 2-3 concise sentences. Focus on:
- The user's main emotions and concerns
- Any coping methods or goals mentioned
- Important life situations discussed

Format as a brief, factual summary that can be used as memory for future sessions.`,
          },
          { role: "user", content: conversationText },
        ],
      }),
    });

    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      const summary = summaryData.choices?.[0]?.message?.content || "";

      // Update session with summary
      await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString(), summary })
        .eq("id", sessionId);

      // Store as memory
      if (summary) {
        await supabase.from("memories").insert({
          user_id: session.user_id,
          content: summary,
          source_session_id: sessionId,
        });
      }
    } else {
      // Just end the session without summary
      await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("end-session error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
