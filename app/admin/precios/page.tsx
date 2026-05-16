"use client";

import { useEffect, useState } from "react";
import { PRODUCTS, Product } from "@/lib/products";
import ProductThumb from "@/components/ProductThumb";

type Toast = { msg: string; tone: "ok" | "err" } | null;

function fmt(n: number) {
  return "L" + n.toLocaleString("es-HN", { minimumFractionDigits: 0 });
}

export default function PreciosAdminPage() {
  const [pw, setPw] = useState("");
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("admin_pw");
      if (saved) setPw(saved);
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/products", { cache: "no-store" });
        const data = await res.json();
        if (Array.isArray(data.products)) {
          setProducts(data.products);
          const d: Record<string, string> = {};
          for (const p of data.products as Product[]) d[p.id] = String(p.price);
          setDrafts(d);
        }
      } catch {}
    };
    load();
  }, []);

  const showToast = (msg: string, tone: "ok" | "err" = "ok") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };

  const savePw = (v: string) => {
    setPw(v);
    try {
      if (v) sessionStorage.setItem("admin_pw", v);
      else sessionStorage.removeItem("admin_pw");
    } catch {}
  };

  const update = async (id: string) => {
    if (!pw) {
      showToast("Ingresa el password de admin", "err");
      return;
    }
    const raw = drafts[id];
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) {
      showToast("Precio inválido", "err");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch("/api/products", {
        method: "PUT",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ id, price }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, price } : p))
      );
      showToast(`Actualizado: ${id} → ${fmt(price)}`);
    } catch (e: any) {
      showToast(e.message || "Error", "err");
    } finally {
      setBusy(null);
    }
  };

  const reset = async (id: string) => {
    if (!pw) {
      showToast("Ingresa el password de admin", "err");
      return;
    }
    setBusy(id);
    try {
      const res = await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { "x-admin-password": pw },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error");
      const def = PRODUCTS.find((p) => p.id === id);
      if (def) {
        setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, price: def.price } : p))
        );
        setDrafts((d) => ({ ...d, [id]: String(def.price) }));
      }
      showToast(`Restaurado: ${id}`);
    } catch (e: any) {
      showToast(e.message || "Error", "err");
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="flex-1 min-h-0 px-4 lg:px-8 py-4 overflow-auto">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1 className="font-display text-2xl">Precios</h1>
            <p className="text-white/50 text-sm">
              Cambios se aplican al instante. Los valores se conservan al reiniciar.
            </p>
          </div>
          <input
            type="password"
            value={pw}
            onChange={(e) => savePw(e.target.value)}
            placeholder="Password admin"
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm w-56"
          />
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
          <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-2 text-xs uppercase tracking-wider text-white/50 border-b border-white/10">
            <span>Producto</span>
            <span className="text-right w-20">Default</span>
            <span className="text-right w-32">Nuevo</span>
            <span className="w-40"></span>
          </div>
          {products.map((p) => {
            const def = PRODUCTS.find((x) => x.id === p.id)!;
            const overridden = p.price !== def.price;
            const draft = drafts[p.id] ?? String(p.price);
            const draftNum = Number(draft);
            const dirty = Number.isFinite(draftNum) && draftNum !== p.price;
            return (
              <div
                key={p.id}
                className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-4 py-3 border-b border-white/5 last:border-b-0"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <ProductThumb product={p} size={40} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-white/40 truncate">
                      {p.id}
                      {overridden && (
                        <span className="ml-2 text-amber">· modificado</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right text-white/50 text-sm w-20">
                  {fmt(def.price)}
                </div>
                <div className="w-32">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="1"
                    value={draft}
                    onChange={(e) =>
                      setDrafts((d) => ({ ...d, [p.id]: e.target.value }))
                    }
                    className={`w-full bg-white/5 border rounded-lg px-2 py-1.5 text-right font-semibold ${
                      dirty ? "border-amber" : "border-white/10"
                    }`}
                  />
                </div>
                <div className="w-40 flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => update(p.id)}
                    disabled={!dirty || busy === p.id}
                    className="rounded-lg bg-amber text-black font-bold px-3 py-1.5 text-sm disabled:bg-white/10 disabled:text-white/40"
                  >
                    {busy === p.id ? "..." : "Guardar"}
                  </button>
                  <button
                    onClick={() => reset(p.id)}
                    disabled={!overridden || busy === p.id}
                    className="rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 px-2 py-1.5 text-xs disabled:opacity-30"
                    title="Restaurar precio por defecto"
                  >
                    ↺
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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
