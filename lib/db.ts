import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DATA_DIR = path.join(process.cwd(), "data");
const dbPath = path.join(DATA_DIR, "pos.db");

declare global {
  var __posDb: Database.Database | undefined;
}

function init(): Database.Database {
  if (global.__posDb) return global.__posDb;

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const instance = new Database(dbPath, { timeout: 5000 });
  instance.pragma("journal_mode = WAL");
  instance.pragma("busy_timeout = 5000");

  instance.exec(`
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

    CREATE TABLE IF NOT EXISTS product_prices (
      id TEXT PRIMARY KEY,
      price REAL NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const addColumn = (table: string, col: string, def: string) => {
    const cols = instance
      .prepare(`PRAGMA table_info(${table})`)
      .all() as { name: string }[];
    if (!cols.find((c) => c.name === col)) {
      instance.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    }
  };
  addColumn("sales", "payment_method", "TEXT NOT NULL DEFAULT 'cash'");
  addColumn("cash_closings", "cash_sales", "REAL NOT NULL DEFAULT 0");
  addColumn("cash_closings", "card_sales", "REAL NOT NULL DEFAULT 0");
  addColumn("cash_closings", "cash_count", "INTEGER NOT NULL DEFAULT 0");
  addColumn("cash_closings", "card_count", "INTEGER NOT NULL DEFAULT 0");

  global.__posDb = instance;
  return instance;
}

export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_t, prop, receiver) {
    const real = init();
    const value = Reflect.get(real, prop, real);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export type PaymentMethod = "cash" | "card";

export type SaleRow = {
  id: number;
  created_at: string;
  total: number;
  paid: number;
  change: number;
  items_json: string;
  payment_method: PaymentMethod;
};

export type SaleItem = { id: string; name: string; price: number; qty: number };
