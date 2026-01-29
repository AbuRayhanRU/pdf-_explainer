import fs from "node:fs";
import path from "node:path";
import sqlite3 from "sqlite3";
import { open, type Database } from "sqlite";

let dbPromise: Promise<Database> | null = null;

export const getDb = () => {
  if (!dbPromise) {
    const dbPath = process.env.SQLITE_PATH ?? path.resolve("data", "app.db");
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    dbPromise = open({ filename: dbPath, driver: sqlite3.Database });
  }
  return dbPromise;
};

export const initDb = async () => {
  const db = await getDb();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
};
