import "dotenv/config";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = process.env.DB_PATH ?? "./data/hackmemo.db";
mkdirSync(dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS turns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    channel TEXT NOT NULL,
    message TEXT NOT NULL,
    reply TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const insertStmt = db.prepare(
  `INSERT INTO turns (user_id, channel, message, reply) VALUES (?, ?, ?, ?)`,
);

export function logTurn(userId: string, channel: string, message: string, reply: string): void {
  insertStmt.run(userId, channel, message, reply);
}

export function turnCountsByUser(): { user_id: string; channel: string; turns: number }[] {
  return db
    .prepare(
      `SELECT user_id, channel, COUNT(*) as turns FROM turns GROUP BY user_id, channel ORDER BY turns DESC`,
    )
    .all() as { user_id: string; channel: string; turns: number }[];
}

export function recentHistoryFor(
  userId: string,
  limit = 6,
): { message: string; reply: string }[] {
  return db
    .prepare(
      `SELECT message, reply FROM turns WHERE user_id = ? ORDER BY id DESC LIMIT ?`,
    )
    .all(userId, limit)
    .reverse() as { message: string; reply: string }[];
}
