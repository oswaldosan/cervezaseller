import "server-only";
import { db } from "./db";
import { PRODUCTS, Product } from "./products";

type PriceRow = { id: string; price: number };

export function getPriceOverrides(): Record<string, number> {
  const rows = db.prepare(`SELECT id, price FROM product_prices`).all() as PriceRow[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.id] = r.price;
  return out;
}

export function getEffectiveProducts(): Product[] {
  const overrides = getPriceOverrides();
  return PRODUCTS.map((p) => (overrides[p.id] != null ? { ...p, price: overrides[p.id] } : p));
}

export function getEffectivePrice(id: string): number | null {
  const p = PRODUCTS.find((x) => x.id === id);
  if (!p) return null;
  const row = db
    .prepare(`SELECT price FROM product_prices WHERE id = ?`)
    .get(id) as { price: number } | undefined;
  return row ? row.price : p.price;
}

export function setProductPrice(id: string, price: number) {
  db.prepare(
    `INSERT INTO product_prices (id, price, updated_at) VALUES (?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET price = excluded.price, updated_at = excluded.updated_at`
  ).run(id, price);
}

export function resetProductPrice(id: string) {
  db.prepare(`DELETE FROM product_prices WHERE id = ?`).run(id);
}

export function resetAllPrices() {
  db.prepare(`DELETE FROM product_prices`).run();
}
