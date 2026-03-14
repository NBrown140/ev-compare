import { useMemo, useState } from "react";
import type { EV, Segment, Drivetrain, BatteryChemistry, ChargePortType } from "@/types/ev";

export interface RangeFilter {
  min: number | null;
  max: number | null;
}

export interface Filters {
  // Basic
  segment: Segment | "all";
  manufacturer: string;
  modelYears: number[];
  priceRange: RangeFilter;
  rangeKm: RangeFilter;
  // Advanced – numeric ranges
  batteryCapacity: RangeFilter;
  efficiency: RangeFilter;
  fastChargeKw: RangeFilter;
  charge1080Min: RangeFilter;
  powerKw: RangeFilter;
  torqueNm: RangeFilter;
  acceleration: RangeFilter;
  topSpeed: RangeFilter;
  cargoVolume: RangeFilter;
  curbWeight: RangeFilter;
  towingCapacity: RangeFilter;
  seats: RangeFilter;
  lengthMm: RangeFilter;
  widthMm: RangeFilter;
  groundClearanceMm: RangeFilter;
  // Advanced – enums
  drivetrain: Drivetrain | "all";
  batteryChemistry: BatteryChemistry | "all";
  chargePortType: ChargePortType | "all";
  // Advanced – booleans
  v2lCapable: boolean | null;
  plugAndCharge: boolean | null;
}

export interface Bounds {
  price: { min: number; max: number };
  range: { min: number; max: number };
  batteryCapacity: { min: number; max: number };
  efficiency: { min: number; max: number };
  fastChargeKw: { min: number; max: number };
  charge1080Min: { min: number; max: number };
  powerKw: { min: number; max: number };
  torqueNm: { min: number; max: number };
  acceleration: { min: number; max: number };
  topSpeed: { min: number; max: number };
  cargoVolume: { min: number; max: number };
  curbWeight: { min: number; max: number };
  towingCapacity: { min: number; max: number };
  seats: { min: number; max: number };
  lengthMm: { min: number; max: number };
  widthMm: { min: number; max: number };
  groundClearanceMm: { min: number; max: number };
}

const emptyRange: RangeFilter = { min: null, max: null };

const currentYear = new Date().getFullYear();

const defaultFilters: Filters = {
  segment: "all",
  manufacturer: "",
  modelYears: [currentYear, currentYear - 1],
  priceRange: emptyRange,
  rangeKm: emptyRange,
  batteryCapacity: emptyRange,
  efficiency: emptyRange,
  fastChargeKw: emptyRange,
  charge1080Min: emptyRange,
  powerKw: emptyRange,
  torqueNm: emptyRange,
  acceleration: emptyRange,
  topSpeed: emptyRange,
  cargoVolume: emptyRange,
  curbWeight: emptyRange,
  towingCapacity: emptyRange,
  seats: emptyRange,
  lengthMm: emptyRange,
  widthMm: emptyRange,
  groundClearanceMm: emptyRange,
  drivetrain: "all",
  batteryChemistry: "all",
  chargePortType: "all",
  v2lCapable: null,
  plugAndCharge: null,
};

