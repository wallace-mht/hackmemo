import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";

const memwal = MemWal.create({
  key: requireEnv("MEMWAL_PRIVATE_KEY"),
  accountId: requireEnv("MEMWAL_ACCOUNT_ID"),
  serverUrl: process.env.MEMWAL_SERVER_URL ?? "https://relayer.memory.walrus.xyz",
  namespace: "hackmemo-default",
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export function namespaceForUser(userId: string): string {
  return `user:${userId}`;
}

export interface RecalledMemory {
  text: string;
  distance: number;
}

export async function recallMemories(
  userId: string,
  query: string,
  limit = 5,
): Promise<RecalledMemory[]> {
  const namespace = namespaceForUser(userId);
  const { results } = await memwal.recall({ query, namespace, limit, maxDistance: 0.7 });
  return results.map((r) => ({ text: r.text, distance: r.distance }));
}

// Extracts and stores discrete facts from a conversation turn. Fire-and-forget
// from the caller's perspective (caller should not await this on the hot path).
export async function rememberTurn(userId: string, text: string): Promise<void> {
  const namespace = namespaceForUser(userId);
  await memwal.analyzeAndWait(text, namespace, { timeoutMs: 30_000 });
}

export async function health(): Promise<{ status: string; version?: string }> {
  return memwal.health();
}
