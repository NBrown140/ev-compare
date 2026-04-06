import { formatMarketName, formatNumber } from "@/utils/format";
import { getMarketSummaries } from "@/data";

interface MarketSelectorProps {
  markets: string[];
  onSelect: (market: string) => void;
}

const marketDescriptions: Record<string, string> = {
  be: "Belgium",
  ca: "Canada",
  de: "Germany",
  fr: "France",
  it: "Italy",
  nl: "Netherlands",
  se: "Sweden",
  uk: "United Kingdom",
  us: "United States",
};

const marketFlagSrc: Record<string, string> = {
  be: "/flags/be.svg",
  ca: "/flags/ca.svg",
  de: "/flags/de.svg",
  fr: "/flags/fr.svg",
  it: "/flags/it.svg",
  nl: "/flags/nl.svg",
  se: "/flags/se.svg",
  uk: "/flags/gb.svg",
  us: "/flags/us.svg",
};

const summaries = getMarketSummaries();

export default function MarketSelector({
  markets,
  onSelect,
}: MarketSelectorProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {markets.map((market) => {
        const stats = summaries[market];

        return (
          <button
            key={market}
            onClick={() => onSelect(market)}
            className="group bg-surface-container-low rounded-xl p-6 text-left hover:bg-surface-container-highest hover:scale-[1.01] transition-all cursor-pointer"
          >
            <div className="flex items-center gap-4 mb-3">
              {marketFlagSrc[market] && (
                <img
                  src={marketFlagSrc[market]}
                  alt={`${formatMarketName(market)} flag`}
                  className="w-12 h-12 shrink-0"
                />
              )}
              <div>
                <div className="text-2xl font-bold font-headline">
                  {formatMarketName(market)}
                </div>
                <div className="text-sm text-outline">
                  {marketDescriptions[market] ?? `${formatMarketName(market)} market`}
                </div>
              </div>
            </div>

            {stats && (
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-4">
                <div>
                  <div className="text-outline text-xs">Vehicles</div>
                  <div className="font-semibold">{formatNumber(stats.vehicleCount)}</div>
                </div>
                <div>
                  <div className="text-outline text-xs">Manufacturers</div>
                  <div className="font-semibold">{formatNumber(stats.manufacturerCount)}</div>
                </div>
              </div>
            )}

            <div className="flex items-center text-sm font-medium text-primary">
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
