import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CALMI_SYSTEM_PROMPT = `You are Calmi, a warm and empathetic conversational AI companion. Your purpose is to provide a safe, supportive space for people to share their feelings and reflect on their experiences.

Guidelines:
- Respond with genuine empathy and warmth
- Validate feelings without judgment
- Ask thoughtful, open-ended questions to encourage reflection
- Keep responses short and conversational (2-4 sentences max) since conversations may happen through voice
- Never diagnose, treat, or act as a therapist or medical professional
- Never provide medical or psychological advice
- Encourage users to seek professional support when appropriate
- Use a calm, gentle tone

Safety: If the user expresses self-harm thoughts, suicidal language, or severe distress:
- Respond with deep empathy and care
- Gently encourage them to reach out to someone they trust
- Suggest professional resources (e.g., crisis hotlines, therapists)
- Never attempt to act as a crisis counselor

You are NOT a replacement for therapy. You are a supportive companion for reflection and emotional expression.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, sessionId, contextMessages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get auth user for memory retrieval
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

        // Get user from token
        const token = authHeader.replace("Bearer ", "");
        const { data: { user } } = await supabase.auth.getUser(token);

        if (user) {
          // Get user's onboarding intent
          const { data: profileData } = await supabase
            .from("profiles")
            .select("onboarding_intent")
            .eq("id", user.id)
            .single();
          if (profileData?.onboarding_intent) {
            userIntent = profileData.onboarding_intent;
          }

          // Generate embedding for the message to search memories
          const embedResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-lite",
              messages: [
                { role: "system", content: "Extract the key emotional theme or topic from this message in 1-2 sentences. Be concise." },
                { role: "user", content: message },
              ],
            }),
          });

          if (embedResponse.ok) {
            // For now, do a simple text search on memories
            const { data: memoryData } = await supabase
              .from("memories")
              .select("content")
              .eq("user_id", user.id)
              .order("created_at", { ascending: false })
              .limit(3);

            if (memoryData) {
              memories = memoryData.map((m: any) => m.content);
            }
          }
        }
      } catch (err) {
        console.error("Memory retrieval error:", err);
      }
    }

    // Build messages array
    const llmMessages = [
      { role: "system", content: CALMI_SYSTEM_PROMPT },
    ];

    if (userIntent) {
      const intentPrompts: Record<string, string> = {
        "unlock insights about myself": "The user wants to gain self-awareness and personal insights. Focus on reflective questions, patterns in their thoughts, and helping them understand themselves better.",
        "process my emotions": "The user wants help processing emotions. Focus on validating feelings, exploring emotional experiences, and helping them work through what they're feeling.",
        "set and achieve my goals": "The user wants support with goals. Help them clarify what they want, break things down into steps, and stay motivated while being emotionally supportive.",
        "just need to vent": "The user needs to vent. Be a great listener — validate, empathize, and don't try to fix things unless asked. Let them express freely.",
        "i don't know yet": "The user is exploring. Be gently curious and let the conversation flow naturally without pushing any direction.",
      };
      const intentContext = intentPrompts[userIntent] || `The user's stated intent: ${userIntent}`;
      llmMessages.push({
        role: "system",
        content: `User personalization context:\n${intentContext}`,
      });
    }

    if (memories.length > 0) {
      llmMessages.push({
        role: "system",
        content: `Relevant memories from previous sessions with this user:\n${memories.map((m) => `- ${m}`).join("\n")}\n\nUse these to provide more personalized, contextual support. Reference them naturally only if relevant.`,
      });
    }

    // Add conversation context (last 5 exchanges)
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
        model: "google/gemini-3-flash-preview",
        messages: llmMessages,
        stream: true,
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
