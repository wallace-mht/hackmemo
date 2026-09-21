import "dotenv/config";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { RecalledMemory } from "./memory.js";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("Missing required env var: GEMINI_API_KEY");

const genAI = new GoogleGenerativeAI(apiKey);
const modelName = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";

const SYSTEM_PROMPT = `You are HackMemo, a personal memory assistant for someone who works across
multiple Sui hackathons and side projects. Your job is to help them and their teammates capture
decisions, bugs, and ideas as they come up, and recall the right ones later when asked.

Rules:
- Be concise and direct, like a sharp teammate, not a customer-support bot.
- When relevant memories are provided below, actually use them in your answer — reference the
  specific decision or fact, don't just acknowledge that you "remember something".
- If no memory is relevant to the question, say so plainly instead of making something up.
- Reply in the same language the user writes in.`;

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export async function generateReply(
  userMessage: string,
  memories: RecalledMemory[],
  recentHistory: ConversationTurn[],
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: SYSTEM_PROMPT });

  const memoryBlock = memories.length
    ? `Relevant memories about this user:\n${memories.map((m) => `- ${m.text}`).join("\n")}`
    : "No relevant memories found for this question.";

  const history = recentHistory.map((turn) => ({
    role: turn.role === "user" ? "user" : "model",
    parts: [{ text: turn.content }],
  }));

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(`${memoryBlock}\n\nUser: ${userMessage}`);
  return result.response.text();
}
