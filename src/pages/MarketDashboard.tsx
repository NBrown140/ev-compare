import { useEffect, useRef } from "react";
import { useMarketData, useMarketIncentives, useMarketSources } from "@/hooks/useMarketData";
import { useFilters } from "@/hooks/useFilters";
import { formatMarketName, getMarketFlag } from "@/utils/format";
import FilterBar from "@/components/FilterBar";
import EVTable from "@/components/EVTable";
import ComparisonChart from "@/components/ComparisonChart";
import CompareBar from "@/components/CompareBar";
import RegionSelector from "@/components/RegionSelector";
import VehicleDetail from "@/pages/VehicleDetail";
import VehicleCompare from "@/pages/VehicleCompare";
import { getModelTrims, getModelYears } from "@/utils/vehicleGroup";

interface MarketDashboardProps {
  market: string;
  selectedVehicleId: string | null;
  activeTab: "table" | "charts";
  compareIds: string[];
  comparePage: boolean;
  selectedRegions: string[];
  onBack: () => void;
  onSelectVehicle: (id: string | null) => void;
  onTabChange: (tab: "table" | "charts") => void;
  onToggleCompare: (id: string) => void;
  onClearCompare: () => void;
  onCompare: () => void;
  onBackFromCompare: () => void;
  onRegionsChange: (regions: string[]) => void;
}

export default function MarketDashboard({
  market,
  selectedVehicleId,
  activeTab,
  compareIds,
  comparePage,
  selectedRegions,
  onBack,
  onSelectVehicle,
  onTabChange,
  onToggleCompare,
  onClearCompare,
  onCompare,
  onBackFromCompare,
  onRegionsChange,
}: MarketDashboardProps) {
  const { data: vehicles, loading } = useMarketData(market);
  const sources = useMarketSources(market, selectedVehicleId != null);
  const incentives = useMarketIncentives(market);

  // Auto-select federal-level regions on first load
  const defaultApplied = useRef<string | null>(null);
  useEffect(() => {
    if (!incentives || defaultApplied.current === market) return;
    if (selectedRegions.length > 0) {
      defaultApplied.current = market;
      return;
    }
    const federalRegions = Object.entries(incentives.regions)
      .filter(([, r]) => r.level === "Federal")
      .map(([id]) => id);
    if (federalRegions.length > 0) {
      onRegionsChange(federalRegions);
    }
    defaultApplied.current = market;
  }, [incentives, market, selectedRegions.length, onRegionsChange]);

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
  const modelTrims = selectedVehicle
    ? getModelTrims(vehicles, selectedVehicle)
    : [];
  const otherYears = selectedVehicle
    ? getModelYears(vehicles, selectedVehicle)
    : [];
  const marketFlag = getMarketFlag(market);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-outline-variant border-t-primary" />
      </div>
    );
  }

  if (comparePage) {
    return (
      <VehicleCompare
        vehicles={vehicles}
        compareIds={compareIds}
        incentives={incentives}
        selectedRegions={selectedRegions}
        onRegionsChange={onRegionsChange}
        onBack={onBackFromCompare}
        onToggleCompare={onToggleCompare}
      />
    );
  }

  if (selectedVehicle) {
    return (
      <>
        <VehicleDetail
          vehicle={selectedVehicle}
          market={market}
          trims={modelTrims}
          modelYears={otherYears}
          allVehicles={vehicles}
          sources={sources}
          incentives={incentives}
          selectedRegions={selectedRegions}
          onRegionsChange={onRegionsChange}
          onBack={() => onSelectVehicle(null)}
          onSelectVehicle={onSelectVehicle}
          compareIds={compareIds}
          onToggleCompare={onToggleCompare}
        />
        <CompareBar
          vehicles={vehicles}
          compareIds={compareIds}
          onToggleCompare={onToggleCompare}
          onClearCompare={onClearCompare}
          onCompare={onCompare}
        />
      </>
    );
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low pl-2.5 pr-3.5 py-1.5 text-sm font-medium text-outline hover:bg-surface-container transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          All markets
        </button>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          {marketFlag && (
            <span className="text-2xl leading-none" aria-hidden="true">
              {marketFlag}
            </span>
          )}
          {formatMarketName(market)} Market
        </h2>
        <span className="text-sm text-outline">
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

      {incentives && (
        <RegionSelector
          incentives={incentives}
          selectedRegions={selectedRegions}
          onChange={onRegionsChange}
        />
      )}

      <div className="inline-flex rounded-lg bg-surface-container-low p-1">
        {(["table", "charts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`rounded-md px-6 py-2.5 text-base font-semibold capitalize transition-all ${
              activeTab === tab
                ? "bg-surface text-primary shadow"
                : "text-outline hover:text-on-surface"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "table" ? (
        <EVTable
          vehicles={filtered}
          onSelectVehicle={onSelectVehicle}
          compareIds={compareIds}
          onToggleCompare={onToggleCompare}
          incentives={incentives}
          selectedRegions={selectedRegions}
        />
      ) : (
        <ComparisonChart
          vehicles={filtered}
          incentives={incentives}
          selectedRegions={selectedRegions}
          onSelectVehicle={onSelectVehicle}
        />
      )}

      <CompareBar
        vehicles={vehicles}
        compareIds={compareIds}
        onToggleCompare={onToggleCompare}
        onClearCompare={onClearCompare}
        onCompare={onCompare}
      />
    </div>
  );
}
