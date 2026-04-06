import type { MarketIncentives } from "@/types/ev";

export interface IncentiveBreakdownItem {
  program: string;
  amount: number;
  disclaimer?: string;
}

export function getVehicleIncentiveTotal(
  incentives: MarketIncentives | null,
  vehicleId: string,
  selectedRegions: string[]
): number {
  if (!incentives) return 0;
  const vehicleData = incentives.vehicles[vehicleId];
  if (!vehicleData) return 0;

  let total = 0;
  for (const region of selectedRegions) {
    const regionData = vehicleData[region];
    if (!regionData) continue;
    for (const amount of Object.values(regionData)) {
      total += amount;
    }
  }
  return total;
}

export function getVehicleIncentiveBreakdown(
  incentives: MarketIncentives | null,
  vehicleId: string,
  selectedRegions: string[]
): IncentiveBreakdownItem[] {
  if (!incentives) return [];
  const vehicleData = incentives.vehicles[vehicleId];
  if (!vehicleData) return [];

  const items: IncentiveBreakdownItem[] = [];
  for (const region of selectedRegions) {
    const regionData = vehicleData[region];
    if (!regionData) continue;
    const regionMeta = incentives.regions[region];
    if (!regionMeta) continue;

    for (const [programId, amount] of Object.entries(regionData)) {
      if (amount <= 0) continue;
      const program = regionMeta.programs.find((p) => p.id === programId);
      items.push({
        program: program?.name ?? programId,
        amount,
        disclaimer: program?.disclaimer,
      });
    }
  }
  return items;
}
