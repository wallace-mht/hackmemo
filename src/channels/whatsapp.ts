import "dotenv/config";
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  type WASocket,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { handleIncomingMessage } from "../core/conversation.js";

const authDir = process.env.WHATSAPP_AUTH_DIR ?? "./auth_info";

export async function startWhatsAppChannel(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);

  const sock: WASocket = makeWASocket({
    auth: state,
    printQRInTerminal: false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("[whatsapp] Scan this QR code with WhatsApp (Linked Devices):");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[whatsapp] connection closed (code ${statusCode}), reconnect=${shouldReconnect}`);
      if (shouldReconnect) startWhatsAppChannel();
    } else if (connection === "open") {
      console.log("[whatsapp] connected");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const msg of messages) {
      if (msg.key.fromMe || !msg.message) continue;

      const jid = msg.key.remoteJid;
      if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast") continue; // skip groups/status

      const text =
        msg.message.conversation ?? msg.message.extendedTextMessage?.text ?? undefined;
      if (!text) continue;

      const userId = jid.replace(/@s\.whatsapp\.net$/, "");

      const allowedNumbers = process.env.ALLOWED_NUMBERS;
      if (allowedNumbers && !allowedNumbers.split(',').includes(userId)) {
        console.log(`[whatsapp] Bloqueando mensagem de número não autorizado: ${userId}`);
        continue;
      }
      try {
        const reply = await handleIncomingMessage(userId, "whatsapp", text);
        await sock.sendMessage(jid, { text: reply });
      } catch (err) {
        console.error(`[whatsapp] failed to handle message from ${userId}:`, err);
        await sock.sendMessage(jid, {
          text: "Sorry, something went wrong on my end. Try again in a moment.",
        });
      }
    }
  });
}
