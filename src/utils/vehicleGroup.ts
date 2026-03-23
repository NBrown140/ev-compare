import type { EV } from "@/types/ev";

/** Returns all trims sharing the same manufacturer, model, and model_year, sorted by price. */
export function getModelTrims(vehicles: EV[], vehicle: EV): EV[] {
  return vehicles
    .filter(
      (v) =>
        v.manufacturer === vehicle.manufacturer &&
        v.model === vehicle.model &&
        v.model_year === vehicle.model_year
    )
    .sort((a, b) => a.price_local - b.price_local);
}

/** Returns one representative vehicle per model year for the same manufacturer+model, sorted by year descending. */
export function getModelYears(vehicles: EV[], vehicle: EV): EV[] {
  const yearMap = new Map<number, EV>();
  for (const v of vehicles) {
    if (v.manufacturer === vehicle.manufacturer && v.model === vehicle.model) {
      const existing = yearMap.get(v.model_year);
      if (!existing || v.price_local < existing.price_local) {
        yearMap.set(v.model_year, v);
      }
    }
  }
  return [...yearMap.values()].sort((a, b) => b.model_year - a.model_year);
}
