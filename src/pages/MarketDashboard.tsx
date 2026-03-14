import { useState } from "react";
import { useMarketData, useMarketSources } from "@/hooks/useMarketData";
import { useFilters } from "@/hooks/useFilters";
import { formatMarketName, getMarketFlag } from "@/utils/format";
import FilterBar from "@/components/FilterBar";
import EVTable from "@/components/EVTable";
import ComparisonChart from "@/components/ComparisonChart";
import VehicleDetail from "@/pages/VehicleDetail";

interface MarketDashboardProps {
  market: string;
  onBack: () => void;
}

export default function MarketDashboard({
  market,
  onBack,
}: MarketDashboardProps) {
  const vehicles = useMarketData(market);
  const sources = useMarketSources(market);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<"table" | "charts">("table");
  const {
    filters,
    setFilters,
    filtered,
    manufacturers,
    modelYears,
    bounds,
    resetFilters,
  } = useFilters(vehicles);

  const selectedVehicle = selectedVehicleId
    ? vehicles.find((v) => v.id === selectedVehicleId) ?? null
    : null;
  const marketFlag = getMarketFlag(market);

  if (selectedVehicle) {
    return (
      <VehicleDetail
        vehicle={selectedVehicle}
        allVehicles={vehicles}
        sources={sources}
        onBack={() => setSelectedVehicleId(null)}
        onSelectVehicle={setSelectedVehicleId}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer hover:underline transition-colors"
        >
          &larr; All markets
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {marketFlag && (
            <span className="text-2xl leading-none" aria-hidden="true">
              {marketFlag}
            </span>
          )}
          {formatMarketName(market)} Market
        </h2>
        <span className="text-sm text-gray-400 dark:text-gray-500">
          {filtered.length} of {vehicles.length} vehicles
        </span>
      </div>

      <FilterBar
        filters={filters}
        manufacturers={manufacturers}
        modelYears={modelYears}
        bounds={bounds}
        onChange={setFilters}
        onReset={resetFilters}
      />

      <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {(["table", "charts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-md px-6 py-2.5 text-base font-semibold capitalize transition-all ${
              activeTab === tab
                ? "bg-white text-blue-600 shadow dark:bg-gray-700 dark:text-blue-400"
                : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "table" ? (
        <EVTable vehicles={filtered} onSelectVehicle={setSelectedVehicleId} />
      ) : (
        <ComparisonChart vehicles={filtered} onSelectVehicle={setSelectedVehicleId} />
      )}
    </div>
  );
}
