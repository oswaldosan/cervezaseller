import { NextRequest, NextResponse } from "next/server";
import {
  getEffectiveProducts,
  setProductPrice,
  resetProductPrice,
  resetAllPrices,
} from "@/lib/products-server";
import { PRODUCTS } from "@/lib/products";
import { checkAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

function readPassword(req: NextRequest): string {
  return req.headers.get("x-admin-password") || "";
}

export async function GET() {
  return NextResponse.json({ products: getEffectiveProducts() });
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(readPassword(req))) {
    return NextResponse.json({ error: "Password incorrecto" }, { status: 401 });
  }
  const body = await req.json();
  const id = String(body.id || "");
  const price = Number(body.price);
  if (!PRODUCTS.find((p) => p.id === id)) {
    return NextResponse.json({ error: "Producto inválido" }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: "Precio inválido" }, { status: 400 });
  }
  setProductPrice(id, price);
  return NextResponse.json({ ok: true, id, price });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(readPassword(req))) {
    return NextResponse.json({ error: "Password incorrecto" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const all = url.searchParams.get("all");
  if (all === "1") {
    resetAllPrices();
    return NextResponse.json({ ok: true });
  }
  if (id) {
    resetProductPrice(id);
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id o all requerido" }, { status: 400 });
}
