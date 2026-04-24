"use client";
import { useState } from "react";
import { Product } from "@/lib/products";

export default function ProductThumb({
  product,
  size = 56,
}: {
  product: Product;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = product.image && !failed;
  return (
    <div
      className="rounded-2xl flex items-center justify-center overflow-hidden"
      style={{
        height: size,
        width: size,
        background: `${product.accent}26`,
        border: `1px solid ${product.accent}55`,
      }}
    >
      {showImg ? (
        <img
          src={product.image!}
          alt={product.name}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain p-1"
          draggable={false}
        />
      ) : (
        <span style={{ fontSize: size * 0.55 }}>{product.emoji}</span>
      )}
    </div>
  );
}
