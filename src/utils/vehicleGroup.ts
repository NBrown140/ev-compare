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
