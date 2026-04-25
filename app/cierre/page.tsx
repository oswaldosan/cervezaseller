"use client";

import { useEffect, useState } from "react";

type Breakdown = { id: string; name: string; qty: number; amount: number };
type Current = {
  afterId: number;
  total: number;
  count: number;
  units: number;
  minId: number | null;
  maxId: number | null;
  cashTotal: number;
  cardTotal: number;
  cashCount: number;
  cardCount: number;
  breakdown: Breakdown[];
};
type Closing = {
  id: number;
  closed_at: string;
  opening_cash: number;
  total_sales: number;
  sales_count: number;
  units_sold: number;
  expected_cash: number;
  counted_cash: number;
  difference: number;
  from_sale_id: number | null;
  to_sale_id: number | null;
  notes: string | null;
  cash_sales?: number;
  card_sales?: number;
  cash_count?: number;
  card_count?: number;
};

function fmt(n: number) {
  return "L" + Number(n).toLocaleString("es-HN", { minimumFractionDigits: 0 });
}

export default function CierrePage() {
  const [current, setCurrent] = useState<Current | null>(null);
  const [history, setHistory] = useState<Closing[]>([]);
  const [opening, setOpening] = useState("0");
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const load = async () => {
    const res = await fetch("/api/closings", { cache: "no-store" });
    const d = await res.json();
    setCurrent(d.current);
    setHistory(d.history);
  };
  useEffect(() => {
    load();
  }, []);

  const openingN = Number(opening) || 0;
  const countedN = Number(counted) || 0;
  // Card sales never enter the drawer.
  const expected = openingN + (current?.cashTotal || 0);
  const diff = countedN - expected;

  const submit = async () => {
    if (!current || current.count === 0 || busy) return;
    const pw = prompt("Password de administrador para cerrar caja:");
    if (!pw) return;
    setBusy(true);
    try {
      const res = await fetch("/api/closings", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({
          opening_cash: openingN,
          counted_cash: countedN,
          notes: notes || null,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Error");
      setMsg({ text: `Cierre #${d.id} guardado. Diferencia ${fmt(d.difference)}`, ok: true });
      setCounted("");
      setNotes("");
      load();
    } catch (e: any) {
      setMsg({ text: e.message, ok: false });
    } finally {
      setBusy(false);
      setTimeout(() => setMsg(null), 4000);
    }
  };

  return (
    <main className="px-4 lg:px-8 py-6 max-w-5xl mx-auto">
      <h1 className="font-display text-2xl mb-4">Cierre de caja</h1>

      <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 card-glow mb-6">
        <div className="text-xs text-white/50 uppercase tracking-wide mb-3">
          Período actual (desde venta #{(current?.afterId ?? 0) + 1})
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <Stat label="Ventas" value={String(current?.count ?? 0)} />
          <Stat label="Unidades" value={String(current?.units ?? 0)} />
          <Stat label="Total vendido" value={fmt(current?.total ?? 0)} />
          <Stat label="Rango" value={
            current && current.minId
              ? `#${current.minId}–#${current.maxId}`
              : "—"
          } />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Stat
            label={`💵 Efectivo (${current?.cashCount ?? 0})`}
            value={fmt(current?.cashTotal ?? 0)}
          />
          <Stat
            label={`💳 Tarjeta (${current?.cardCount ?? 0})`}
            value={fmt(current?.cardTotal ?? 0)}
          />
        </div>

        {current && current.breakdown.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {current.breakdown.map((b) => (
              <span
                key={b.id}
                className="chip bg-white/5 border border-white/10 text-white/80"
              >
                {b.name} × {b.qty}{" "}
                <span className="text-white/50">({fmt(b.amount)})</span>
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Field label="Fondo inicial (caja)" value={opening} onChange={setOpening} />
          <Field label="Efectivo contado" value={counted} onChange={setCounted} />
          <div>
            <label className="text-xs text-white/50 uppercase tracking-wide">Notas</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Opcional"
              className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-4">
          <Stat label="Esperado en caja" value={fmt(expected)} />
          <Stat label="Contado" value={fmt(countedN)} />
          <Stat
            label="Diferencia"
            value={fmt(diff)}
            tone={diff < 0 ? "bad" : diff > 0 ? "good" : "neutral"}
          />
        </div>
        <p className="text-[11px] text-white/40 mt-2">
          El esperado solo incluye ventas en efectivo + fondo inicial. Las ventas
          con tarjeta se reportan aparte.
        </p>

        <button
          onClick={submit}
          disabled={!current || current.count === 0 || busy}
          className="mt-5 w-full rounded-2xl py-4 text-lg font-bold bg-amber text-black hover:brightness-110 disabled:bg-white/10 disabled:text-white/40"
        >
          {busy ? "Guardando..." : "Cerrar caja"}
        </button>
      </section>

      <h2 className="font-display text-xl mb-3">Cierres anteriores</h2>
      {history.length === 0 && (
        <div className="text-white/60 py-10 text-center">Sin cierres todavía.</div>
      )}
      <div className="space-y-3">
        {history.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 card-glow"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3">
                <span className="font-display text-lg">Cierre #{c.id}</span>
                <span className="text-xs text-white/50">
                  {new Date(c.closed_at + "Z").toLocaleString("es-HN")}
                </span>
              </div>
              <span
                className={`font-display text-xl ${
                  c.difference < 0
                    ? "text-red-300"
                    : c.difference > 0
                    ? "text-emerald-300"
                    : "text-white"
                }`}
              >
                {fmt(c.difference)}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-white/70">
              <Info k="Fondo" v={fmt(c.opening_cash)} />
              <Info k="Ventas" v={`${c.sales_count} · ${fmt(c.total_sales)}`} />
              <Info k="Unidades" v={String(c.units_sold)} />
              <Info k="Esperado" v={fmt(c.expected_cash)} />
              <Info k="💵 Efectivo" v={`${c.cash_count ?? 0} · ${fmt(c.cash_sales ?? 0)}`} />
              <Info k="💳 Tarjeta" v={`${c.card_count ?? 0} · ${fmt(c.card_sales ?? 0)}`} />
              <Info k="Contado" v={fmt(c.counted_cash)} />
            </div>
            {c.notes && <div className="text-xs text-white/50 mt-2">📝 {c.notes}</div>}
          </div>
        ))}
      </div>

      {msg && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-full text-sm font-semibold shadow-xl ${
            msg.ok ? "bg-emerald-400 text-black" : "bg-red-500 text-white"
          }`}
        >
          {msg.text}
        </div>
      )}
    </main>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "neutral";
}) {
  const color =
    tone === "bad"
      ? "text-red-300"
      : tone === "good"
      ? "text-emerald-300"
      : "text-white";
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
      <div className="text-xs text-white/50 uppercase tracking-wide">{label}</div>
      <div className={`font-display text-xl mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-white/50 uppercase tracking-wide">{label}</label>
      <input
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ""))}
        className="w-full mt-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-lg font-display"
      />
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-white/40 uppercase tracking-wide text-[10px]">{k}</div>
      <div>{v}</div>
    </div>
  );
}
