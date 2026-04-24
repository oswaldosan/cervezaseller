"use client";
import { useState } from "react";
import { Product } from "@/lib/products";

function fmt(n: number) {
  return "L" + n.toLocaleString("es-HN", { minimumFractionDigits: 0 });
}

export default function ProductCard({
  product: p,
  qty,
  onAdd,
}: {
  product: Product;
  qty: number;
  onAdd: () => void;
}) {
  const [failed, setFailed] = useState(false);
  const hasImg = !!p.image && !failed;

  return (
    <button
      onClick={onAdd}
      className="product-card card-glow group relative overflow-hidden h-full w-full flex flex-col justify-end"
      style={{
        background: hasImg
          ? `linear-gradient(180deg, ${p.accent}15, rgba(0,0,0,0.1))`
          : `linear-gradient(160deg, ${p.accent}22, rgba(255,255,255,0.02))`,
        borderColor: `${p.accent}55`,
      }}
    >
      {hasImg ? (
        <>
          <div className="absolute inset-x-0 top-2 bottom-[30%] flex items-center justify-center pointer-events-none">
            <img
              src={p.image!}
              alt={p.name}
              onError={() => setFailed(true)}
              draggable={false}
              className="max-h-full max-w-[70%] object-contain select-none drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 h-2/3 pointer-events-none bg-gradient-to-t from-black/85 via-black/55 to-transparent" />
        </>
      ) : (
        <div className="absolute inset-x-0 top-2 bottom-[30%] flex items-center justify-center pointer-events-none">
          <span
            className="leading-none text-[clamp(2.5rem,10vh,6rem)]"
            style={{
              filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.55))",
              opacity: 0.85,
            }}
          >
            {p.emoji}
          </span>
        </div>
      )}

      {qty > 0 && (
        <span
          className="chip text-black font-bold absolute top-3 right-3 z-10 shadow-lg"
          style={{ background: p.accent }}
        >
          × {qty}
        </span>
      )}

      <div className="relative z-10 p-2 sm:p-3">
        <div className="font-display text-[clamp(0.85rem,1.6vh,1.1rem)] leading-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
          {p.name}
        </div>
        <div
          className="mt-0.5 font-bold text-[clamp(1rem,2vh,1.5rem)] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]"
          style={{ color: p.accent }}
        >
          {fmt(p.price)}
        </div>
      </div>
    </button>
  );
}
