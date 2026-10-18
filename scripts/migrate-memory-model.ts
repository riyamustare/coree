import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  graphName,
  MemoryGraph,
  type GraphClient,
} from "../memory-service/src/memory.js";

interface FalkorClient {
  selectGraph(name: string): GraphClient;
  close(): Promise<void>;
}

interface FalkorDBModule {
  FalkorDB: {
    connect(options: { url: string }): Promise<FalkorClient>;
  };
}

export async function migrateUserMemory(userId: string): Promise<void> {
  const url = process.env.FALKORDB_URL;
  if (!url) throw new Error("FALKORDB_URL must be configured");
  const requireFromService = createRequire(
    new URL("../memory-service/package.json", import.meta.url),
  );
  const { FalkorDB } = requireFromService("falkordb") as FalkorDBModule;
  const db = await FalkorDB.connect({ url });
  try {
    const memory = new MemoryGraph((name) => db.selectGraph(name));
    const result = await memory.migrateLegacyGraph(userId);
    console.log(
      `Migrated ${graphName(userId)}: ${result.convertedEntities} topic entities converted; ${result.attachedGoals} goals attached.`,
    );
  } finally {
    await db.close();
  }
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) {
  const userId = process.argv[2];
  if (!userId) {
    throw new Error(
      "Usage: npm run migrate:model --prefix memory-service -- <supabase-user-id>",
    );
  }
  graphName(userId);
  await migrateUserMemory(userId);
}
