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

type Method = "cash" | "card";

export default function POSPage() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [paidStr, setPaidStr] = useState<string>("");
  const [method, setMethod] = useState<Method>("cash");
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
  const paid = method === "card" ? total : Number(paidStr) || 0;
  const change = method === "card" ? 0 : paid - total;
  const canPay = total > 0 && (method === "card" || paid >= total);

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
    setMethod("cash");
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
      method,
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
        method,
      });
      window.dispatchEvent(new Event("pos:queue-update"));
      setToast({
        msg:
          method === "card"
            ? `Sin conexión — Venta tarjeta guardada local`
            : `Sin conexión — Venta guardada local · Cambio ${fmt(change)}`,
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
      setToast({
        msg:
          method === "card"
            ? `Venta #${data.id} con TARJETA — ${fmt(data.total)}`
            : `Venta #${data.id} — Cambio ${fmt(data.change)}`,
        tone: "ok",
      });
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
          <div className="shrink-0 px-4 py-2 flex items-center justify-between border-b border-white/10">
            <div className="font-display text-base">Cuenta</div>
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
              <div key={l.product.id} className="flex items-center gap-2 py-2">
                <div className="shrink-0"><ProductThumb product={l.product} size={36} /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate leading-tight">{l.product.name}</div>
                  <div className="text-[10px] text-white/50">{fmt(l.product.price)} c/u</div>
                </div>
                <div className="flex items-center gap-0.5">
                  <button
                    onClick={() => dec(l.product.id)}
                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-base"
                  >−</button>
                  <div className="w-7 text-center font-semibold text-sm">{l.qty}</div>
                  <button
                    onClick={() => add(l.product.id)}
                    className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 text-base"
                  >+</button>
                </div>
                <div className="w-16 text-right font-semibold text-sm">
                  {fmt(l.product.price * l.qty)}
                </div>
                <button
                  onClick={() => remove(l.product.id)}
                  className="text-white/30 hover:text-red-400 px-0.5 text-sm"
                  aria-label="Quitar"
                >✕</button>
              </div>
            ))}
          </div>

          <div className="shrink-0 px-4 py-2 border-t border-white/10 bg-black/30 flex items-baseline justify-between">
            <span className="text-white/60 text-sm">Total</span>
            <span className="font-display text-amber" style={{ fontSize: "clamp(1.25rem,3.2vh,2rem)" }}>{fmt(total)}</span>
          </div>

          {/* Method toggle */}
          <div className="shrink-0 px-4 pt-2">
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/5 border border-white/10 rounded-xl">
              <button
                onClick={() => setMethod("cash")}
                className={`rounded-lg font-semibold transition ${
                  method === "cash" ? "bg-amber text-black" : "text-white/70 hover:text-white"
                }`}
                style={{ padding: "clamp(0.4rem,1.3vh,0.7rem) 0", fontSize: "clamp(0.8rem,1.6vh,1rem)" }}
              >
                💵 Efectivo
              </button>
              <button
                onClick={() => setMethod("card")}
                className={`rounded-lg font-semibold transition ${
                  method === "card" ? "bg-sky-400 text-black" : "text-white/70 hover:text-white"
                }`}
                style={{ padding: "clamp(0.4rem,1.3vh,0.7rem) 0", fontSize: "clamp(0.8rem,1.6vh,1rem)" }}
              >
                💳 Tarjeta
              </button>
            </div>
          </div>

          {method === "cash" && (
            <>
              {/* Paid input & quick bills */}
              <div className="shrink-0 px-4 pt-2">
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-white/60 text-xs">Recibido</span>
                  <span className="font-display" style={{ fontSize: "clamp(0.95rem,2vh,1.25rem)" }}>{fmt(paid)}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-1.5">
                  {QUICK_BILLS.map((b) => (
                    <button
                      key={b}
                      onClick={() => addBill(b)}
                      className="rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold"
                      style={{ padding: "clamp(0.35rem,1.2vh,0.65rem) 0", fontSize: "clamp(0.75rem,1.5vh,0.95rem)" }}
                    >
                      +L{b}
                    </button>
                  ))}
                </div>
                <button
                  onClick={exact}
                  disabled={total === 0}
                  className="w-full rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs disabled:opacity-30 mb-1.5"
                  style={{ padding: "clamp(0.3rem,1vh,0.6rem) 0" }}
                >
                  Pago exacto
                </button>
              </div>

              {/* Numpad */}
              <div className="shrink-0 px-4 pb-2 grid grid-cols-3 gap-1.5">
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
            </>
          )}

          {/* Change + pay */}
          <div className="shrink-0 px-4 pb-3 pt-2">
            {method === "cash" ? (
              <div
                className={`rounded-2xl border flex items-baseline justify-between mb-2 ${
                  change < 0
                    ? "bg-red-500/10 border-red-500/30"
                    : change > 0
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-white/5 border-white/10"
                }`}
                style={{ padding: "clamp(0.5rem,1.6vh,1rem)" }}
              >
                <span className="text-xs text-white/70">Cambio</span>
                <span
                  className={`font-display ${
                    change < 0 ? "text-red-300" : change > 0 ? "text-emerald-300" : "text-white"
                  }`}
                  style={{ fontSize: "clamp(1.1rem,3vh,1.85rem)" }}
                >
                  {change < 0 ? `Falta ${fmt(Math.abs(change))}` : fmt(change)}
                </span>
              </div>
            ) : (
              <div
                className="rounded-2xl border bg-sky-500/10 border-sky-500/30 flex items-baseline justify-between mb-2"
                style={{ padding: "clamp(0.5rem,1.6vh,1rem)" }}
              >
                <span className="text-xs text-white/80">Pago con tarjeta</span>
                <span
                  className="font-display text-sky-200"
                  style={{ fontSize: "clamp(1.1rem,3vh,1.85rem)" }}
                >
                  {fmt(total)}
                </span>
              </div>
            )}
            <button
              onClick={pay}
              disabled={!canPay || busy}
              className={`w-full rounded-2xl font-bold transition disabled:bg-white/10 disabled:text-white/40 ${
                method === "card"
                  ? "bg-sky-400 text-black hover:brightness-110 active:brightness-95"
                  : "bg-amber text-black hover:brightness-110 active:brightness-95"
              }`}
              style={{ padding: "clamp(0.6rem,2.2vh,1.1rem) 0", fontSize: "clamp(0.95rem,2.4vh,1.25rem)" }}
            >
              {busy
                ? "Guardando..."
                : method === "card"
                ? "Cobrar con tarjeta"
                : "Cobrar y guardar"}
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
