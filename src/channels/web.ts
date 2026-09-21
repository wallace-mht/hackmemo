import { Router } from "express";
import { randomUUID } from "node:crypto";
import { handleIncomingMessage } from "../core/conversation.js";

export const webRouter = Router();

webRouter.post("/api/chat", async (req, res) => {
  const { message, userId } = req.body ?? {};

  if (typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "message is required" });
    return;
  }

  const resolvedUserId =
    typeof userId === "string" && userId.length > 0 ? userId : randomUUID();

  try {
    const reply = await handleIncomingMessage(resolvedUserId, "web", message.trim());
    res.json({ reply, userId: resolvedUserId });
  } catch (err) {
    console.error("[web] chat handler failed:", err);
    res.status(500).json({ error: "internal error" });
  }
});
