import { useEffect, useMemo, useState } from "react";
import { getMarketData, getMarkets, getMarketSources } from "@/data";
import type { EV } from "@/types/ev";
import type { SourcesMap } from "@/types/ev";

export function useMarkets(): string[] {
  return useMemo(() => getMarkets(), []);
}

export function useMarketData(market: string | null): EV[] {
  return useMemo(() => {
    if (!market) return [];
    return getMarketData(market);
  }, [market]);
}

export function useMarketSources(market: string | null): SourcesMap | null {
  const [sources, setSources] = useState<SourcesMap | null>(null);
  useEffect(() => {
    if (!market) {
      setSources(null);
      return;
    }
    getMarketSources(market).then(setSources);
  }, [market]);
  return sources;
}
