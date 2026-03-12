import { formatMarketName } from "@/utils/format";

interface MarketSelectorProps {
  markets: string[];
  onSelect: (market: string) => void;
}

const marketDescriptions: Record<string, string> = {
  eu: "European Union \u2014 prices in EUR, WLTP range",
  us: "United States \u2014 prices in USD, EPA range",
};

export default function MarketSelector({
  markets,
  onSelect,
}: MarketSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {markets.map((market) => (
        <button
          key={market}
          onClick={() => onSelect(market)}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-left hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
        >
          <div className="text-2xl font-bold mb-1">
            {formatMarketName(market)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {marketDescriptions[market] ?? `${formatMarketName(market)} market`}
          </div>
        </button>
      ))}
    </div>
  );
}
