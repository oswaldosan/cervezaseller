import { NextRequest, NextResponse } from "next/server";
import { db, SaleItem, SaleRow } from "@/lib/db";
import { productById } from "@/lib/products";
import { checkAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function readPassword(req: NextRequest, urlPw: string | null): string {
  return (
    req.headers.get("x-admin-password") ||
    urlPw ||
    ""
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const items = body.items as { id: string; qty: number }[];
  const paid = Number(body.paid);

  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Carrito vacío" }, { status: 400 });
  }

  const resolved: SaleItem[] = [];
  let total = 0;
  for (const it of items) {
    const p = productById(it.id);
    if (!p) return NextResponse.json({ error: `Producto ${it.id} inválido` }, { status: 400 });
    const qty = Math.max(1, Math.floor(it.qty));
    resolved.push({ id: p.id, name: p.name, price: p.price, qty });
    total += p.price * qty;
  }

  if (!Number.isFinite(paid) || paid < total) {
    return NextResponse.json({ error: "Pago insuficiente" }, { status: 400 });
  }

  const change = +(paid - total).toFixed(2);
  const createdAt = req.headers.get("x-created-at");
  const info = createdAt
    ? db
        .prepare(
          `INSERT INTO sales (created_at, total, paid, change, items_json) VALUES (?, ?, ?, ?, ?)`
        )
        .run(createdAt, total, paid, change, JSON.stringify(resolved))
    : db
        .prepare(
          `INSERT INTO sales (total, paid, change, items_json) VALUES (?, ?, ?, ?)`
        )
        .run(total, paid, change, JSON.stringify(resolved));

  return NextResponse.json({ id: info.lastInsertRowid, total, paid, change });
}

export async function GET() {
  const rows = db
    .prepare(
      `SELECT id, created_at, total, paid, change, items_json FROM sales ORDER BY id DESC LIMIT 200`
    )
    .all() as SaleRow[];
  const summary = db
    .prepare(
      `SELECT COALESCE(SUM(total),0) as total, COUNT(*) as count FROM sales WHERE date(created_at,'localtime') = date('now','localtime')`
    )
    .get() as { total: number; count: number };
  return NextResponse.json({
    sales: rows.map((r) => ({ ...r, items: JSON.parse(r.items_json) })),
    today: summary,
  });
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const all = url.searchParams.get("all");
  const pw = readPassword(req, url.searchParams.get("pw"));

  if (!checkAdmin(pw)) {
    return NextResponse.json({ error: "Password incorrecto" }, { status: 401 });
  }

  if (all === "1") {
    const info = db.prepare(`DELETE FROM sales`).run();
    return NextResponse.json({ ok: true, deleted: info.changes });
  }
  if (id) {
    const info = db.prepare(`DELETE FROM sales WHERE id = ?`).run(id);
    if (info.changes === 0) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id o all requerido" }, { status: 400 });
}
