# HackMemo

A personal memory assistant for hackathon work, built on [Walrus Memory](https://github.com/MystenLabs/MemWal)
for the **Walrus Session 8: Chatbots That Remember** hackathon.

You (and your teammates) text it decisions, bugs, and ideas as they come up during a hackathon —
over WhatsApp or the web widget — and ask it later: *"what did we decide about the token model for
project X?"*. It answers using memories stored on Walrus, not just the current conversation.

For the reasoning behind these choices, see [docs/CONCEPT.md](docs/CONCEPT.md) (why this exists),
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (system design decisions), and
[docs/MEMORY-MODEL.md](docs/MEMORY-MODEL.md) (how Walrus Memory is specifically used).

## How it works

- One Node/TypeScript backend serves two channels: a WhatsApp connector ([Baileys](https://github.com/WhiskeySockets/Baileys))
  and a small web chat widget.
- Every message is answered by Gemini, after recalling relevant memories for that user from
  Walrus Memory (`@mysten-incubation/memwal`) and injecting them into the prompt.
- After each reply, the turn is analyzed and new facts are stored back into Walrus Memory,
  scoped to a per-user namespace (`user:<id>`), so memories never leak across users.
- Every turn is also logged locally to SQLite — used to reconstruct before/after evidence for
  the hackathon submission article.

## Setup

### 1. Get credentials

- **Walrus Memory**: sign up at [memory.walrus.xyz](https://memory.walrus.xyz) to get an
  Ed25519 delegate key and an account object ID.
- **Gemini**: get a free API key at [aistudio.google.com](https://aistudio.google.com).

Copy `.env.example` to `.env` and fill in the values:

```bash
cp .env.example .env
```

### 2. Install and run

```bash
npm install
npm run dev
```

On first run, a QR code prints in the terminal — scan it from WhatsApp
(**Settings → Linked Devices → Link a Device**) to connect your number. The session is saved to
`WHATSAPP_AUTH_DIR` (default `./auth_info`) so you won't need to rescan on restart.

The web widget is served at `http://localhost:3000/widget/`.

### 3. Check health

```bash
curl http://localhost:3000/healthz
```

## Checking the hackathon usage target

The submission requires ≥3 distinct users with ≥10 memories each. Run:

```bash
npm run report:memory
```

This reports, per user, how many conversation turns were logged and an approximate count of
memories recalled from Walrus Memory.

## Deployment (Railway)

This process is long-running (the WhatsApp socket needs to stay connected), so it must run as a
persistent service, not a serverless function.

1. Create a new Railway project from this repo.
2. Add a **volume** mounted at the paths used by `WHATSAPP_AUTH_DIR` and `DB_PATH`, so the
   WhatsApp session and SQLite log survive redeploys.
3. Set the environment variables from `.env.example` in the Railway dashboard.
4. Deploy command: `npm run build && npm start`.
5. After the first deploy, check the deploy logs for the WhatsApp QR code and scan it once.

## Project structure

```
src/
  server.ts            Express app entrypoint, mounts web + starts WhatsApp
  channels/
    web.ts              REST endpoint for the widget (POST /api/chat)
    whatsapp.ts          Baileys connector
  core/
    memory.ts            Walrus Memory (MemWal) client wrapper
    llm.ts                Gemini wrapper + system prompt
    conversation.ts        Orchestrates recall -> prompt -> generate -> remember
  db/
    log.ts                SQLite turn log
public/widget/            Static chat widget
scripts/memory-report.ts  CLI to check the 3-users/10-memories target
```
