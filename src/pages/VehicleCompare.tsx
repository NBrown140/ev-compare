import { Fragment } from "react";
import type { EV } from "@/types/ev";
import { SECTIONS, FIELD_LABELS, formatFieldValue } from "@/utils/vehicleFields";

interface VehicleCompareProps {
  vehicles: EV[];
  compareIds: string[];
  onBack: () => void;
  onToggleCompare: (id: string) => void;
}

const HIGHER_IS_BETTER = new Set([
  "range_km",
  "range_city_km",
  "range_highway_km",
  "battery_capacity_kwh",
  "fast_charge_kw",
  "onboard_charger_kw",
  "power_kw",
  "torque_nm",
  "top_speed_kmh",
  "cargo_volume_l",
  "frunk_volume_l",
  "towing_capacity_kg",
  "seats",
]);

const LOWER_IS_BETTER = new Set([
  "price_local",
  "price_per_range_km",
  "price_per_kwh",
  "efficiency_wh_km",
  "charge_10_80_min",
  "acceleration_0_100_s",
  "curb_weight_kg",
]);

function getBestIndex(
  vehicles: EV[],
  field: keyof EV
): number | null {
  const values = vehicles.map((v) => v[field]);
  const numeric = values.map((v) =>
    typeof v === "number" ? v : null
  );
  if (numeric.every((v) => v == null)) return null;

  if (HIGHER_IS_BETTER.has(field)) {
    let bestIdx = -1;
    let bestVal = -Infinity;
    for (let i = 0; i < numeric.length; i++) {
      if (numeric[i] != null && numeric[i]! > bestVal) {
        bestVal = numeric[i]!;
        bestIdx = i;
      }
    }
    return bestIdx >= 0 ? bestIdx : null;
  }

  if (LOWER_IS_BETTER.has(field)) {
    let bestIdx = -1;
    let bestVal = Infinity;
    for (let i = 0; i < numeric.length; i++) {
      if (numeric[i] != null && numeric[i]! < bestVal) {
        bestVal = numeric[i]!;
        bestIdx = i;
      }
    }
    return bestIdx >= 0 ? bestIdx : null;
  }

  return null;
}

export default function VehicleCompare({
  vehicles,
  compareIds,
  onBack,
  onToggleCompare,
}: VehicleCompareProps) {
  const compareVehicles = compareIds
    .map((id) => vehicles.find((v) => v.id === id))
    .filter(Boolean) as EV[];

  if (compareVehicles.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        No vehicles selected for comparison.
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 pl-2.5 pr-3.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer mx-auto mt-4"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 dark:bg-gray-800 pl-2.5 pr-3.5 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Back to list
        </button>
        <h2 className="text-2xl font-bold">
          Compare Vehicles ({compareVehicles.length})
        </h2>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          {/* Vehicle headers */}
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <th className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-4 py-4 text-left font-medium text-gray-500 dark:text-gray-400 min-w-[160px]">
                Vehicle
              </th>
              {compareVehicles.map((v) => (
                <th
                  key={v.id}
                  className="px-4 py-4 text-left font-semibold min-w-[180px]"
                >
                  <div className="flex flex-col gap-1">
                    <span>
                      {v.manufacturer} {v.model}
                    </span>
                    {v.variant && (
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                        {v.variant}
                      </span>
                    )}
                    <button
                      onClick={() => onToggleCompare(v.id)}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 self-start mt-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {SECTIONS.map((section) => {
              const visibleFields = section.fields.filter((f) =>
                compareVehicles.some((v) => v[f] != null)
              );
              if (visibleFields.length === 0) return null;

              return (
                <Fragment key={section.title}>
                  {/* Section header */}
                  <tr>
                    <td
                      colSpan={compareVehicles.length + 1}
                      className="bg-gray-100/50 dark:bg-gray-800/50 px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide border-t border-gray-200 dark:border-gray-700"
                    >
                      {section.title}
                    </td>
                  </tr>

                  {/* Field rows */}
                  {visibleFields.map((field) => {
                    const bestIdx = getBestIndex(compareVehicles, field);
                    return (
                      <tr
                        key={field}
                        className="border-t border-gray-100 dark:border-gray-700/50"
                      >
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-900 px-4 py-2 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                          {FIELD_LABELS[field] ?? field}
                        </td>
                        {compareVehicles.map((v, i) => (
                          <td
                            key={v.id}
                            className={`px-4 py-2 whitespace-nowrap ${
                              bestIdx === i
                                ? "text-green-700 font-semibold dark:text-green-400"
                                : ""
                            }`}
                          >
                            {formatFieldValue(v, field)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
