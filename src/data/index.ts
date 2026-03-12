import type { EV } from "@/types/ev";

const marketModules = import.meta.glob<EV[]>("./generated/*.json", {
  eager: true,
  import: "default",
});

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
