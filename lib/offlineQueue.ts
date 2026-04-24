const KEY = "pos_offline_sales_v1";

export type PendingSale = {
  localId: string;
  createdAt: string;
  items: { id: string; qty: number }[];
  paid: number;
  total: number;
  change: number;
};

export function loadQueue(): PendingSale[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveQueue(q: PendingSale[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function enqueue(sale: PendingSale) {
  const q = loadQueue();
  q.push(sale);
  saveQueue(q);
}

export function removeOne(localId: string) {
  saveQueue(loadQueue().filter((s) => s.localId !== localId));
}

export async function flushQueue(): Promise<{
  sent: number;
  failed: number;
  remaining: number;
}> {
  const q = loadQueue();
  if (q.length === 0) return { sent: 0, failed: 0, remaining: 0 };

  let sent = 0;
  let failed = 0;
  const remaining: PendingSale[] = [];

  for (const s of q) {
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-local-id": s.localId,
          "x-created-at": s.createdAt,
        },
        body: JSON.stringify({ items: s.items, paid: s.paid }),
      });
      if (res.ok) sent++;
      else {
        failed++;
        remaining.push(s);
      }
    } catch {
      failed++;
      remaining.push(s);
    }
  }

  saveQueue(remaining);
  return { sent, failed, remaining: remaining.length };
}
