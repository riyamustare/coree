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

    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;
    if (!messages || messages.length === 0) {
      await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString() })
        .eq("id", sessionId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();

    if (!session) throw new Error("Session not found");

    const conversationText = messages
      .map((m: any) => `${m.role === "user" ? "User" : "Calmi"}: ${m.content}`)
      .join("\n");

    // Run summary and emotion extraction in parallel for speed
    const [summaryResponse, emotionResponse] = await Promise.all([
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Summarize this emotional support conversation in 2-3 concise sentences. Focus on the user's main emotions, concerns, and any coping methods or goals mentioned.`,
            },
            { role: "user", content: conversationText },
          ],
        }),
      }),
      fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `Analyze this conversation and rate the following emotions on a scale of 0-100 based on how present they were in the USER's messages only. Return ONLY a valid JSON object, no other text. Keys: happiness, sadness, anger, fear, surprise, disgust. Example: {"happiness":20,"sadness":60,"anger":10,"fear":30,"surprise":5,"disgust":0}`,
            },
            { role: "user", content: conversationText },
          ],
        }),
      }),
    ]);

    let summary = "";
    let emotions = null;

    if (summaryResponse.ok) {
      const summaryData = await summaryResponse.json();
      summary = summaryData.choices?.[0]?.message?.content || "";
    }

    if (emotionResponse.ok) {
      try {
        const emotionData = await emotionResponse.json();
        const emotionText = emotionData.choices?.[0]?.message?.content || "";
        // Try to extract JSON from the response
        const jsonMatch = emotionText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Validate it has the expected keys
          const keys = ["happiness", "sadness", "anger", "fear", "surprise", "disgust"];
          const valid = keys.every((k) => typeof parsed[k] === "number");
          if (valid) {
            emotions = parsed;
          }
        }
      } catch (err) {
        console.error("Emotion extraction parse error:", err);
      }
    }

    console.log("Session end - summary length:", summary.length, "emotions:", JSON.stringify(emotions));

    // Update session
    await supabase
      .from("sessions")
      .update({ ended_at: new Date().toISOString(), summary, emotions })
      .eq("id", sessionId);

    // Store memory
    if (summary) {
      await supabase.from("memories").insert({
        user_id: session.user_id,
        content: summary,
        source_session_id: sessionId,
      });
    }

    return new Response(JSON.stringify({ success: true, emotions }), {
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
