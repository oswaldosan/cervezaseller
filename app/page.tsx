"use client";

import { useMemo, useState } from "react";
import { PRODUCTS, Product } from "@/lib/products";
import ProductThumb from "@/components/ProductThumb";
import ProductCard from "@/components/ProductCard";
import { enqueue } from "@/lib/offlineQueue";

type CartLine = { product: Product; qty: number };

const QUICK_BILLS = [20, 50, 100, 200, 500, 1000];

function fmt(n: number) {
  return "L" + n.toLocaleString("es-HN", { minimumFractionDigits: 0 });
}

export default function POSPage() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paidStr, setPaidStr] = useState<string>("");
  const [toast, setToast] = useState<{ msg: string; tone: "ok" | "err" } | null>(null);
  const [busy, setBusy] = useState(false);

  const lines: CartLine[] = useMemo(
    () =>
      Object.entries(cart)
        .map(([id, qty]) => {
          const p = PRODUCTS.find((x) => x.id === id)!;
          return { product: p, qty };
        })
        .filter((l) => l.qty > 0),
    [cart]
  );
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const paid = Number(paidStr) || 0;
  const change = paid - total;
  const canPay = total > 0 && paid >= total;

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  const dec = (id: string) =>
    setCart((c) => {
      const n = (c[id] || 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id];
      else next[id] = n;
      return next;
    });
  const remove = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  const clearAll = () => {
    setCart({});
    setPaidStr("");
  };

  const tapPad = (v: string) => {
    setPaidStr((s) => {
      if (v === "back") return s.slice(0, -1);
      if (v === "clear") return "";
      if (v === "." && s.includes(".")) return s;
      if (s.length > 9) return s;
      return s + v;
    });
  };

  const addBill = (n: number) => setPaidStr(String((Number(paidStr) || 0) + n));
  const exact = () => setPaidStr(String(total));

  const pay = async () => {
    if (!canPay || busy) return;
    setBusy(true);
    const payload = {
      items: lines.map((l) => ({ id: l.product.id, qty: l.qty })),
      paid,
    };
    const localId =
      (typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now() + Math.random()));
    const createdAt = new Date().toISOString().replace("T", " ").slice(0, 19);

    const queueOffline = () => {
      enqueue({
        localId,
        createdAt,
        items: payload.items,
        paid,
        total,
        change,
      });
      window.dispatchEvent(new Event("pos:queue-update"));
      setToast({
        msg: `Sin conexión — Venta guardada local · Cambio ${fmt(change)}`,
        tone: "ok",
      });
      clearAll();
    };

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        queueOffline();
        return;
      }
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-local-id": localId,
          "x-created-at": createdAt,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setToast({ msg: `Venta #${data.id} — Cambio ${fmt(data.change)}`, tone: "ok" });
      clearAll();
    } catch (e: any) {
      // Network / server down: queue
      queueOffline();
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 3500);
    }
  };

  return (
    <main className="flex-1 min-h-0 px-3 lg:px-6 py-3 grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 lg:overflow-hidden overflow-auto">
      {/* Products */}
      <section className="flex flex-col min-h-0">
        <div className="flex items-end justify-between mb-2 px-1 shrink-0">
          <h1 className="font-display text-xl">Productos</h1>
          <div className="text-xs text-white/40">Toca para agregar</div>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-3 xl:grid-cols-3 gap-2 flex-1 min-h-0 auto-rows-fr">
          {PRODUCTS.map((p) => {
            const qty = cart[p.id] || 0;
            return (
              <ProductCard
                key={p.id}
                product={p}
                qty={qty}
                onAdd={() => add(p.id)}
              />
            );
          })}
        </div>
      </section>

      {/* Cart */}
      <aside className="min-h-0 overflow-hidden">
        <div className="h-full rounded-3xl bg-white/[0.04] border border-white/10 card-glow overflow-hidden flex flex-col">
          <div className="px-5 py-4 flex items-center justify-between border-b border-white/10">
            <div className="font-display text-lg">Cuenta</div>
            <button
              onClick={clearAll}
              disabled={lines.length === 0 && !paidStr}
              className="text-xs text-white/60 hover:text-white disabled:opacity-30"
            >
              Limpiar
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-auto px-3 py-2 divide-y divide-white/5">
            {lines.length === 0 && (
              <div className="text-white/40 text-center py-10 text-sm">
                Sin productos. Toca uno para empezar.
              </div>
            )}
            {lines.map((l) => (
              <div key={l.product.id} className="flex items-center gap-3 py-3">
                <div className="shrink-0"><ProductThumb product={l.product} size={44} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{l.product.name}</div>
                  <div className="text-xs text-white/50">{fmt(l.product.price)} c/u</div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => dec(l.product.id)}
                    className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 text-lg"
                  >−</button>
                  <div className="w-8 text-center font-semibold">{l.qty}</div>
                  <button
                    onClick={() => add(l.product.id)}
                    className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 text-lg"
                  >+</button>
                </div>
                <div className="w-20 text-right font-semibold">
                  {fmt(l.product.price * l.qty)}
                </div>
                <button
                  onClick={() => remove(l.product.id)}
                  className="text-white/30 hover:text-red-400 px-1"
                  aria-label="Quitar"
                >✕</button>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-white/10 bg-black/30 flex items-baseline justify-between">
            <span className="text-white/60 text-sm">Total</span>
            <span className="font-display text-3xl text-amber">{fmt(total)}</span>
          </div>

          {/* Paid input & quick bills */}
          <div className="px-5 pt-4">
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-white/60 text-sm">Recibido</span>
              <span className="font-display text-xl">{fmt(paid)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {QUICK_BILLS.map((b) => (
                <button
                  key={b}
                  onClick={() => addBill(b)}
                  className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-3 font-semibold"
                >
                  +L{b}
                </button>
              ))}
            </div>
            <button
              onClick={exact}
              disabled={total === 0}
              className="w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 py-2.5 text-sm disabled:opacity-30 mb-3"
            >
              Pago exacto
            </button>
          </div>

          {/* Numpad */}
          <div className="px-5 pb-3 grid grid-cols-3 gap-2">
            {["1","2","3","4","5","6","7","8","9",".","0","back"].map((k) => (
              <button
                key={k}
                onClick={() => tapPad(k)}
                className="num-pad-btn"
              >
                {k === "back" ? "⌫" : k}
              </button>
            ))}
          </div>

          {/* Change + pay */}
          <div className="px-5 pb-5">
            <div
              className={`rounded-2xl border p-4 flex items-baseline justify-between mb-3 ${
                change < 0
                  ? "bg-red-500/10 border-red-500/30"
                  : change > 0
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/5 border-white/10"
              }`}
            >
              <span className="text-sm text-white/70">Cambio</span>
              <span
                className={`font-display text-3xl ${
                  change < 0 ? "text-red-300" : change > 0 ? "text-emerald-300" : "text-white"
                }`}
              >
                {change < 0 ? `Falta ${fmt(Math.abs(change))}` : fmt(change)}
              </span>
            </div>
            <button
              onClick={pay}
              disabled={!canPay || busy}
              className="w-full rounded-2xl py-5 text-xl font-bold bg-amber text-black hover:brightness-110 active:brightness-95 disabled:bg-white/10 disabled:text-white/40 transition"
            >
              {busy ? "Guardando..." : "Cobrar y guardar"}
            </button>
          </div>
        </div>
      </aside>

      {toast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-xl ${
            toast.tone === "ok" ? "bg-emerald-400 text-black" : "bg-red-500 text-white"
          }`}
        >
          {toast.msg}
        </div>
      )}
    </main>
  );
}
