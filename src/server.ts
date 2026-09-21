import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { webRouter } from "./channels/web.js";
import { startWhatsAppChannel } from "./channels/whatsapp.js";
import { health } from "./core/memory.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use(webRouter);

app.get("/healthz", async (_req, res) => {
  try {
    const memwalHealth = await health();
    res.json({ ok: true, memwal: memwalHealth });
  } catch (err) {
    res.status(503).json({ ok: false, error: String(err) });
  }
});

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  console.log(`[server] HackMemo listening on port ${port}`);
});

startWhatsAppChannel().catch((err) => {
  console.error("[whatsapp] failed to start:", err);
});
