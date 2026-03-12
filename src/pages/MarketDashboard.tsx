import { useMarketData } from "@/hooks/useMarketData";
import { useFilters } from "@/hooks/useFilters";
import { averagePrice, averageRange, bestValueEV } from "@/utils/metrics";
import { formatCurrency, formatNumber, formatMarketName } from "@/utils/format";
import FilterBar from "@/components/FilterBar";
import EVTable from "@/components/EVTable";
import ComparisonChart from "@/components/ComparisonChart";
import MetricCard from "@/components/MetricCard";

interface MarketDashboardProps {
  market: string;
  onBack: () => void;
}

export default function MarketDashboard({
  market,
  onBack,
}: MarketDashboardProps) {
  const vehicles = useMarketData(market);
  const { filters, setFilters, filtered, manufacturers, resetFilters } =
    useFilters(vehicles);

  const currency = vehicles[0]?.currency ?? "USD";
  const avgPrice = averagePrice(filtered);
  const avgRange = averageRange(filtered);
  const bestValue = bestValueEV(filtered);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
        >
          &larr; All markets
        </button>
        <h2 className="text-2xl font-bold">
          {formatMarketName(market)} Market
        </h2>
        <span className="text-sm text-gray-400 dark:text-gray-500">
          {filtered.length} of {vehicles.length} vehicles
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Average Price"
          value={formatCurrency(avgPrice, currency)}
          sub={`${filtered.length} vehicles`}
        />
        <MetricCard
          label="Average Range"
          value={`${formatNumber(avgRange)} km`}
          sub={vehicles[0]?.range_rating?.toUpperCase()}
        />
        <MetricCard
          label="Best Value"
          value={
            bestValue
              ? `${bestValue.manufacturer} ${bestValue.model}`
              : "\u2014"
          }
          sub={
            bestValue?.price_per_range_km != null
              ? `${formatCurrency(bestValue.price_per_range_km, currency)}/km`
              : undefined
          }
        />
      </div>

      <FilterBar
        filters={filters}
        manufacturers={manufacturers}
        onChange={setFilters}
        onReset={resetFilters}
      />

      <EVTable vehicles={filtered} />

      <ComparisonChart vehicles={filtered} />
    </div>
  );
}
