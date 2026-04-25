import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Row = { items_json: string; total: number; payment_method: "cash" | "card" };

function aggregate(rows: Row[]) {
  const byProduct: Record<
    string,
    { id: string; name: string; qty: number; amount: number }
  > = {};
  let units = 0;
  let total = 0;
  let cashTotal = 0;
  let cardTotal = 0;
  let cashCount = 0;
  let cardCount = 0;
  for (const r of rows) {
    total += r.total;
    if (r.payment_method === "card") {
      cardTotal += r.total;
      cardCount++;
    } else {
      cashTotal += r.total;
      cashCount++;
    }
    const items = JSON.parse(r.items_json) as {
      id: string;
      name: string;
      price: number;
      qty: number;
    }[];
    for (const it of items) {
      units += it.qty;
      if (!byProduct[it.id]) byProduct[it.id] = { id: it.id, name: it.name, qty: 0, amount: 0 };
      byProduct[it.id].qty += it.qty;
      byProduct[it.id].amount += it.price * it.qty;
    }
  }
  const breakdown = Object.values(byProduct).sort((a, b) => b.qty - a.qty);
  return {
    total,
    units,
    count: rows.length,
    cashTotal,
    cardTotal,
    cashCount,
    cardCount,
    breakdown,
  };
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") || "today";
  let rows: Row[] = [];
  let label = "";
  let meta: Record<string, any> = {};

  if (range === "today") {
    rows = db
      .prepare(
        `SELECT items_json, total, payment_method FROM sales
         WHERE date(created_at,'localtime') = date('now','localtime')`
      )
      .all() as Row[];
    label = "Hoy";
  } else if (range === "all") {
    rows = db.prepare(`SELECT items_json, total, payment_method FROM sales`).all() as Row[];
    label = "Todo";
  } else if (range === "period") {
    const last = db
      .prepare(`SELECT to_sale_id FROM cash_closings ORDER BY id DESC LIMIT 1`)
      .get() as { to_sale_id: number | null } | undefined;
    const afterId = last?.to_sale_id ?? 0;
    rows = db
      .prepare(`SELECT items_json, total, payment_method FROM sales WHERE id > ?`)
      .all(afterId) as Row[];
    label = `Período actual (desde venta #${afterId + 1})`;
    meta.afterId = afterId;
  } else if (range === "closing") {
    const id = Number(url.searchParams.get("id"));
    const c = db
      .prepare(
        `SELECT id, closed_at, from_sale_id, to_sale_id, total_sales, sales_count, units_sold
         FROM cash_closings WHERE id = ?`
      )
      .get(id) as
      | {
          id: number;
          closed_at: string;
          from_sale_id: number | null;
          to_sale_id: number | null;
          total_sales: number;
          sales_count: number;
          units_sold: number;
        }
      | undefined;
    if (!c) return NextResponse.json({ error: "Cierre no encontrado" }, { status: 404 });
    rows = db
      .prepare(`SELECT items_json, total, payment_method FROM sales WHERE id >= ? AND id <= ?`)
      .all(c.from_sale_id ?? 0, c.to_sale_id ?? 0) as Row[];
    label = `Cierre #${c.id}`;
    meta = { closing: c };
  } else {
    return NextResponse.json({ error: "range inválido" }, { status: 400 });
  }

  const agg = aggregate(rows);
  return NextResponse.json({ label, range, meta, ...agg });
}
