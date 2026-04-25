"use client";

import { useEffect } from "react";

export default function TicketClient({
  autoprint,
  children,
}: {
  autoprint: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!autoprint) return;
    // Small delay to ensure styles applied before print dialog.
    const t = setTimeout(() => window.print(), 250);
    return () => clearTimeout(t);
  }, [autoprint]);

  return (
    <div className="ticket-page">
      {children}
      <div className="ticket-actions no-print">
        <button onClick={() => window.print()} className="t-btn">
          🖨️ Imprimir
        </button>
        <button onClick={() => window.close()} className="t-btn t-btn-ghost">
          Cerrar
        </button>
      </div>
    </div>
  );
}
