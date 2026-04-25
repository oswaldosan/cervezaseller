# CervezaSystem — Caja para evento

Punto de venta táctil para eventos. Sin facturación, sin PDFs, sin complicaciones.
Funciona offline en una laptop con una base SQLite local.

Stack: **Next.js 14 (App Router) + React 18 + TypeScript + Tailwind + better-sqlite3**.

---

## Requisitos

- Node.js 18.17+ (recomendado 20 LTS)
- npm 9+
- macOS / Linux / Windows

> `better-sqlite3` compila un binario nativo. En macOS necesitas Xcode CLT
> (`xcode-select --install`). En Linux suele bastar con `build-essential` y `python3`.

## Setup

```bash
# 1. Clonar / copiar el proyecto
cd cervezasystem

# 2. Instalar dependencias
npm install

# 3. Configurar password de administrador
cp .env.example .env.local
# Editar .env.local y poner un ADMIN_PASSWORD fuerte

# 4. Correr en desarrollo
npm run dev
# abrir http://localhost:3000
```

### Producción (para el evento)

```bash
npm run build
npm start          # escucha en puerto 3000
```

Para correr desde otra máquina en la misma red Wi-Fi:

```bash
# averiguar la IP local (macOS)
ipconfig getifaddr en0
# desde el tablet / celular entrar a:
#   http://<IP>:3000
```

---

## Uso

- **Vender** (`/`): tocar productos → ingresar recibido (billetes rápidos o
  teclado) → **Cobrar y guardar**.
- **Historial** (`/historial`): ventas guardadas, total del día, eliminar errores
  (requiere password).
- **Cierre** (`/cierre`): cerrar la caja — resume ventas desde el último cierre,
  calcula lo esperado vs. contado, registra diferencia y notas.

### Password de administrador

Se usa para:
- Eliminar una venta individual
- Borrar todo el historial
- Guardar un cierre de caja

Se define en `.env.local` como `ADMIN_PASSWORD`. Si no se define, el valor por
defecto es `1234` (cambiar antes del evento).

---

## Instalar en iPad (PWA)

La app es instalable como app nativa en iPad / iPhone / Android.

**Importante:** el service worker se activa solo en **producción** (`npm run build && npm start`). En dev no hay offline.

### Requisitos
- iPad o iPhone con **iOS 16.4+** (para soporte completo de Service Workers).
- El servidor de la app debe correr en la misma red Wi-Fi que la tablet.
- Usar **HTTPS** o acceder vía `http://localhost` / `http://<ip-lan>:3000` (Safari permite SW en orígenes de LAN).

### Pasos
1. En la laptop: `npm run build && npm start`
2. Averiguar la IP: `ipconfig getifaddr en0` (macOS) o `hostname -I` (Linux).
3. En el iPad abrir Safari → `http://<ip>:3000`
4. Botón **Compartir** → **Agregar a pantalla de inicio**.
5. Abrir desde el home screen — corre fullscreen, sin barras de Safari.

### Qué cachea offline
- La interfaz completa (HTML, JS, CSS, imágenes de productos, íconos).
- Todas las pantallas (`/`, `/historial`, `/reporte`, `/cierre`).

### Ventas offline
Si la conexión se cae durante el evento:
- La venta se guarda en `localStorage` del iPad.
- Aparece un badge **"Sin conexión · N pendientes"**.
- Cuando vuelve la conexión (cada 15s o evento `online`), se envían al servidor automáticamente.
- Cada venta local lleva su `created_at` del iPad, así que el orden temporal se preserva.

> Limitación: los reportes / historial solo reflejan ventas ya sincronizadas al servidor — las pendientes no aparecen ahí hasta que suban.

## Datos

Todo vive en `./data/pos.db` (SQLite WAL). **Respalda ese archivo y tienes todo.**

Tablas:
- `sales` — una fila por venta, items en JSON.
- `cash_closings` — cada cierre de caja con período, esperado, contado y diferencia.

Para empezar de cero: cerrar el servidor y borrar `data/pos.db*`.

