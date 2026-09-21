import { recallMemories, rememberTurn } from "./memory.js";
import { generateReply, type ConversationTurn } from "./llm.js";
import { logTurn, recentHistoryFor } from "../db/log.js";

export async function handleIncomingMessage(
  userId: string,
  channel: "web" | "whatsapp",
  message: string,
): Promise<string> {
  const [memories, historyRows] = await Promise.all([
    recallMemories(userId, message),
    Promise.resolve(recentHistoryFor(userId)),
  ]);

  const history: ConversationTurn[] = historyRows.flatMap((row) => [
    { role: "user" as const, content: row.message },
    { role: "assistant" as const, content: row.reply },
  ]);

  const reply = await generateReply(message, memories, history);

  logTurn(userId, channel, message, reply);

  // Don't block the reply on memory extraction — store the fact asynchronously.
  rememberTurn(userId, `User said: "${message}". Assistant replied: "${reply}".`).catch((err) => {
    console.error(`[memory] failed to store turn for user ${userId}:`, err);
  });

  return reply;
}
