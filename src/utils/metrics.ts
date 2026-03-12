import type { EV } from "@/types/ev";

export function averagePrice(vehicles: EV[]): number {
  if (vehicles.length === 0) return 0;
  return Math.round(
    vehicles.reduce((sum, v) => sum + v.price_local, 0) / vehicles.length
  );
}

export function averageRange(vehicles: EV[]): number {
  if (vehicles.length === 0) return 0;
  return Math.round(
    vehicles.reduce((sum, v) => sum + v.range_km, 0) / vehicles.length
  );
}

export function bestValueEV(vehicles: EV[]): EV | null {
  if (vehicles.length === 0) return null;
  return vehicles.reduce((best, v) =>
    (v.price_per_range_km ?? Infinity) < (best.price_per_range_km ?? Infinity)
      ? v
      : best
  );
}

export function segmentCounts(vehicles: EV[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const v of vehicles) {
    counts[v.segment] = (counts[v.segment] ?? 0) + 1;
  }
  return counts;
}
