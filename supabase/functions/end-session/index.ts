import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_API_URL = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

async function callGemini(apiKey: string, systemPrompt: string, userText: string, maxTokens = 300): Promise<string> {
  const resp = await fetch(GOOGLE_API_URL(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Gemini error:", resp.status, err);
    return "";
  }

  const json = await resp.json();
  return json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("EXT_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("EXT_SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: messages, error: msgError } = await supabase
      .from("messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (msgError) throw msgError;

    if (!messages || messages.length === 0) {
      await supabase.from("sessions").update({ ended_at: new Date().toISOString() }).eq("id", sessionId);
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
      .map((m: any) => `${m.role === "user" ? "User" : "Core"}: ${m.content}`)
      .join("\n");

    // Run summary and emotion extraction in parallel
    const [summaryText, emotionText] = await Promise.all([
      callGemini(
        GOOGLE_API_KEY,
        "Summarize this emotional support conversation in 2-3 concise sentences. Focus on the user's main emotions, concerns, and any coping methods or goals mentioned.",
        conversationText,
        300
      ),
      callGemini(
        GOOGLE_API_KEY,
        `Analyze this conversation and rate the following emotions on a scale of 0-100 based on how present they were in the USER's messages only. Return ONLY a valid JSON object, no other text. Keys: happiness, sadness, anger, fear, surprise, disgust. Example: {"happiness":20,"sadness":60,"anger":10,"fear":30,"surprise":5,"disgust":0}`,
        conversationText,
        200
      ),
    ]);

    const summary = summaryText.trim();

    let emotions = null;
    try {
      const jsonMatch = emotionText.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const keys = ["happiness", "sadness", "anger", "fear", "surprise", "disgust"];
        if (keys.every((k) => typeof parsed[k] === "number")) {
          emotions = parsed;
        }
      }
    } catch (err) {
      console.error("Emotion parse error:", err);
    }

    console.log("Session end - summary length:", summary.length, "emotions:", JSON.stringify(emotions));

    await supabase
      .from("sessions")
      .update({ ended_at: new Date().toISOString(), summary, emotions })
      .eq("id", sessionId);

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