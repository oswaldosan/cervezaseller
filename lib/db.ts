import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, "pos.db");

declare global {
  var __posDb: Database.Database | undefined;
}

export const db: Database.Database =
  global.__posDb ?? new Database(dbPath);

if (!global.__posDb) {
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      total REAL NOT NULL,
      paid REAL NOT NULL,
      change REAL NOT NULL,
      items_json TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);

    CREATE TABLE IF NOT EXISTS cash_closings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      closed_at TEXT NOT NULL DEFAULT (datetime('now')),
      opening_cash REAL NOT NULL DEFAULT 0,
      total_sales REAL NOT NULL DEFAULT 0,
      sales_count INTEGER NOT NULL DEFAULT 0,
      units_sold INTEGER NOT NULL DEFAULT 0,
      expected_cash REAL NOT NULL DEFAULT 0,
      counted_cash REAL NOT NULL DEFAULT 0,
      difference REAL NOT NULL DEFAULT 0,
      from_sale_id INTEGER,
      to_sale_id INTEGER,
      notes TEXT,
      breakdown_json TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_closings_closed ON cash_closings(closed_at);
  `);
  global.__posDb = db;
}

export type SaleRow = {
  id: number;
  created_at: string;
  total: number;
  paid: number;
  change: number;
  items_json: string;
};

export type SaleItem = { id: string; name: string; price: number; qty: number };
