"use client";

import { useEffect, useState } from "react";
import { flushQueue, loadQueue } from "@/lib/offlineQueue";

export default function PWA() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setOnline(navigator.onLine);
    setPending(loadQueue().length);

    if (
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    }

    const tryFlush = async () => {
      if (!navigator.onLine) return;
      const q = loadQueue();
      if (q.length === 0) {
        setPending(0);
        return;
      }
      const res = await flushQueue();
      setPending(res.remaining);
    };

    const onOnline = () => {
      setOnline(true);
      tryFlush();
    };
    const onOffline = () => setOnline(false);
    const onQueueUpdate = () => setPending(loadQueue().length);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("pos:queue-update", onQueueUpdate);

    const interval = setInterval(tryFlush, 15000);
    tryFlush();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("pos:queue-update", onQueueUpdate);
      clearInterval(interval);
    };
  }, []);

  if (online && pending === 0) return null;

  return (
    <div
      className={`fixed top-2 left-1/2 -translate-x-1/2 z-50 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border ${
        online
          ? "bg-amber/90 text-black border-amber"
          : "bg-red-500/90 text-white border-red-400"
      }`}
    >
      {online
        ? `Sincronizando ${pending} venta${pending === 1 ? "" : "s"}…`
        : `Sin conexión · ${pending} pendiente${pending === 1 ? "" : "s"}`}
    </div>
  );
}
