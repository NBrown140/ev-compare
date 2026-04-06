import type { EV } from "@/types/ev";
import type { MarketIncentives, MarketSummaries, SourcesMap } from "@/types/ev";
import summaries from "./generated/markets.json";

const marketModules = import.meta.glob<EV[]>(
  ["./generated/*.json", "!./generated/*.sources.json", "!./generated/*.incentives.json", "!./generated/markets.json"],
  { import: "default" }
);

const sourcesModules = import.meta.glob<SourcesMap>(
  "./generated/*.sources.json",
  { import: "default" }
);

const incentiveModules = import.meta.glob<MarketIncentives>(
  "./generated/*.incentives.json",
  { import: "default" }
);

export function getMarketSummaries(): MarketSummaries {
  return summaries as MarketSummaries;
}

export function getMarkets(): string[] {
  return Object.keys(summaries).sort();
}

export async function getMarketData(market: string): Promise<EV[]> {
  const key = `./generated/${market}.json`;
  const loader = marketModules[key];
  if (!loader) return [];
  return loader();
}

export async function getMarketSources(
  market: string
): Promise<SourcesMap | null> {
  const key = `./generated/${market}.sources.json`;
  const loader = sourcesModules[key];
  if (!loader) return null;
  return loader();
}

export async function getMarketIncentives(
  market: string
): Promise<MarketIncentives | null> {
  const key = `./generated/${market}.incentives.json`;
  const loader = incentiveModules[key];
  if (!loader) return null;
  return loader();
}
