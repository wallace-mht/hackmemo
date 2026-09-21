import "dotenv/config";
import { turnCountsByUser } from "../src/db/log.js";
import { recallMemories } from "../src/core/memory.js";

// Broad query used to approximate "how many memories does this user have".
// MemWal's recall() is a semantic search, not a raw count endpoint, so this is
// an approximation capped by `limit` — bump it if a user is expected to clear it.
const PROBE_QUERY = "user";
const PROBE_LIMIT = 50;

async function main() {
  const rows = turnCountsByUser();
  const users = [...new Set(rows.map((r) => r.user_id))];

  if (users.length === 0) {
    console.log("No conversations logged yet.");
    return;
  }

  console.log(`Found ${users.length} distinct user(s) in the turn log.\n`);

  for (const userId of users) {
    const channels = rows.filter((r) => r.user_id === userId);
    const totalTurns = channels.reduce((sum, c) => sum + c.turns, 0);
    const memories = await recallMemories(userId, PROBE_QUERY, PROBE_LIMIT);

    console.log(`user: ${userId}`);
    console.log(`  channels: ${channels.map((c) => `${c.channel} (${c.turns} turns)`).join(", ")}`);
    console.log(`  total turns: ${totalTurns}`);
    console.log(`  memories recalled (approx, capped at ${PROBE_LIMIT}): ${memories.length}`);
    console.log(
      memories.length >= 10 ? "  meets 10-memory target ✔" : "  below 10-memory target ✘",
    );
    console.log("");
  }

  console.log(`Hackathon target: ≥3 users with ≥10 memories each. Users tracked: ${users.length}.`);
}

main().catch((err) => {
  console.error("memory-report failed:", err);
  process.exit(1);
});
