import { useEffect, useMemo, useState } from "react";
import { getMarketData, getMarkets, getMarketSources, getMarketSummaries } from "@/data";
import type { EV } from "@/types/ev";
import type { MarketSummaries, SourcesMap } from "@/types/ev";

export function useMarkets(): string[] {
  return useMemo(() => getMarkets(), []);
}

export function useMarketSummaries(): MarketSummaries {
  return useMemo(() => getMarketSummaries(), []);
}

export function useMarketData(market: string | null): { data: EV[]; loading: boolean } {
  const [data, setData] = useState<EV[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!market) {
      setData([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getMarketData(market).then((result) => {
      if (!cancelled) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [market]);

  return { data, loading };
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