function minMax(values: (number | null | undefined)[]): { min: number; max: number } {
  const nums = values.filter((v): v is number => v != null);
  if (nums.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}

/** Return a capped bound using a percentile, rounded up to a nice step. */
function cappedMinMax(
  values: (number | null | undefined)[],
  percentile: number,
  roundStep: number,
): { min: number; max: number } {
  const nums = values.filter((v): v is number => v != null).sort((a, b) => a - b);
  if (nums.length === 0) return { min: 0, max: 0 };
  const idx = Math.min(Math.floor(nums.length * percentile), nums.length - 1);
  const cappedMax = Math.ceil(nums[idx] / roundStep) * roundStep;
  return { min: Math.min(...nums), max: cappedMax };
}

function inRange(value: number | null | undefined, filter: RangeFilter): boolean {
  if (value == null) return true; // don't exclude vehicles missing data
  if (filter.min != null && value < filter.min) return false;
  if (filter.max != null && value > filter.max) return false;
  return true;
}

export function useFilters(vehicles: EV[]) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const bounds = useMemo<Bounds>(() => ({
    price: cappedMinMax(vehicles.map((v) => v.price_local), 0.9, 10000),
    range: minMax(vehicles.map((v) => v.range_km)),
    batteryCapacity: minMax(vehicles.map((v) => v.battery_capacity_kwh)),
    efficiency: minMax(vehicles.map((v) => v.efficiency_wh_km)),
    fastChargeKw: minMax(vehicles.map((v) => v.fast_charge_kw)),
    charge1080Min: minMax(vehicles.map((v) => v.charge_10_80_min)),
    powerKw: minMax(vehicles.map((v) => v.power_kw)),
    torqueNm: minMax(vehicles.map((v) => v.torque_nm)),
    acceleration: minMax(vehicles.map((v) => v.acceleration_0_100_s)),
    topSpeed: minMax(vehicles.map((v) => v.top_speed_kmh)),
    cargoVolume: minMax(vehicles.map((v) => v.cargo_volume_l)),
    curbWeight: minMax(vehicles.map((v) => v.curb_weight_kg)),
    towingCapacity: minMax(vehicles.map((v) => v.towing_capacity_kg)),
    seats: minMax(vehicles.map((v) => v.seats)),
    lengthMm: minMax(vehicles.map((v) => v.length_mm)),
    widthMm: minMax(vehicles.map((v) => v.width_mm)),
    groundClearanceMm: minMax(vehicles.map((v) => v.ground_clearance_mm)),
  }), [vehicles]);

  const yearFiltered = useMemo(() => {
    if (filters.modelYears.length === 0) return vehicles;
    return vehicles.filter((v) => filters.modelYears.includes(v.model_year));
  }, [vehicles, filters.modelYears]);

  const manufacturers = useMemo(() => {
    const set = new Set(yearFiltered.map((v) => v.manufacturer));
    return Array.from(set).sort();
  }, [yearFiltered]);

  const modelYears = useMemo(() => {
    const set = new Set(vehicles.map((v) => v.model_year));
    return Array.from(set).sort((a, b) => b - a);
  }, [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (filters.segment !== "all" && v.segment !== filters.segment) return false;
      if (filters.manufacturer && v.manufacturer !== filters.manufacturer) return false;
      if (filters.modelYears.length > 0 && !filters.modelYears.includes(v.model_year)) return false;
      if (!inRange(v.price_local, filters.priceRange)) return false;
      if (!inRange(v.range_km, filters.rangeKm)) return false;
      if (!inRange(v.battery_capacity_kwh, filters.batteryCapacity)) return false;
      if (!inRange(v.efficiency_wh_km, filters.efficiency)) return false;
      if (!inRange(v.fast_charge_kw, filters.fastChargeKw)) return false;
      if (!inRange(v.charge_10_80_min, filters.charge1080Min)) return false;
      if (!inRange(v.power_kw, filters.powerKw)) return false;
      if (!inRange(v.torque_nm, filters.torqueNm)) return false;
      if (!inRange(v.acceleration_0_100_s, filters.acceleration)) return false;
      if (!inRange(v.top_speed_kmh, filters.topSpeed)) return false;
      if (!inRange(v.cargo_volume_l, filters.cargoVolume)) return false;
      if (!inRange(v.curb_weight_kg, filters.curbWeight)) return false;
      if (!inRange(v.towing_capacity_kg, filters.towingCapacity)) return false;
      if (!inRange(v.seats, filters.seats)) return false;
      if (!inRange(v.length_mm, filters.lengthMm)) return false;
      if (!inRange(v.width_mm, filters.widthMm)) return false;
      if (!inRange(v.ground_clearance_mm, filters.groundClearanceMm)) return false;
      if (filters.drivetrain !== "all" && v.drivetrain != null && v.drivetrain !== filters.drivetrain) return false;
      if (filters.batteryChemistry !== "all" && v.battery_chemistry != null && v.battery_chemistry !== filters.batteryChemistry) return false;
      if (filters.chargePortType !== "all" && v.charge_port_type != null && v.charge_port_type !== filters.chargePortType) return false;
      if (filters.v2lCapable != null && v.v2l_capable != null && v.v2l_capable !== filters.v2lCapable) return false;
      if (filters.plugAndCharge != null && v.plug_and_charge != null && v.plug_and_charge !== filters.plugAndCharge) return false;
      return true;
    });
  }, [vehicles, filters]);

  const resetFilters = () => setFilters(defaultFilters);

  return {
    filters,
    setFilters,
    filtered,
    manufacturers,
    modelYears,
    bounds,
    resetFilters,
  };
}
