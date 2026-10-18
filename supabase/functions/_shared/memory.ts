export interface MemoryServiceResponse {
  ok: boolean;
  status: number;
  data: Record<string, unknown>;
}

export async function callMemoryService(
  path: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<MemoryServiceResponse> {
  const baseUrl = Deno.env.get("MEMORY_SERVICE_URL");
  const secret = Deno.env.get("MEMORY_SERVICE_SECRET");
  if (!baseUrl || !secret) {
    throw new Error(
      "MEMORY_SERVICE_URL and MEMORY_SERVICE_SECRET must be configured",
    );
  }
  const response = await fetch(new URL(path, baseUrl), {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-memory-service-secret": secret,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  if (text) {
    try {
      data = JSON.parse(text) as Record<string, unknown>;
    } catch (error) {
      throw new Error(
        `Memory service returned invalid JSON (${response.status}): ${String(error)}`,
      );
    }
  }
  return { ok: response.ok, status: response.status, data };
}

export function isFalkorEnabled(): boolean {
  return Deno.env.get("MEMORY_BACKEND") === "falkordb";
}

export function toDirectAddress(text: string): string {
  const replacements: Array<[RegExp, string]> = [
    [/\bthe user(?:'s|’s)\b/gi, "your"],
    [/\buser(?:'s|’s)\b/gi, "your"],
    [/\bthe user is\b/gi, "you are"],
    [/\bthe user has\b/gi, "you have"],
    [/\bthe user was\b/gi, "you were"],
    [/\bthe user wants\b/gi, "you want"],
    [/\bthe user prefers\b/gi, "you prefer"],
    [/\bthe user feels\b/gi, "you feel"],
    [/\bthe user felt\b/gi, "you felt"],
    [/\bthe user finds\b/gi, "you find"],
    [/\bthe user appreciates\b/gi, "you appreciate"],
    [/\bthe user aims\b/gi, "you aim"],
    [/\bthe user likes\b/gi, "you like"],
    [/\bthe user loves\b/gi, "you love"],
    [/\bthe user needs\b/gi, "you need"],
    [/\bthe user struggles\b/gi, "you struggle"],
    [/\bthe user recently\b/gi, "you recently"],
    [/\bthe user moved\b/gi, "you moved"],
    [/\buser is\b/gi, "you are"],
    [/\buser has\b/gi, "you have"],
    [/\buser was\b/gi, "you were"],
    [/\buser wants\b/gi, "you want"],
    [/\buser prefers\b/gi, "you prefer"],
    [/\buser feels\b/gi, "you feel"],
    [/\buser felt\b/gi, "you felt"],
    [/\buser finds\b/gi, "you find"],
    [/\buser appreciates\b/gi, "you appreciate"],
    [/\buser aims\b/gi, "you aim"],
    [/\buser likes\b/gi, "you like"],
    [/\buser loves\b/gi, "you love"],
    [/\buser needs\b/gi, "you need"],
    [/\buser struggles\b/gi, "you struggle"],
    [/\buser recently\b/gi, "you recently"],
    [/\buser moved\b/gi, "you moved"],
    [/\band is\b/gi, "and you are"],
    [/\band has\b/gi, "and you have"],
    [/\band was\b/gi, "and you were"],
    [/\band wants\b/gi, "and you want"],
    [/\band prefers\b/gi, "and you prefer"],
    [/\band feels\b/gi, "and you feel"],
    [/\band felt\b/gi, "and you felt"],
    [/\band finds\b/gi, "and you find"],
    [/\band appreciates\b/gi, "and you appreciate"],
    [/\band aims\b/gi, "and you aim"],
    [/\band likes\b/gi, "and you like"],
    [/\band loves\b/gi, "and you love"],
    [/\band needs\b/gi, "and you need"],
    [/\band struggles\b/gi, "and you struggle"],
    [/\band recently\b/gi, "and you recently"],
    [/\band moved\b/gi, "and you moved"],
    [/\bthe user\b/gi, "you"],
    [/\buser\b/gi, "you"],
  ];
  const result = replacements.reduce(
    (current, [pattern, replacement]) =>
      current.replace(pattern, (match) =>
        match[0] === match[0].toUpperCase()
          ? replacement[0].toUpperCase() + replacement.slice(1)
          : replacement,
      ),
    text,
  );
  return result.replace(/(^|[.!?]\s+)(you)\b/g, "$1You");
}
