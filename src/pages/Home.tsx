import { useMemo } from "react";
import MarketSelector from "@/components/MarketSelector";
import { useMarkets, useMarketSummaries } from "@/hooks/useMarketData";
import { formatNumber } from "@/utils/format";

interface HomeProps {
  onSelectMarket: (market: string) => void;
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {value}
      </div>
      <div className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        {label}
      </div>
    </div>
  );
}

export default function Home({ onSelectMarket }: HomeProps) {
  const markets = useMarkets();
  const summaries = useMarketSummaries();

  const totals = useMemo(() => {
    let vehicles = 0;
    let manufacturers = 0;
    for (const market of markets) {
      const s = summaries[market];
      if (s) {
        vehicles += s.vehicleCount;
        manufacturers += s.manufacturerCount;
      }
    }
    return { vehicles, manufacturers, markets: markets.length };
  }, [markets, summaries]);

  return (
    <div>
      {/* Hero */}
      <div className="animate-fade-in-up text-center py-12 sm:py-16 lg:py-20">
        <h1
          className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-4"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Find the right electric vehicle
        </h1>
        <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
          Compare {formatNumber(totals.vehicles)} vehicles from{" "}
          {formatNumber(totals.manufacturers)} manufacturers across real-world
          markets.
        </p>
      </div>

      {/* Market cards */}
      <div className="mb-16">
        <div className="text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-4">
          Choose a market
        </div>
        <MarketSelector markets={markets} onSelect={onSelectMarket} />
      </div>

      {/* Stats bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
        <div className="flex justify-center gap-12 sm:gap-16">
          <StatItem
            label="Vehicles tracked"
            value={formatNumber(totals.vehicles)}
          />
          <StatItem
            label="Manufacturers"
            value={formatNumber(totals.manufacturers)}
          />
          <StatItem label="Markets" value={formatNumber(totals.markets)} />
        </div>
      </div>

      {/* Open data & contribute */}
      <div className="mt-10 text-center text-xs text-gray-400 dark:text-gray-500 leading-relaxed space-y-1">
        <p>
          The full dataset is freely available as{" "}
          <a
            href="https://github.com/NBrown140/ev-compare/tree/main/data/markets"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-gray-300 dark:decoration-gray-600 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            CSV files on GitHub
          </a>
          .
        </p>
        <p>
          Spot an error or a missing vehicle?{" "}
          <a
            href="https://github.com/NBrown140/ev-compare/blob/main/CONTRIBUTING.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-gray-300 dark:decoration-gray-600 underline-offset-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            See how to contribute
          </a>
          .
        </p>
      </div>
    </div>
  );
}
