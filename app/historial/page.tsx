"use client";

import { useEffect, useState } from "react";

type Item = { id: string; name: string; price: number; qty: number };
type Sale = {
  id: number;
  created_at: string;
  total: number;
  paid: number;
  change: number;
  items: Item[];
};

function fmt(n: number) {
  return "L" + Number(n).toLocaleString("es-HN", { minimumFractionDigits: 0 });
}

export default function HistorialPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [today, setToday] = useState<{ total: number; count: number }>({ total: 0, count: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/sales", { cache: "no-store" });
    const data = await res.json();
    setSales(data.sales);
    setToday(data.today);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, []);

  const del = async (id: number) => {
    const pw = prompt(`Password para eliminar venta #${id}:`);
    if (!pw) return;
    const res = await fetch(`/api/sales?id=${id}`, {
      method: "DELETE",
      headers: { "x-admin-password": pw },
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error || "No se pudo eliminar");
      return;
    }
    load();
  };

  const clearAll = async () => {
    if (!confirm("¿Borrar TODO el historial de ventas? Esta acción no se puede deshacer.")) return;
    const pw = prompt("Password de administrador:");
    if (!pw) return;
    const res = await fetch(`/api/sales?all=1`, {
      method: "DELETE",
      headers: { "x-admin-password": pw },
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(d.error || "No se pudo borrar");
      return;
    }
    alert(`Borradas ${d.deleted} ventas.`);
    load();
  };

  const totalAll = sales.reduce((s, x) => s + x.total, 0);
  const unitsAll = sales.reduce(
    (s, x) => s + x.items.reduce((a, i) => a + i.qty, 0),
    0
  );

  return (
    <main className="px-4 lg:px-8 py-6 max-w-5xl mx-auto">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card label="Hoy" value={fmt(today.total)} hint={`${today.count} ventas`} />
        <Card label="Ventas listadas" value={String(sales.length)} />
        <Card label="Unidades" value={String(unitsAll)} />
        <Card label="Total listado" value={fmt(totalAll)} />
      </div>

      <div className="flex items-center justify-between mb-3">
        <h1 className="font-display text-2xl">Historial</h1>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="text-sm px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10"
          >
            Recargar
          </button>
          <button
            onClick={clearAll}
            disabled={sales.length === 0}
            className="text-sm px-4 py-2 rounded-full bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 disabled:opacity-30"
          >
            Borrar todo
          </button>
        </div>
      </div>

      {loading && <div className="text-white/60 py-10 text-center">Cargando…</div>}
      {!loading && sales.length === 0 && (
        <div className="text-white/60 py-16 text-center">Sin ventas todavía.</div>
      )}

      <div className="space-y-3">
        {sales.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 card-glow"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <span className="font-display text-lg">#{s.id}</span>
                <span className="text-xs text-white/50">
                  {new Date(s.created_at + "Z").toLocaleString("es-HN")}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-amber font-display text-xl">{fmt(s.total)}</span>
                <button
                  onClick={() => del(s.id)}
                  className="text-xs text-white/40 hover:text-red-400"
                >
                  Eliminar
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {s.items.map((it, i) => (
                <span
                  key={i}
                  className="chip bg-white/5 border border-white/10 text-white/80"
                >
                  {it.name} × {it.qty}{" "}
                  <span className="text-white/50">({fmt(it.price * it.qty)})</span>
                </span>
              ))}
            </div>
            <div className="text-xs text-white/50 flex gap-4">
              <span>Recibido: {fmt(s.paid)}</span>
              <span>Cambio: {fmt(s.change)}</span>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 card-glow">
      <div className="text-xs text-white/50 uppercase tracking-wide">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
      {hint && <div className="text-xs text-white/40 mt-0.5">{hint}</div>}
    </div>
  );
}