---

## Productos y precios

Editar `lib/products.ts`. Opcional: imagen PNG en `public/products/<id>.png`
referenciada por el campo `image`.

---

## Estructura

```
app/
  page.tsx              # POS principal
  historial/page.tsx    # Historial + borrar (password)
  cierre/page.tsx       # Cierre de caja
  api/
    sales/route.ts      # POST/GET/DELETE ventas
    closings/route.ts   # GET/POST cierres
lib/
  db.ts                 # SQLite + schema
  products.ts           # Catálogo
  auth.ts               # Check password admin
components/             # ProductCard / ProductThumb
data/pos.db             # Base de datos (no commitear)
```

---

## Feature flags

Las features experimentales se activan por env var. Lectura en
[lib/features.ts](lib/features.ts).

| Flag | Default | Descripción |
|---|---|---|
| `NEXT_PUBLIC_FEATURE_TICKETS` | `0` | v2.0 — Preview de ticket térmico 58mm + AirPrint. Pendiente de implementación. |

Para activar en Railway: dashboard → Variables → agregar la var con valor `1` → redeploy.

> Las flags `NEXT_PUBLIC_*` se inlinean en el bundle al build, no en runtime. Cambiar requiere redeploy.

### Roadmap v2.0 — Tickets AirPrint

Aprobado (no implementado todavía):
- Ruta `/ticket/[id]` que renderiza el ticket dimensionado a 58mm con CSS `@page`.
- Mezcla **A + D**: HTML preview para confirmar antes de mandar a la impresora AirPrint del iPad (Star TSP143IIIU, Epson TM-m30, etc.).
- Botón "Imprimir ticket" en el toast post-cobro.
- Botón "Reimprimir" en cada fila del Historial.
- Soporta efectivo y tarjeta. Para tarjeta muestra "Pagado con tarjeta" en vez de cambio.
- Toggle por dispositivo en `localStorage` para auto-imprimir o no.

Hardware mínimo recomendado: impresora térmica con AirPrint nativo. Las Bluetooth-only requieren app del fabricante y rompen el flujo PWA.

## Ideas de mejora

Cosas que vale la pena agregar según crezca el uso:

**Operativas**
- **Inventario / stock por producto**: descontar unidades por venta y bloquear cuando llega a 0.
- **Método de pago** (efectivo / tarjeta / transferencia) por venta para separar en cierre.
- **Descuentos / cortesías** con motivo registrado.
- **Múltiples cajeros** con nombre/PIN por usuario para trazabilidad.
- **Anular venta** marcándola (soft delete) en vez de borrarla — preserva auditoría.
- **Imprimir ticket** (escpos vía USB / red) opcional.

**UX**
- **Búsqueda y categorías** filtrables cuando haya más de ~15 productos.
- **Atajos de teclado** para caja rápida (+1 salvavida, pago exacto, cobrar).
- **Modo oscuro/claro** según luz del lugar.
- **PWA / instalable** para usar como app en tablet.

**Reportes**
- **Top productos** por período (ya calculado en cierre — falta gráfico).
- **Export CSV** de ventas y cierres.
- **Ventas por hora** para dimensionar próximos eventos.

**Técnicas**
- **Auth real** con cookie firmada en vez de password en header (suficiente para
  LAN privada, pero débil si se expone).
- **Rate limit** al endpoint de delete.
- **Respaldo automático** del `.db` al cerrar caja (copia con timestamp).
- **Validación de stock y concurrencia** con transacciones SQLite.
- **Tests** al menos del cálculo de cierre y totales.
- **Lockfile commiteado** (ya existe `package-lock.json` — bien).

---

## Problemas conocidos

- El password viaja en un header HTTP sin TLS: seguro solo en LAN aislada.
  Para exponer a internet, ponerlo detrás de un reverse proxy con HTTPS.
- Al borrar historial, los cierres quedan "huérfanos" de sus ventas (solo guardan
  el agregado). Normalmente está bien — pero tenlo presente.
