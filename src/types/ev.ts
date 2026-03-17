export type Segment = "sedan" | "suv" | "hatchback" | "truck" | "van" | "crossover";
export type RangeRating = "wltp" | "epa";
export type BatteryChemistry = "lfp" | "nmc" | "nca" | "nmca" | "other";
export type Drivetrain = "fwd" | "rwd" | "awd";
export type ChargePortType = "ccs" | "nacs" | "chademo" | "gbt" | "other";

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
  torque_nm: number | null;
  acceleration_0_100_s: number | null;
  top_speed_kmh: number | null;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  wheelbase_mm: number | null;
  ground_clearance_mm: number | null;
  cargo_volume_l: number | null;
  frunk_volume_l: number | null;
  towing_capacity_kg: number | null;
  curb_weight_kg: number | null;
  onboard_charger_kw: number | null;
  charge_port_type: ChargePortType | null;
  v2l_capable: boolean | null;
  plug_and_charge: boolean | null;
  range_city_km: number | null;
  range_highway_km: number | null;
  // Computed
  price_per_range_km: number | null;
  price_per_kwh: number | null;
}

export interface MarketData {
  market: string;
  vehicles: EV[];
}

export interface Source {
  url: string;
  date_viewed: string;
  fields: string[];
}

export type SourcesMap = Record<string, Source[]>;
