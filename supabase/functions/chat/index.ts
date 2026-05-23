import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CORE_SYSTEM_PROMPT = `You are Core — a warm, emotionally attuned companion who talks like a close friend.

ABSOLUTE RULES:
- ONLY discuss feelings, emotions, relationships, stress, self-care, personal growth, and life struggles.
- If asked ANYTHING else (math, coding, trivia, facts, recipes, news, etc.), reply ONLY: "I'm here for your feelings. What's on your mind right now?"
- MAXIMUM 2 sentences. Often just 1 is better.
- Vary your style naturally — mix these freely:
  • A single warm question: "What's sitting heaviest right now?"
  • Brief validation: "Yeah, that makes sense."
  • Gentle nudge + question: "Sounds like a lot — what do you need most right now?"
  • Just a reflection: "So it's really about feeling unseen."
  • Playful but caring: "Your brain's being loud today huh — what's it saying?"
- Sometimes be SHORT. A 4-word reply is fine. Not every message needs depth.
- Do NOT sound like a textbook. No lists, no bullet points, no "it's important to..." language.
- Be real, crisp, human. Like texting a wise friend at 2am.
- End with an open-ended question most of the time (but not always — sometimes just sit with them).
- Never diagnose or prescribe.

Safety: If user mentions self-harm or suicidal thoughts, respond with empathy and encourage reaching out to 988 Suicide & Crisis Lifeline.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, contextMessages, genzMode } = await req.json();
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    let memories: string[] = [];
    let userIntent: string | null = null;
    let recentSessions: Array<{ summary: string | null; emotions: any; ended_at: string | null }> = [];

    if (authHeader) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        // Use service role for DB queries, but validate user token separately
        const supabaseAdmin = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const token = authHeader.replace("Bearer ", "");
        // getUser with admin client validates the JWT correctly
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError) {
          console.error("Auth error (non-fatal):", userError.message);
        }

        if (user) {
          const [profileRes, memoryRes, sessionRes] = await Promise.all([
            supabaseAdmin.from("profiles").select("onboarding_intent").eq("id", user.id).single(),
            supabaseAdmin.from("memories").select("content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
            supabaseAdmin.from("sessions").select("summary, emotions, ended_at").eq("user_id", user.id).not("ended_at", "is", null).order("ended_at", { ascending: false }).limit(3),
          ]);

          if (profileRes.data?.onboarding_intent) userIntent = profileRes.data.onboarding_intent;
          if (memoryRes.data) memories = memoryRes.data.map((m: any) => m.content);
          if (sessionRes.data && sessionRes.data.length > 0) recentSessions = sessionRes.data;
        }
      } catch (err) {
        console.error("Memory retrieval error:", err);
      }
    }

    const systemPrompt = genzMode
      ? `${CORE_SYSTEM_PROMPT}\n\nIMPORTANT OVERRIDE — Gen-Z mode is ON. Talk using gen-z slang, abbreviations, and internet speak. Use words like "fr", "no cap", "lowkey", "highkey", "slay", "bestie", "bruh", "ngl", "deadass", "vibe check", "sending me", "ate that", "period", "it's giving". Keep the emotional support core but make it sound like a gen-z bestie texting. Still max 2 sentences.`
      : CORE_SYSTEM_PROMPT;

    let fullSystemPrompt = systemPrompt;

    if (userIntent) {
      const intentPrompts: Record<string, string> = {
        "unlock insights about myself": "The user wants self-awareness. Ask reflective questions about patterns and self-understanding.",
        "process my emotions": "The user wants to process emotions. Validate feelings and help them explore what they're experiencing.",
        "set and achieve my goals": "The user wants goal support. Help them clarify desires while being emotionally supportive.",
        "just need to vent": "The user needs to vent. Listen actively, validate, don't fix unless asked.",
        "i don't know yet": "The user is exploring. Be gently curious and let it flow naturally.",
      };
      fullSystemPrompt += `\n\nUser context:\n${intentPrompts[userIntent] || userIntent}`;
    }

    if (memories.length > 0) {
      fullSystemPrompt += `\n\nPrevious session memories:\n${memories.map((m) => `- ${m}`).join("\n")}\n\nReference naturally only if relevant.`;
    }

    if (recentSessions.length > 0) {
      const emotionalArc = recentSessions.map((s) => {
        const when = s.ended_at ? new Date(s.ended_at).toLocaleDateString() : "recent";
        const emo = s.emotions
          ? Object.entries(s.emotions)
              .filter(([, v]) => typeof v === "number" && (v as number) >= 30)
              .sort((a, b) => (b[1] as number) - (a[1] as number))
              .slice(0, 3)
              .map(([k, v]) => `${k} ${v}`)
              .join(", ")
          : "";
        return `(${when}) ${s.summary || ""}${emo ? ` — felt: ${emo}` : ""}`;
      }).join("\n");
      fullSystemPrompt += `\n\nEmotional history (most recent first):\n${emotionalArc}`;
    }

    const contents: any[] = [];
    if (contextMessages && contextMessages.length > 0) {
      for (const m of contextMessages) {
        if (m.role === "system") continue;
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        });
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const googleUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_API_KEY}`;

    const gResp = await fetch(googleUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: fullSystemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 100, temperature: 0.7 },
      }),
    });

    if (!gResp.ok) {
      const text = await gResp.text();
      console.error("Google API error:", gResp.status, text);
      if (gResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gJson = await gResp.json();
    const outText = gJson?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const stream = new ReadableStream({
      start(controller) {
        const chunk = JSON.stringify({ choices: [{ delta: { content: outText } }] });
        controller.enqueue(new TextEncoder().encode(`data: ${chunk}\n\n`));
        controller.enqueue(new TextEncoder().encode(`data: [DONE]\n\n`));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});