import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callMemoryService,
  isFalkorEnabled,
  toDirectAddress,
} from "../_shared/memory.ts";
import { extractCandidateText } from "../_shared/gemini.ts";

declare const EdgeRuntime: {
  waitUntil(promise: Promise<unknown>): void;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_API_URL = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  userText: string,
  maxTokens = 300,
): Promise<string> {
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
  return extractCandidateText(json?.candidates?.[0]);
}

type MemoryCategory =
  | "work"
  | "relationships"
  | "home"
  | "health"
  | "habits"
  | "preferences"
  | "other";

function parseMemoryExtraction(text: string) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Memory extraction did not return JSON");
  const parsed: Record<string, unknown> = JSON.parse(match[0]);
  if (!parsed || typeof parsed !== "object")
    throw new Error("Memory extraction returned an invalid object");
  const categories = new Set([
    "work",
    "relationships",
    "home",
    "health",
    "habits",
    "preferences",
    "other",
  ]);
  const predicates = new Set([
    "residence",
    "relationship",
    "occupation",
    "feeling",
    "preference",
    "routine",
    "other",
  ]);
  const category = (value: unknown): MemoryCategory =>
    typeof value === "string" && categories.has(value)
      ? (value as MemoryCategory)
      : "other";
  const statuses = new Set(["open", "in_progress", "achieved", "dropped"]);
  return {
    entities: Array.isArray(parsed.entities)
      ? parsed.entities
          .filter(
            (entity: Record<string, unknown>) =>
              typeof entity?.name === "string" &&
              (entity.type === "person" || entity.type === "place"),
          )
          .map((entity: Record<string, unknown>) => ({
            name: entity.name as string,
            type: entity.type as "person" | "place",
          }))
      : [],
    facts: Array.isArray(parsed.facts)
      ? parsed.facts
          .filter(
            (fact: Record<string, unknown>) =>
              typeof fact?.text === "string" &&
              typeof fact.label === "string" &&
              typeof fact.subject === "string" &&
              typeof fact.predicate === "string",
          )
          .map((fact: Record<string, unknown>) => ({
            ...(typeof fact.ref === "string" ? { ref: fact.ref } : {}),
            text: fact.text as string,
            label: (fact.label as string).slice(0, 24),
            subject: fact.subject as string,
            predicate: predicates.has(fact.predicate as string)
              ? (fact.predicate as string)
              : "other",
            category: category(fact.category),
            ...(typeof fact.entity === "string" ? { entity: fact.entity } : {}),
            confidence:
              typeof fact.confidence === "number"
                ? Math.min(1, Math.max(0, fact.confidence))
                : 0.7,
          }))
      : [],
    procedures: Array.isArray(parsed.procedures)
      ? parsed.procedures
          .filter(
            (item: Record<string, unknown>) => typeof item?.text === "string",
          )
          .map((item: Record<string, unknown>) => ({
            text: item.text as string,
            category: category(item.category),
          }))
      : [],
    goals: Array.isArray(parsed.goals)
      ? parsed.goals
          .filter(
            (item: Record<string, unknown>) => typeof item?.text === "string",
          )
          .map((item: Record<string, unknown>) => ({
            ...(typeof item.ref === "string" ? { ref: item.ref } : {}),
            text: item.text as string,
            status:
              typeof item.status === "string" && statuses.has(item.status)
                ? item.status
                : "open",
            why: typeof item.why === "string" ? item.why : "",
            category: category(item.category),
          }))
      : [],
    relations: Array.isArray(parsed.relations)
      ? parsed.relations
          .filter(
            (relation: Record<string, unknown>) =>
              typeof relation?.fromRef === "string" &&
              typeof relation.toRef === "string" &&
              typeof relation.reason === "string" &&
              (relation.kind === "stated" || relation.kind === "possible"),
          )
          .slice(0, 3)
          .map((relation: Record<string, unknown>) => ({
            fromRef: relation.fromRef as string,
            toRef: relation.toRef as string,
            reason: (relation.reason as string).slice(0, 160),
            kind: relation.kind as "stated" | "possible",
          }))
      : [],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    if (typeof sessionId !== "string") throw new Error("sessionId is required");
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY is not configured");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authentication is required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Authentication is required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("user_id")
      .eq("id", sessionId)
      .single();
    if (sessionError || !session || session.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();
    const firstName =
      typeof profile?.display_name === "string"
        ? profile.display_name.trim().split(/\s+/)[0]
        : "";

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

    const conversationText = messages
      .map(
        (message: { role: string; content: string }) =>
          `${message.role === "user" ? "You" : "Core"}: ${message.content}`,
      )
      .join("\n");

    const summaryText = await callGemini(
      GOOGLE_API_KEY,
      `Write a warm, concise 2-3 sentence recap directly to the person using "you" and "your"; never say "the user" or describe them in third person. Focus on what you shared, your feelings, concerns, coping methods, or goals.${firstName ? ` You may naturally use the first name ${firstName} once.` : ""}`,
      conversationText,
      300,
    );
    const summaryGenerated = summaryText.trim().length > 0;
    const summary = summaryGenerated
      ? toDirectAddress(summaryText.trim())
      : "You took a moment to reflect today. That matters.";
    const endedAt = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ ended_at: endedAt, summary, emotions: null })
      .eq("id", sessionId);
    if (updateError) throw updateError;

    EdgeRuntime.waitUntil(
      (async () => {
        const emotionTask = (async () => {
          try {
            const emotionText = await callGemini(
              GOOGLE_API_KEY,
              `Analyze this conversation and rate the following emotions on a scale of 0-100 based on how present they were in the person's messages only. Return ONLY a valid JSON object, no other text. Keys: happiness, sadness, anger, fear, surprise, disgust. Example: {"happiness":20,"sadness":60,"anger":10,"fear":30,"surprise":5,"disgust":0}`,
              conversationText,
              200,
            );
            const jsonMatch = emotionText.match(/\{[\s\S]*?\}/);
            if (!jsonMatch) return;
            const parsed = JSON.parse(jsonMatch[0]);
            const keys = [
              "happiness",
              "sadness",
              "anger",
              "fear",
              "surprise",
              "disgust",
            ];
            if (!keys.every((key) => typeof parsed[key] === "number")) return;
            const { error } = await supabase
              .from("sessions")
              .update({ emotions: parsed })
              .eq("id", sessionId);
            if (error) throw error;
          } catch (error) {
            console.error("Could not analyze session emotions:", error);
          }
        })();

        const memoryTask = (async () => {
          if (isFalkorEnabled()) {
            try {
              const knownResult = await callMemoryService(
                `/memories/${session.user_id}`,
                "GET",
              );
              if (!knownResult.ok) {
                throw new Error(
                  `Could not load existing graph context: ${knownResult.status}`,
                );
              }
              const knownFacts = Array.isArray(knownResult.data.facts)
                ? knownResult.data.facts
                    .filter(
                      (item): item is Record<string, unknown> =>
                        typeof item === "object" && item !== null,
                    )
                    .filter((item) => item.valid_to == null)
                    .map((item) => ({
                      text: item.text,
                      subject: item.subject,
                      predicate: item.predicate,
                      entity: item.entity,
                    }))
                : [];
              const knownGoals = Array.isArray(knownResult.data.goals)
                ? knownResult.data.goals
                    .filter(
                      (item): item is Record<string, unknown> =>
                        typeof item === "object" && item !== null,
                    )
                    .filter(
                      (item) =>
                        item.status !== "achieved" &&
                        item.status !== "dropped",
                    )
                    .map((item) => ({
                      ref: item.id,
                      text: item.text,
                      status: item.status,
                      why: item.why,
                    }))
                : [];
              const extractionText = await callGemini(
                GOOGLE_API_KEY,
                `Extract durable conversational memories from this session. Return ONLY JSON matching:
{"entities":[{"name":"Aisha","type":"person"}],"facts":[{"ref":"F1","text":"Aisha is your close friend. You talk to her when work gets stressful.","label":"Aisha, your close friend","category":"relationships","subject":"Aisha","predicate":"relationship","entity":"Aisha","confidence":0.9}],"goals":[{"ref":"G1","text":"Sleep earlier","status":"in_progress","why":"You want to sleep earlier","category":"health"}],"procedures":[{"text":"You prefer concise replies","category":"preferences"}],"relations":[{"fromRef":"F1","toRef":"G1","reason":"You said these are connected","kind":"stated"}]}
Entities are ONLY actual people or places explicitly mentioned. Never create entities for topics such as work, sleep, stress, or emotions. Topics are categories on memories: work | relationships | home | health | habits | preferences | other. Do not create a fact for something that is only a topic, and do not duplicate a goal as a fact. Skip anything not actually said. Keep all memory text in the person's own framing, warm, non-clinical, and direct second person ("you"/"your"); never say "the user". Facts should be short natural sentences with context the person gave, with a concise complete label of at most 24 characters; never leave a label ending in an unfinished phrase. For home/residence facts, use subject "you", predicate "residence", category "home", and the current place as entity. State current residence in the text (for example, "You now live in Pune") and use a clear label such as "Moved to Pune" or "Lives in Pune". When a person contrasts a former home with where they live now (for example, "I used to live in Bangalore and now live in Pune"), extract one fact for the current home only; do not keep the former city as another active residence fact. The existing residence fact will be retained as history when the new fact is saved. Fact subject is "you" for personal facts; for facts about a named person, use their name. Use entity only when the fact is about an explicitly named person/place. Normalize predicate to one of: residence, relationship, occupation, feeling, preference, routine, other. For residence changes, subject remains "you" and entity is the place. Return no more than 3 relations, only for facts/goals in this extraction. Use kind "stated" only when the person clearly connected them; otherwise use "possible" sparingly, tentatively, and never infer a clinical, causal, or diagnostic claim. Relation refs must match F1... and G1... identifiers in this JSON. For a goal semantically equivalent to a known open goal, reuse that goal's exact text and ref and update its status rather than creating a duplicate; preserve its category and why where still accurate. Goal status: open | in_progress | achieved | dropped. Goal why is one short sentence in the person's words. Return empty arrays when appropriate. Existing active facts and known open goals follow; reuse fact subjects and predicates for reliable superseding:
KNOWN FACTS: ${JSON.stringify(knownFacts)}
KNOWN GOALS: ${JSON.stringify(knownGoals)}`,
                conversationText,
                1200,
              );
              const extracted = parseMemoryExtraction(extractionText);
              extracted.entities = extracted.entities
                .map((entity) => ({
                  ...entity,
                  name:
                    entity.name.trim().toLowerCase() === "user"
                      ? "you"
                      : entity.name,
                }))
                .filter((entity) => entity.name.toLowerCase() !== "you");
              extracted.facts = extracted.facts
                .map((fact) => ({
                  ...fact,
                  text: toDirectAddress(fact.text),
                  subject:
                    fact.subject.trim().toLowerCase() === "user"
                      ? "you"
                      : fact.subject,
                }))
                .filter((fact) => fact.subject.trim().length > 0);
              extracted.procedures = extracted.procedures.map((item) => ({
                ...item,
                text: toDirectAddress(item.text),
              }));
              extracted.goals = extracted.goals.map((goal) => ({
                ...goal,
                text: toDirectAddress(goal.text),
              }));
              const remembered = await callMemoryService("/remember", "POST", {
                userId: session.user_id,
                sessionId,
                episode: {
                  id: sessionId,
                  text: summary,
                  occurredAt: new Date().toISOString(),
                },
                ...extracted,
              });
              if (!remembered.ok) {
                throw new Error(
                  `Memory write failed with status ${remembered.status}`,
                );
              }
            } catch (error) {
              console.error(
                "FalkorDB remember failed; saving legacy summary memory:",
                error,
              );
            }
          }
          const { error: memoryError } = await supabase.from("memories").insert({
            user_id: session.user_id,
            content: summary,
            source_session_id: sessionId,
          });
          if (memoryError) throw memoryError;
        })();

        await Promise.all([emotionTask, memoryTask]);
      })().catch((error) => {
        console.error("Session background processing failed:", error);
      }),
    );

    console.log("Session end - summary length:", summary.length);
    return new Response(
      JSON.stringify({ success: true, summary, summaryGenerated }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("end-session error:", e);
    return new Response(
      JSON.stringify({
        error: e instanceof Error ? e.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
