import type { EV } from "@/types/ev";
import type { SourcesMap } from "@/types/ev";

const marketModules = import.meta.glob<EV[]>(
  ["./generated/*.json", "!./generated/*.sources.json"],
  { eager: true, import: "default" }
);

const sourcesModules = import.meta.glob<SourcesMap>(
  "./generated/*.sources.json",
  { import: "default" }
);

export function getMarkets(): string[] {
  return Object.keys(marketModules)
    .map((p) => p.replace("./generated/", "").replace(".json", ""))
    .filter((m) => m !== "markets")
    .sort();
}

export function getMarketData(market: string): EV[] {
  const key = `./generated/${market}.json`;
  return marketModules[key] ?? [];
}

export async function getMarketSources(
  market: string
): Promise<SourcesMap | null> {
  const key = `./generated/${market}.sources.json`;
  const loader = sourcesModules[key];
  if (!loader) return null;
  return loader();
}
