import { useState } from "react";
import type { EV, MarketIncentives } from "@/types/ev";
import { formatCurrency, formatNumber } from "@/utils/format";
import { getVehicleIncentiveTotal } from "@/utils/incentives";
import { downloadCSV } from "@/utils/export";

type SortKey = keyof EV;
type SortDir = "asc" | "desc";

interface EVTableProps {
  vehicles: EV[];
  market?: string;
  pageSize?: number;
  onSelectVehicle?: (id: string) => void;
  compareIds?: string[];
  onToggleCompare?: (id: string) => void;
  incentives?: MarketIncentives | null;
  selectedRegions?: string[];
}

const columns: { key: SortKey; label: string; align?: "right" }[] = [
  { key: "manufacturer", label: "Manufacturer" },
  { key: "model", label: "Model" },
  { key: "model_year", label: "Year" },
  { key: "variant", label: "Variant" },
  { key: "segment", label: "Segment" },
  { key: "price_local", label: "Price", align: "right" },
  { key: "range_km", label: "Range (km)", align: "right" },
  { key: "battery_capacity_kwh", label: "Battery (kWh)", align: "right" },
  { key: "price_per_range_km", label: "Price/km", align: "right" },
  { key: "efficiency_wh_km", label: "Wh/km", align: "right" },
  { key: "fast_charge_kw", label: "DC Fast (kW)", align: "right" },
];

export default function EVTable({ vehicles, market, pageSize = 50, onSelectVehicle, compareIds, onToggleCompare, incentives, selectedRegions }: EVTableProps) {
  const compareFull = (compareIds?.length ?? 0) >= 5;
  const [sortKey, setSortKey] = useState<SortKey>("price_per_range_km");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const sorted = [...vehicles].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    const cmp = av < bv ? -1 : av > bv ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const hasIncentives = incentives && selectedRegions && selectedRegions.length > 0;

  const getIncentiveAmount = (v: EV) =>
    hasIncentives ? getVehicleIncentiveTotal(incentives, v.id, selectedRegions) : 0;

  const handleExport = () => {
    const rows = sorted.map((v) => {
      const row: Record<string, string | number | null> = {
        Manufacturer: v.manufacturer,
        Model: v.model,
        Year: v.model_year,
        Variant: v.variant ?? null,
        Segment: v.segment ?? null,
        Price: v.price_local,
        Currency: v.currency,
        "Range (km)": v.range_km,
        "Range Rating": v.range_rating?.toUpperCase() ?? null,
        "Battery (kWh)": v.battery_capacity_kwh,
        "Price/km": v.price_per_range_km ?? null,
        "Wh/km": v.efficiency_wh_km ?? null,
        "DC Fast (kW)": v.fast_charge_kw ?? null,
      };
      if (hasIncentives) {
        const amt = getIncentiveAmount(v);
        row["Est. Price After Incentives"] = amt > 0 ? v.price_local - amt : v.price_local;
      }
      return row;
    });
    const date = new Date().toISOString().slice(0, 10);
    const prefix = market ? `ev-compare-${market}` : "ev-compare";
    downloadCSV(rows, `${prefix}-${date}.csv`);
  };

  const renderCell = (v: EV, key: SortKey) => {
    switch (key) {
      case "price_local": {
        const incentiveAmount = getIncentiveAmount(v);
        if (incentiveAmount > 0) {
          return (
            <>
              {formatCurrency(v.price_local, v.currency)}
              <div className="text-xs text-tertiary whitespace-nowrap">
                ~{formatCurrency(v.price_local - incentiveAmount, v.currency)} after incentives
              </div>
            </>
          );
        }
        return formatCurrency(v.price_local, v.currency);
      }
      case "price_per_range_km":
        return v.price_per_range_km != null
          ? formatCurrency(v.price_per_range_km, v.currency)
          : "\u2014";
      case "range_km":
        return `${formatNumber(v.range_km)} (${v.range_rating.toUpperCase()})`;
      case "battery_capacity_kwh":
        return formatNumber(v.battery_capacity_kwh, 1);
      case "efficiency_wh_km":
        return formatNumber(v.efficiency_wh_km);
      case "fast_charge_kw":
        return formatNumber(v.fast_charge_kw);
      default:
        return String(v[key] ?? "\u2014");
    }
  };

  return (
    <div className="rounded-xl border border-outline-variant">
      <div className="flex justify-end px-3 py-2 border-b border-outline-variant/30">
        <button
          onClick={handleExport}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low px-3 py-1.5 text-sm font-medium text-outline hover:bg-surface-container transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="bg-surface-container-low border-b border-outline-variant">
              {onToggleCompare && (
                <th className="w-10 px-3 py-3 bg-surface-container-low" />
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  className={`px-4 py-3 font-medium text-outline cursor-pointer hover:text-on-surface select-none whitespace-nowrap bg-surface-container-low ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span className="ml-1">
                      {sortDir === "asc" ? "\u2191" : "\u2193"}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.slice(0, visibleCount).map((v) => {
              const isChecked = compareIds?.includes(v.id) ?? false;
              const disabled = compareFull && !isChecked;
              return (
                <tr
                  key={v.id}
                  onClick={() => onSelectVehicle?.(v.id)}
                  className={`border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors${onSelectVehicle ? " cursor-pointer" : ""}`}
                >
                  {onToggleCompare && (
                    <td className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={disabled}
                        onChange={() => onToggleCompare(v.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-4 w-4 rounded border-outline-variant accent-primary cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 whitespace-nowrap ${
                        col.align === "right" ? "text-right tabular-nums" : ""
                      }`}
                    >
                      {renderCell(v, col.key)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length > visibleCount && (
        <div className="flex justify-center py-3 border-t border-outline-variant">
          <button
            onClick={() => setVisibleCount((c) => c + pageSize)}
            className="text-sm text-primary hover:text-primary-dim px-4 py-2"
          >
            Show more ({sorted.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
}
