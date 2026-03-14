import { formatMarketName, formatNumber } from "@/utils/format";
import { getMarketData } from "@/data";
import type { EV, Segment } from "@/types/ev";

interface MarketSelectorProps {
  markets: string[];
  onSelect: (market: string) => void;
}

const marketDescriptions: Record<string, string> = {
  eu: "European Union",
  us: "United States",
  uk: "United Kingdom",
  ca: "Canada",
};

const marketFlags: Record<string, string> = {
  eu: "\u{1F1EA}\u{1F1FA}",
  us: "\u{1F1FA}\u{1F1F8}",
  uk: "\u{1F1EC}\u{1F1E7}",
  ca: "\u{1F1E8}\u{1F1E6}",
};

interface MarketStats {
  vehicleCount: number;
  manufacturerCount: number;
  segments: Segment[];
}

function computeMarketStats(vehicles: EV[]): MarketStats | null {
  if (vehicles.length === 0) return null;

  const manufacturers = new Set(vehicles.map((v) => v.manufacturer));
  const segments = [...new Set(vehicles.map((v) => v.segment))].sort();

  return {
    vehicleCount: vehicles.length,
    manufacturerCount: manufacturers.size,
    segments: segments as Segment[],
  };
}

const segmentLabels: Record<Segment, string> = {
  sedan: "Sedan",
  suv: "SUV",
  hatchback: "Hatch",
  truck: "Truck",
  van: "Van",
  crossover: "CUV",
};

export default function MarketSelector({
  markets,
  onSelect,
}: MarketSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {markets.map((market) => {
        const vehicles = getMarketData(market);
        const stats = computeMarketStats(vehicles);

        return (
          <button
            key={market}
            onClick={() => onSelect(market)}
            className="group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 text-left hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-2xl font-bold">
                {marketFlags[market] && (
                  <span className="mr-2">{marketFlags[market]}</span>
                )}
                {formatMarketName(market)}
              </div>
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {marketDescriptions[market] ?? `${formatMarketName(market)} market`}
            </div>

            {stats && (
              <>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                  <div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs">Vehicles</div>
                    <div className="font-semibold">{formatNumber(stats.vehicleCount)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 dark:text-gray-500 text-xs">Manufacturers</div>
                    <div className="font-semibold">{formatNumber(stats.manufacturerCount)}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {stats.segments.map((seg) => (
                    <span
                      key={seg}
                      className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                    >
                      {segmentLabels[seg] ?? seg}
                    </span>
                  ))}
                </div>
              </>
            )}

            <div className="flex items-center text-sm font-medium text-blue-600 dark:text-blue-400">
              Explore
              <svg
                className="w-4 h-4 ml-1 transition-transform group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}
