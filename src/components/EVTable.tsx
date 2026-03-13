import { useState } from "react";
import type { EV } from "@/types/ev";
import { formatCurrency, formatNumber } from "@/utils/format";

type SortKey = keyof EV;
type SortDir = "asc" | "desc";

interface EVTableProps {
  vehicles: EV[];
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

export default function EVTable({ vehicles }: EVTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("price_per_range_km");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

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

  const renderCell = (v: EV, key: SortKey) => {
    switch (key) {
      case "price_local":
        return formatCurrency(v.price_local, v.currency);
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
    <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`px-4 py-3 font-medium text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 select-none whitespace-nowrap ${
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
          {sorted.map((v) => (
            <tr
              key={v.id}
              className="border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors"
            >
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
          ))}
        </tbody>
      </table>
    </div>
  );
}
