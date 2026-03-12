export type Segment = "sedan" | "suv" | "hatchback" | "truck" | "van" | "crossover";
export type RangeRating = "wltp" | "epa";
export type BatteryChemistry = "lfp" | "nmc" | "nca" | "nmca" | "other";
export type Drivetrain = "fwd" | "rwd" | "awd";

export interface EV {
  id: string;
  manufacturer: string;
  model: string;
  model_year: number;
  variant: string | null;
  segment: Segment;
  seats: number;
  price_local: number;
  currency: string;
  range_km: number;
  range_rating: RangeRating;
  battery_capacity_kwh: number;
  battery_chemistry: BatteryChemistry | null;
  efficiency_wh_km: number | null;
  fast_charge_kw: number | null;
  charge_10_80_min: number | null;
  drivetrain: Drivetrain | null;
  power_kw: number | null;
  cargo_volume_l: number | null;
  curb_weight_kg: number | null;
  on_sale: boolean;
  source_url: string | null;
  // Computed
  price_per_range_km: number | null;
  price_per_kwh: number | null;
}

export interface MarketData {
  market: string;
  vehicles: EV[];
}
