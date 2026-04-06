import { useEffect, useMemo, useState } from "react";
import { getMarketData, getMarketIncentives, getMarkets, getMarketSources, getMarketSummaries } from "@/data";
import type { EV } from "@/types/ev";
import type { MarketIncentives, MarketSummaries, SourcesMap } from "@/types/ev";

const sourcesCache = new Map<string, SourcesMap | null>();
const incentivesCache = new Map<string, MarketIncentives | null>();

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

export function useMarketSources(
  market: string | null,
  enabled = true
): SourcesMap | null {
  const [sources, setSources] = useState<SourcesMap | null>(null);

  useEffect(() => {
    if (!market) {
      setSources(null);
      return;
    }

    if (!enabled) return;

    if (sourcesCache.has(market)) {
      setSources(sourcesCache.get(market) ?? null);
      return;
    }

    let cancelled = false;
    setSources(null);
    getMarketSources(market).then((result) => {
      if (cancelled) return;
      sourcesCache.set(market, result);
      setSources(result);
    });

    return () => {
      cancelled = true;
    };
  }, [market, enabled]);

  return sources;
}

export function useMarketIncentives(
  market: string | null
): MarketIncentives | null {
  const [incentives, setIncentives] = useState<MarketIncentives | null>(null);

  useEffect(() => {
    if (!market) {
      setIncentives(null);
      return;
    }

    if (incentivesCache.has(market)) {
      setIncentives(incentivesCache.get(market) ?? null);
      return;
    }

    let cancelled = false;
    setIncentives(null);
    getMarketIncentives(market).then((result) => {
      if (cancelled) return;
      incentivesCache.set(market, result);
      setIncentives(result);
    });

    return () => {
      cancelled = true;
    };
  }, [market]);

  return incentives;
}
