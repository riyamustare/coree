import { createClient } from "@supabase/supabase-js";

const { supabaseUrl, serviceRoleKey, memoryServiceUrl, memoryServiceSecret } =
  (() => {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const memoryServiceUrl = process.env.MEMORY_SERVICE_URL;
    const memoryServiceSecret = process.env.MEMORY_SERVICE_SECRET;
    if (
      !supabaseUrl ||
      !serviceRoleKey ||
      !memoryServiceUrl ||
      !memoryServiceSecret
    ) {
      throw new Error(
        "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, MEMORY_SERVICE_URL, and MEMORY_SERVICE_SECRET must be configured",
      );
    }
    return {
      supabaseUrl,
      serviceRoleKey,
      memoryServiceUrl,
      memoryServiceSecret,
    };
  })();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const memoryImportUrl = new URL("/import-legacy", memoryServiceUrl);
const usersPerPage = 100;
const memoriesPerPage = 250;
const importBatchSize = 10;

interface LegacyMemoryRow {
  id: string;
  content: string;
  created_at: string;
  source_session_id: string | null;
}

async function importBatch(
  userId: string,
  memories: LegacyMemoryRow[],
): Promise<number> {
  const response = await fetch(memoryImportUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-memory-service-secret": memoryServiceSecret,
    },
    body: JSON.stringify({
      userId,
      memories: memories.map((memory) => ({
        id: memory.id,
        content: memory.content,
        createdAt: memory.created_at,
        sourceSessionId: memory.source_session_id,
      })),
    }),
  });
  const responseText = await response.text();
  let result: unknown;
  try {
    result = JSON.parse(responseText);
  } catch (error) {
    throw new Error(
      `Memory service returned invalid JSON (${response.status}): ${String(error)}`,
    );
  }
  if (typeof result !== "object" || result === null) {
    throw new Error(
      `Memory service returned an invalid response (${response.status})`,
    );
  }
  const payload = result as { imported?: unknown; error?: unknown };
  if (
    !response.ok ||
    typeof payload.imported !== "number" ||
    payload.imported !== memories.length
  ) {
    throw new Error(
      `Legacy memory import failed (${response.status}): ${String(payload.error || "invalid response")}`,
    );
  }
  return payload.imported;
}

let importedCount = 0;
let usersWithMemories = 0;
for (let page = 1; ; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({
    page,
    perPage: usersPerPage,
  });
  if (error) throw new Error(`Could not list Supabase users: ${error.message}`);
  if (data.users.length === 0) break;

  for (const user of data.users) {
    let offset = 0;
    let userImportedCount = 0;
    while (true) {
      const { data: memories, error: memoryError } = await supabase
        .from("memories")
        .select("id, content, created_at, source_session_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + memoriesPerPage - 1);
      if (memoryError) {
        throw new Error(
          `Could not read legacy memories for one account: ${memoryError.message}`,
        );
      }
      if (!memories.length) break;

      for (let index = 0; index < memories.length; index += importBatchSize) {
        userImportedCount += await importBatch(
          user.id,
          memories.slice(index, index + importBatchSize),
        );
      }
      offset += memories.length;
      if (memories.length < memoriesPerPage) break;
    }
    if (userImportedCount > 0) usersWithMemories += 1;
    importedCount += userImportedCount;
  }

  if (data.users.length < usersPerPage) break;
}

console.log(
  `Processed ${importedCount} legacy memory summaries for ${usersWithMemories} accounts.`,
);
