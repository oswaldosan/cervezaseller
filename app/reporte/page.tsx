"use client";

import { useEffect, useMemo, useState } from "react";

type Item = { id: string; name: string; qty: number; amount: number };
type Report = {
  label: string;
  range: string;
  total: number;
  units: number;
  count: number;
  cashTotal: number;
  cardTotal: number;
  cashCount: number;
  cardCount: number;
  breakdown: Item[];
  meta?: any;
};
type Closing = {
  id: number;
  closed_at: string;
  total_sales: number;
  sales_count: number;
};

type Tab = "today" | "period" | "all" | "closing";

function fmt(n: number) {
  return "L" + Number(n).toLocaleString("es-HN", { minimumFractionDigits: 0 });
}

export default function ReportePage() {
  const [tab, setTab] = useState<Tab>("today");
  const [closingId, setClosingId] = useState<number | null>(null);
  const [closings, setClosings] = useState<Closing[]>([]);
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/closings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setClosings(d.history || []));
  }, []);

  const load = async () => {
    setLoading(true);
    let url = `/api/report?range=${tab}`;
    if (tab === "closing" && closingId) url += `&id=${closingId}`;
    const res = await fetch(url, { cache: "no-store" });
    const d = await res.json();
    setData(d);
    setLoading(false);
  };

  useEffect(() => {
    if (tab === "closing" && !closingId) {
      setData(null);
      return;
    }
    load();
  }, [tab, closingId]);

  const maxQty = useMemo(
    () => (data?.breakdown.length ? Math.max(...data.breakdown.map((b) => b.qty)) : 0),
    [data]
  );

  const exportCSV = () => {
    if (!data) return;
    const rows = [
      ["Producto", "Unidades", "Monto"],
      ...data.breakdown.map((b) => [b.name, String(b.qty), String(b.amount)]),
      [],
      ["Total ventas", String(data.count)],
      ["Unidades totales", String(data.units)],
      ["Monto total", String(data.total)],
      ["Efectivo (#)", String(data.cashCount)],
      ["Efectivo (L)", String(data.cashTotal)],
      ["Tarjeta (#)", String(data.cardCount)],
      ["Tarjeta (L)", String(data.cardTotal)],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-${tab}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="px-4 lg:px-8 py-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h1 className="font-display text-2xl">Reporte de ventas</h1>
        <button
          onClick={exportCSV}
          disabled={!data || data.count === 0}
          className="text-sm px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-30"
        >
          Exportar CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <TabBtn active={tab === "today"} onClick={() => setTab("today")}>Hoy</TabBtn>
        <TabBtn active={tab === "period"} onClick={() => setTab("period")}>Período actual</TabBtn>
        <TabBtn active={tab === "all"} onClick={() => setTab("all")}>Todo</TabBtn>
        <TabBtn active={tab === "closing"} onClick={() => setTab("closing")}>Por cierre</TabBtn>
      </div>

      {tab === "closing" && (
        <div className="mb-4">
          <select
            value={closingId ?? ""}
            onChange={(e) => setClosingId(e.target.value ? Number(e.target.value) : null)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">— Elegí un cierre —</option>
            {closings.map((c) => (
              <option key={c.id} value={c.id}>
                Cierre #{c.id} — {new Date(c.closed_at + "Z").toLocaleString("es-HN")} — {fmt(c.total_sales)}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading && <div className="text-white/60 py-10 text-center">Cargando…</div>}

      {data && !loading && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <Stat label="Ventas" value={String(data.count)} />
            <Stat label="Unidades" value={String(data.units)} />
            <Stat label="Total" value={fmt(data.total)} />
            <Stat label="Ticket promedio" value={data.count ? fmt(data.total / data.count) : "—"} />
          </div>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Stat
              label={`💵 Efectivo (${data.cashCount})`}
              value={fmt(data.cashTotal)}
            />
            <Stat
              label={`💳 Tarjeta (${data.cardCount})`}
              value={fmt(data.cardTotal)}
            />
          </div>

          {data.breakdown.length === 0 ? (
            <div className="text-white/60 py-16 text-center">
              Sin ventas en este período.
            </div>
          ) : (
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 card-glow overflow-hidden">
              <div className="px-5 py-3 border-b border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/50 uppercase tracking-wide">
                  {data.label} · por producto
                </span>
              </div>
              <div className="divide-y divide-white/5">
                {data.breakdown.map((b, i) => {
                  const pct = maxQty ? (b.qty / maxQty) * 100 : 0;
                  const pctAmount = data.total ? (b.amount / data.total) * 100 : 0;
                  return (
                    <div key={b.id} className="px-5 py-3">
                      <div className="flex items-baseline justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-white/40 text-sm w-5 text-right">{i + 1}</span>
                          <span className="font-medium truncate">{b.name}</span>
                        </div>
                        <div className="flex items-baseline gap-4 shrink-0">
                          <span className="font-display text-xl">× {b.qty}</span>
                          <span className="text-amber font-display text-lg w-24 text-right">
                            {fmt(b.amount)}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-amber/70 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-white/40 mt-1">
                        {pctAmount.toFixed(1)}% del total
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm border transition ${
        active
          ? "bg-amber text-black border-amber font-semibold"
          : "bg-white/5 hover:bg-white/10 border-white/10 text-white/80"
      }`}
    >
      {children}
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 card-glow">
      <div className="text-xs text-white/50 uppercase tracking-wide">{label}</div>
      <div className="font-display text-2xl mt-1">{value}</div>
    </div>
  );
}
