import { db } from "@/lib/db";
import { FEATURES } from "@/lib/features";
import { notFound } from "next/navigation";
import TicketClient from "./TicketClient";
import "./ticket.css";

export const dynamic = "force-dynamic";

type Item = { id: string; name: string; price: number; qty: number };
type SaleRow = {
  id: number;
  created_at: string;
  total: number;
  paid: number;
  change: number;
  items_json: string;
  payment_method: "cash" | "card";
};

function fmt(n: number) {
  return "L" + Math.round(n).toLocaleString("es-HN");
}

export default function TicketPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { autoprint?: string };
}) {
  if (!FEATURES.tickets) return notFound();

  const id = Number(params.id);
  if (!Number.isFinite(id)) return notFound();

  const sale = db
    .prepare(
      `SELECT id, created_at, total, paid, change, items_json, payment_method
       FROM sales WHERE id = ?`
    )
    .get(id) as SaleRow | undefined;

  if (!sale) return notFound();

  const items = JSON.parse(sale.items_json) as Item[];
  const auto = searchParams.autoprint === "1";
  const date = new Date(sale.created_at + "Z").toLocaleString("es-HN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <TicketClient autoprint={auto}>
      <div className="ticket">
        <header className="t-head">
          <div className="t-logo">🍺</div>
          <div className="t-title">CervezaSystem</div>
          <div className="t-sub">Caja registradora</div>
        </header>

        <div className="t-rule" />

        <div className="t-meta">
          <div className="t-meta-row">
            <strong>Ticket #{sale.id}</strong>
            <span className="t-method">
              {sale.payment_method === "card" ? "💳 TARJETA" : "💵 EFECTIVO"}
            </span>
          </div>
          <div className="t-date">{date}</div>
        </div>

        <div className="t-rule" />

        <table className="t-items">
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td className="t-name">{it.name}</td>
                <td className="t-qty">x{it.qty}</td>
                <td className="t-amt">{fmt(it.price * it.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="t-rule" />

        <div className="t-total-row">
          <span>TOTAL</span>
          <span className="t-total">{fmt(sale.total)}</span>
        </div>

        {sale.payment_method === "cash" ? (
          <>
            <div className="t-row">
              <span>Recibido</span>
              <span>{fmt(sale.paid)}</span>
            </div>
            <div className="t-row">
              <span>Cambio</span>
              <span>{fmt(sale.change)}</span>
            </div>
          </>
        ) : (
          <div className="t-row t-card">Pagado con tarjeta</div>
        )}

        <div className="t-rule" />

        <footer className="t-foot">
          <div>¡Gracias por su compra!</div>
          <div className="t-ref">Ref: #{sale.id}</div>
        </footer>
      </div>
    </TicketClient>
  );
}
