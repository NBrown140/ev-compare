import { useMemo } from "react";
import MarketSelector from "@/components/MarketSelector";
import { useMarkets } from "@/hooks/useMarketData";
import { getMarketData } from "@/data";
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

  const totals = useMemo(() => {
    let vehicles = 0;
    const manufacturers = new Set<string>();
    for (const market of markets) {
      const data = getMarketData(market);
      vehicles += data.length;
      for (const v of data) manufacturers.add(v.manufacturer);
    }
    return {
      vehicles,
      manufacturers: manufacturers.size,
      markets: markets.length,
    };
  }, [markets]);

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
    </div>
  );
}
