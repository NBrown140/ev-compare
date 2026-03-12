import { useMemo } from "react";
import { getMarketData, getMarkets } from "@/data";
import type { EV } from "@/types/ev";

export function useMarkets(): string[] {
  return useMemo(() => getMarkets(), []);
}

export function useMarketData(market: string | null): EV[] {
  return useMemo(() => {
    if (!market) return [];
    return getMarketData(market);
  }, [market]);
}
