import "./globals.css";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import PWA from "@/components/PWA";

export const metadata: Metadata = {
  title: "CervezaSystem — Caja",
  description: "Punto de venta para eventos",
  applicationName: "CervezaCaja",
  appleWebApp: {
    capable: true,
    title: "CervezaCaja",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="lg:h-[100dvh] min-h-screen flex flex-col lg:overflow-hidden select-none touch-manipulation">
        <header className="shrink-0 px-6 py-3 flex items-center justify-between border-b border-white/5 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-3xl">🍺</span>
            <div className="leading-tight">
              <div className="font-display text-xl tracking-wide">CervezaSystem</div>
              <div className="text-xs text-white/50 -mt-0.5">Caja registradora</div>
            </div>
          </Link>
          <nav className="flex gap-2 text-sm">
            <Link href="/" className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">Vender</Link>
            <Link href="/historial" className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">Historial</Link>
            <Link href="/reporte" className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">Reporte</Link>
            <Link href="/cierre" className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10">Cierre</Link>
          </nav>
        </header>
        {children}
        <PWA />
      </body>
    </html>
  );
}
