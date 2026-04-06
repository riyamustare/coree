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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const authHeader = req.headers.get("Authorization");
    let memories: string[] = [];
    let userIntent: string | null = null;

    if (authHeader) {
      try {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          const [profileRes, memoryRes] = await Promise.all([
            supabase
              .from("profiles")
              .select("onboarding_intent")
              .eq("id", user.id)
              .single(),
            supabase
              .from("memories")
              .select("content")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(3),
          ]);

          if (profileRes.data?.onboarding_intent) {
            userIntent = profileRes.data.onboarding_intent;
          }
          if (memoryRes.data) {
            memories = memoryRes.data.map((m: any) => m.content);
          }
        }
      } catch (err) {
        console.error("Memory retrieval error:", err);
      }
    }

    const systemPrompt = genzMode
      ? `${CORE_SYSTEM_PROMPT}\n\nIMPORTANT OVERRIDE — Gen-Z mode is ON. Talk using gen-z slang, abbreviations, and internet speak. Use words like "fr", "no cap", "lowkey", "highkey", "slay", "bestie", "bruh", "ngl", "deadass", "vibe check", "sending me", "ate that", "period", "it's giving". Keep the emotional support core but make it sound like a gen-z bestie texting. Still max 2 sentences.`
      : CORE_SYSTEM_PROMPT;

    const llmMessages = [
      { role: "system", content: systemPrompt },
    ];

    if (userIntent) {
      const intentPrompts: Record<string, string> = {
        "unlock insights about myself": "The user wants self-awareness. Ask reflective questions about patterns and self-understanding.",
        "process my emotions": "The user wants to process emotions. Validate feelings and help them explore what they're experiencing.",
        "set and achieve my goals": "The user wants goal support. Help them clarify desires while being emotionally supportive.",
        "just need to vent": "The user needs to vent. Listen actively, validate, don't fix unless asked.",
        "i don't know yet": "The user is exploring. Be gently curious and let it flow naturally.",
      };
      const intentContext = intentPrompts[userIntent] || `The user's stated intent: ${userIntent}`;
      llmMessages.push({
        role: "system",
        content: `User context:\n${intentContext}`,
      });
    }

    if (memories.length > 0) {
      llmMessages.push({
        role: "system",
        content: `Previous session memories:\n${memories.map((m) => `- ${m}`).join("\n")}\n\nReference naturally only if relevant.`,
      });
    }

    if (contextMessages && contextMessages.length > 0) {
      llmMessages.push(...contextMessages);
    }

    llmMessages.push({ role: "user", content: message });

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: llmMessages,
        stream: true,
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
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
