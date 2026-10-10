import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOTIFY_TO = "riyamustare12@gmail.com";
const submissionFields = {
  feedback: [
    ["user_id", "User ID"],
    ["content", "Feedback"],
  ],
  waitlist: [
    ["name", "Name"],
    ["phone", "Phone"],
    ["email", "Email"],
    ["looking_for", "Looking for"],
    ["city", "City"],
  ],
} as const;

function isSubmissionType(value: unknown): value is keyof typeof submissionFields {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(submissionFields, value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body: unknown = await req.json();
    if (!isRecord(body)) {
      return new Response(JSON.stringify({ error: "type and data required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { type, data } = body;
    if (!isSubmissionType(type) || !isRecord(data)) {
      return new Response(JSON.stringify({ error: "invalid submission" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subject = type === "feedback" ? "New Coree feedback submission" : "New Coree waitlist signup";

    const rows: string[] = [];
    for (const [key, label] of submissionFields[type]) {
      const value = data[key];
      if (typeof value !== "string") {
        return new Response(JSON.stringify({ error: "invalid submission data" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      rows.push(
        `<tr><td style="padding:6px 12px;border:1px solid #eee;font-weight:600">${escapeHtml(label)}</td><td style="padding:6px 12px;border:1px solid #eee;white-space:pre-wrap">${escapeHtml(value)}</td></tr>`
      );
    }

    const html = `
      <div style="font-family:system-ui,sans-serif;color:#111;max-width:560px">
        <h2 style="margin:0 0 12px">${subject}</h2>
        <p style="color:#555;margin:0 0 16px">Received at ${new Date().toISOString()}</p>
        <table style="border-collapse:collapse;width:100%;font-size:14px">${rows}</table>
      </div>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        from: "Coree <onboarding@resend.dev>",
        to: [NOTIFY_TO],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Resend error", res.status, errText);
      return new Response(JSON.stringify({ error: "send_failed", status: res.status, details: errText }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("notify-submission error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});