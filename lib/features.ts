// Feature flags. Toggle via env vars (must be NEXT_PUBLIC_* to read on client).
// Flip to "1" / "true" to enable.

const on = (v: string | undefined) =>
  v === "1" || v?.toLowerCase() === "true";

export const FEATURES = {
  /**
   * v2.0: AirPrint ticket flow.
   * - Adds /ticket/[id] preview page sized for 58mm thermal paper.
   * - Adds "Imprimir ticket" button on cobrar success toast.
   * - Adds "Reimprimir" button in /historial.
   * Set NEXT_PUBLIC_FEATURE_TICKETS=1 to enable.
   */
  tickets: on(process.env.NEXT_PUBLIC_FEATURE_TICKETS),
};

export type FeatureName = keyof typeof FEATURES;
