import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

type SaleAgg = {
  total: number;
  count: number;
  min_id: number | null;
  max_id: number | null;
  items_json: string | null;
};

function computeCurrent() {
  const lastClosing = db
    .prepare(`SELECT to_sale_id FROM cash_closings ORDER BY id DESC LIMIT 1`)
    .get() as { to_sale_id: number | null } | undefined;
  const afterId = lastClosing?.to_sale_id ?? 0;

  const agg = db
    .prepare(
      `SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count,
              MIN(id) as min_id, MAX(id) as max_id
       FROM sales WHERE id > ?`
    )
    .get(afterId) as SaleAgg;

  const rows = db
    .prepare(`SELECT items_json FROM sales WHERE id > ?`)
    .all(afterId) as { items_json: string }[];

  const byProduct: Record<string, { name: string; qty: number; amount: number }> = {};
  let units = 0;
  for (const r of rows) {
    const items = JSON.parse(r.items_json) as {
      id: string;
      name: string;
      price: number;
      qty: number;
    }[];
    for (const it of items) {
      units += it.qty;
      const k = it.id;
      if (!byProduct[k]) byProduct[k] = { name: it.name, qty: 0, amount: 0 };
      byProduct[k].qty += it.qty;
      byProduct[k].amount += it.price * it.qty;
    }
  }

  return {
    afterId,
    total: agg.total,
    count: agg.count,
    units,
    minId: agg.min_id,
    maxId: agg.max_id,
    breakdown: Object.entries(byProduct).map(([id, v]) => ({ id, ...v })),
  };
}

export async function GET() {
  const current = computeCurrent();
  const history = db
    .prepare(
      `SELECT id, closed_at, opening_cash, total_sales, sales_count, units_sold,
              expected_cash, counted_cash, difference, from_sale_id, to_sale_id, notes
       FROM cash_closings ORDER BY id DESC LIMIT 30`
    )
    .all();
  return NextResponse.json({ current, history });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const pw = req.headers.get("x-admin-password") || body.password || "";
  if (!checkAdmin(pw)) {
    return NextResponse.json({ error: "Password incorrecto" }, { status: 401 });
  }

  const opening = Number(body.opening_cash) || 0;
  const counted = Number(body.counted_cash) || 0;
  const notes = typeof body.notes === "string" ? body.notes.slice(0, 500) : null;

  const cur = computeCurrent();
  if (cur.count === 0) {
    return NextResponse.json(
      { error: "No hay ventas nuevas desde el último cierre" },
      { status: 400 }
    );
  }

  const expected = +(opening + cur.total).toFixed(2);
  const difference = +(counted - expected).toFixed(2);

  const info = db
    .prepare(
      `INSERT INTO cash_closings
       (opening_cash, total_sales, sales_count, units_sold, expected_cash,
        counted_cash, difference, from_sale_id, to_sale_id, notes, breakdown_json)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      opening,
      cur.total,
      cur.count,
      cur.units,
      expected,
      counted,
      difference,
      cur.minId,
      cur.maxId,
      notes,
      JSON.stringify(cur.breakdown)
    );

  return NextResponse.json({
    id: info.lastInsertRowid,
    opening_cash: opening,
    total_sales: cur.total,
    sales_count: cur.count,
    units_sold: cur.units,
    expected_cash: expected,
    counted_cash: counted,
    difference,
  });
}
