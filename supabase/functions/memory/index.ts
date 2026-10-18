import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callMemoryService,
  isFalkorEnabled,
  toDirectAddress,
} from "../_shared/memory.ts";
import { extractCandidateText } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const GOOGLE_API_URL = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;

async function createCheckInMessage(
  facts: string[],
  firstName: string | null,
): Promise<string> {
  const apiKey = Deno.env.get("GOOGLE_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured");
  const response = await fetch(GOOGLE_API_URL(apiKey), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: {
        parts: [
          {
            text: `You are Core, a warm, emotionally attuned companion. Write one gentle, natural opening sentence directly to the person ("you"/"your") that follows up on a recent goal or difficult moment. Never refer to them as "the user".${firstName ? ` You may naturally use their first name, ${firstName}, but do not force it.` : ""} Do not sound clinical or assume progress. Keep it brief and mention no internal memory system.`,
          },
        ],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `Recent context:\n${facts.join("\n")}` }],
        },
      ],
      generationConfig: { maxOutputTokens: 80, temperature: 0.5 },
    }),
  });
  if (!response.ok)
    throw new Error(`Check-in generation failed: ${response.status}`);
  const json = await response.json();
  const message = extractCandidateText(json?.candidates?.[0]);
  if (!message)
    throw new Error("Check-in generation returned an empty response");
  return message;
}

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });
  try {
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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
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
    const { action, id, ids, legacy, status } = await req.json();

    if (action === "graph") {
      if (!isFalkorEnabled())
        return Response.json(
          { nodes: [], links: [], backend: "legacy" },
          { headers: corsHeaders },
        );
      const result = await callMemoryService(`/graph/${user.id}`, "GET");
      if (!result.ok)
        throw new Error(`Could not load memory graph: ${result.status}`);
      return Response.json(result.data, { headers: corsHeaders });
    }

    if (action === "goal-status") {
      if (typeof id !== "string" || typeof status !== "string") {
        throw new Error("id and status are required");
      }
      const result = await callMemoryService(
        `/goals/${user.id}/${encodeURIComponent(id)}`,
        "PATCH",
        { status },
      );
      if (!result.ok)
        throw new Error(`Could not update goal status: ${result.status}`);
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    if (action === "check-in") {
      if (!isFalkorEnabled())
        return Response.json({ message: null }, { headers: corsHeaders });
      try {
        const pending = await callMemoryService(
          `/handoffs/${user.id}/pending`,
          "GET",
        );
        if (!pending.ok)
          throw new Error(`Could not read pending handoff: ${pending.status}`);
        const handoff = pending.data.handoff as {
          id?: string;
          task?: string;
          fact_ids?: string[];
        } | null;
        if (!handoff?.id)
          return Response.json({ message: null }, { headers: corsHeaders });
        const factIds = Array.isArray(handoff.fact_ids) ? handoff.fact_ids : [];
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        const firstName =
          typeof profile?.display_name === "string"
            ? profile.display_name.trim().split(/\s+/)[0] || null
            : null;
        const explanation = factIds.length
          ? await callMemoryService("/explain", "POST", {
              userId: user.id,
              ids: factIds,
            })
          : { ok: true, status: 200, data: { items: [] } };
        if (!explanation.ok)
          throw new Error(
            `Could not read handoff context: ${explanation.status}`,
          );
        const items = Array.isArray(explanation.data.items)
          ? explanation.data.items
          : [];
        const context = items.flatMap((item) => {
          if (
            typeof item !== "object" ||
            item === null ||
            typeof item.text !== "string"
          )
            return [];
          return [toDirectAddress(item.text)];
        });
        const message = await createCheckInMessage(
          context.length ? context : [handoff.task || "Follow up warmly"],
          firstName,
        );
        const completed = await callMemoryService(
          `/handoffs/${user.id}/${handoff.id}/done`,
          "PATCH",
        );
        if (!completed.ok)
          throw new Error(
            `Could not complete check-in handoff: ${completed.status}`,
          );
        return Response.json(
          { message, memoryTrace: factIds },
          { headers: corsHeaders },
        );
      } catch (error) {
        console.error("Check-in agent unavailable:", error);
        return Response.json({ message: null }, { headers: corsHeaders });
      }
    }

    if (action === "list") {
      if (isFalkorEnabled()) {
        try {
          const result = await callMemoryService(`/memories/${user.id}`, "GET");
          if (!result.ok)
            throw new Error(`Memory list failed with status ${result.status}`);
          return Response.json(
            { ...result.data, backend: "falkordb" },
            { headers: corsHeaders },
          );
        } catch (error) {
          console.error(
            "FalkorDB list failed; returning legacy memories:",
            error,
          );
        }
      }
      const { data, error } = await supabase
        .from("memories")
        .select("id, content, created_at, source_session_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const sourceIds = [
        ...new Set(
          (data || []).flatMap((item) =>
            typeof item.source_session_id === "string"
              ? [item.source_session_id]
              : [],
          ),
        ),
      ];
      const { data: sources, error: sourceError } = sourceIds.length
        ? await supabase
            .from("sessions")
            .select("id, summary, ended_at")
            .eq("user_id", user.id)
            .in("id", sourceIds)
        : { data: [], error: null };
      if (sourceError) throw sourceError;
      const sourceById = new Map(
        (sources || []).map((session) => [session.id, session]),
      );
      return Response.json(
        {
          facts: (data || []).map((item) => ({
            id: item.id,
            text: item.content,
            valid_from: item.created_at,
            episode_id: item.source_session_id,
            episode_text: item.source_session_id
              ? sourceById.get(item.source_session_id)?.summary
              : null,
            episode_date: item.source_session_id
              ? sourceById.get(item.source_session_id)?.ended_at
              : null,
            category: "legacy",
          })),
          procedures: [],
          goals: [],
          backend: "legacy",
        },
        { headers: corsHeaders },
      );
    }

    if (action === "explain") {
      if (
        !Array.isArray(ids) ||
        ids.some((value) => typeof value !== "string")
      ) {
        throw new Error("ids must be an array of strings");
      }
      if (ids.length === 0)
        return Response.json({ items: [] }, { headers: corsHeaders });
      let graphItems: Record<string, unknown>[] = [];
      let graphUnavailable = false;
      if (isFalkorEnabled()) {
        try {
          const result = await callMemoryService("/explain", "POST", {
            userId: user.id,
            ids,
          });
          if (!result.ok)
            throw new Error(
              `Memory explanation failed with status ${result.status}`,
            );
          graphItems = Array.isArray(result.data.items)
            ? result.data.items.filter(
                (item): item is Record<string, unknown> =>
                  typeof item === "object" && item !== null,
              )
            : [];
        } catch (error) {
          console.error(
            "FalkorDB explanation failed; checking legacy memory:",
            error,
          );
          graphUnavailable = true;
        }
      }
      const [memoryResult, sessionResult] = await Promise.all([
        supabase
          .from("memories")
          .select("id, content, created_at, source_session_id")
          .eq("user_id", user.id)
          .in("id", ids),
        supabase
          .from("sessions")
          .select("id, summary, ended_at")
          .eq("user_id", user.id)
          .in("id", ids),
      ]);
      if (memoryResult.error) throw memoryResult.error;
      if (sessionResult.error) throw sessionResult.error;
      const legacyItems = [
        ...(memoryResult.data || []).map((item) => ({
          id: item.id,
          text: item.content,
          episode_id: item.source_session_id,
          episode_date: item.created_at,
        })),
        ...(sessionResult.data || []).map((session) => ({
          id: session.id,
          text: session.summary || "Session episode",
          episode_text: session.summary,
          episode_date: session.ended_at,
        })),
      ];
      if (graphUnavailable && ids.length > 0 && legacyItems.length === 0) {
        throw new Error(
          "The memory service is unavailable, so this graph memory cannot be explained right now",
        );
      }
      const seen = new Set<string>();
      const items = [...graphItems, ...legacyItems].filter((item) => {
        if (typeof item.id !== "string" || seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      return Response.json(
        {
          items,
          ...(graphUnavailable ? { incomplete: true } : {}),
        },
        { headers: corsHeaders },
      );
    }

    if (action === "forget") {
      if (typeof id !== "string") throw new Error("id is required");
      if (isFalkorEnabled() && legacy !== true) {
        const result = await callMemoryService(
          `/memories/${user.id}/${id}`,
          "DELETE",
        );
        if (!result.ok)
          throw new Error(`Could not forget memory: ${result.status}`);
      } else {
        const { error } = await supabase
          .from("memories")
          .delete()
          .eq("user_id", user.id)
          .eq("id", id);
        if (error) throw error;
      }
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    if (action === "forget-all") {
      if (isFalkorEnabled()) {
        const result = await callMemoryService(
          `/memories/${user.id}`,
          "DELETE",
        );
        if (!result.ok)
          throw new Error(`Could not delete graph memories: ${result.status}`);
      }
      const { error } = await supabase
        .from("memories")
        .delete()
        .eq("user_id", user.id);
      if (error) throw error;
      return Response.json({ success: true }, { headers: corsHeaders });
    }

    return new Response(
      JSON.stringify({ error: "Unsupported memory action" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("memory function error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
