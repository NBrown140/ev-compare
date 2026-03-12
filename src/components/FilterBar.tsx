import type { Filters } from "@/hooks/useFilters";
import type { Segment } from "@/types/ev";

const SEGMENTS: Segment[] = [
  "sedan",
  "suv",
  "hatchback",
  "truck",
  "van",
  "crossover",
];

interface FilterBarProps {
  filters: Filters;
  manufacturers: string[];
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export default function FilterBar({
  filters,
  manufacturers,
  onChange,
  onReset,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap gap-3 items-end">
      <label className="flex flex-col text-sm">
        <span className="text-gray-500 dark:text-gray-400 mb-1">Segment</span>
        <select
          value={filters.segment}
          onChange={(e) =>
            onChange({ ...filters, segment: e.target.value as Segment | "all" })
          }
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 text-sm"
        >
          <option value="all">All segments</option>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-sm">
        <span className="text-gray-500 dark:text-gray-400 mb-1">Manufacturer</span>
        <select
          value={filters.manufacturer}
          onChange={(e) =>
            onChange({ ...filters, manufacturer: e.target.value })
          }
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 text-sm"
        >
          <option value="">All manufacturers</option>
          {manufacturers.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col text-sm">
        <span className="text-gray-500 dark:text-gray-400 mb-1">Max price</span>
        <input
          type="number"
          placeholder="No limit"
          value={filters.maxPrice ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              maxPrice: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 text-sm w-32"
        />
      </label>

      <label className="flex flex-col text-sm">
        <span className="text-gray-500 dark:text-gray-400 mb-1">Min range (km)</span>
        <input
          type="number"
          placeholder="No limit"
          value={filters.minRange ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              minRange: e.target.value ? Number(e.target.value) : null,
            })
          }
          className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 text-sm w-32"
        />
      </label>

      <button
        onClick={onReset}
        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 px-3 py-2"
      >
        Reset
      </button>
    </div>
  );
}
