import { useMemo, useState } from "react";
import type { EV, Segment } from "@/types/ev";

export interface Filters {
  segment: Segment | "all";
  manufacturer: string;
  maxPrice: number | null;
  minRange: number | null;
}

const defaultFilters: Filters = {
  segment: "all",
  manufacturer: "",
  maxPrice: null,
  minRange: null,
};

export function useFilters(vehicles: EV[]) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);

  const manufacturers = useMemo(() => {
    const set = new Set(vehicles.map((v) => v.manufacturer));
    return Array.from(set).sort();
  }, [vehicles]);

  const filtered = useMemo(() => {
    return vehicles.filter((v) => {
      if (filters.segment !== "all" && v.segment !== filters.segment)
        return false;
      if (filters.manufacturer && v.manufacturer !== filters.manufacturer)
        return false;
      if (filters.maxPrice != null && v.price_local > filters.maxPrice)
        return false;
      if (filters.minRange != null && v.range_km < filters.minRange)
        return false;
      return true;
    });
  }, [vehicles, filters]);

  const resetFilters = () => setFilters(defaultFilters);

  return { filters, setFilters, filtered, manufacturers, resetFilters };
}
