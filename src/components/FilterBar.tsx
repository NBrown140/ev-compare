import { useState, useRef, useCallback } from "react";
import type { Filters, RangeFilter, Bounds } from "@/hooks/useFilters";
import type {
  Segment,
  Drivetrain,
  BatteryChemistry,
  ChargePortType,
} from "@/types/ev";
import FuzzyCombobox from "./FuzzyCombobox";

const SEGMENTS: Segment[] = [
  "sedan",
  "suv",
  "hatchback",
  "truck",
  "van",
  "crossover",
];

const DRIVETRAINS: Drivetrain[] = ["fwd", "rwd", "awd"];
const BATTERY_CHEMISTRIES: BatteryChemistry[] = [
  "lfp",
  "nmc",
  "nca",
  "nmca",
  "other",
];
const CHARGE_PORT_TYPES: ChargePortType[] = [
  "ccs",
  "nacs",
  "chademo",
  "gbt",
  "other",
];

// ─── Inline-editable value ──────────────────────────────────────────────────

function EditableValue({
  value,
  displayText,
  onCommit,
}: {
  value: number;
  displayText: string;
  onCommit: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const startEditing = () => {
    setDraft(String(value));
    setEditing(true);
    // Focus after React renders the input
    requestAnimationFrame(() => inputRef.current?.select());
  };

  const commitDraft = () => {
    setEditing(false);
    const parsed = parseFloat(draft.replace(/,/g, ""));
    if (!isNaN(parsed)) onCommit(parsed);
  };

  const cancel = () => setEditing(false);

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commitDraft();
          } else if (e.key === "Escape") {
            e.preventDefault();
            cancel();
          }
        }}
        className="w-[5.5ch] min-w-0 text-[11px] tabular-nums bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border border-blue-400 dark:border-blue-500 rounded px-1 py-0 text-right outline-none focus:ring-1 focus:ring-blue-400"
      />
    );
  }

  return (
    <span
      onClick={(e) => {
        e.stopPropagation();
        startEditing();
      }}
      className="cursor-text hover:text-gray-700 dark:hover:text-gray-300 hover:underline hover:decoration-dotted hover:underline-offset-2 transition-colors"
      title="Click to type a value"
    >
      {displayText}
    </span>
  );
}

// ─── Dual-thumb range slider ────────────────────────────────────────────────

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function snap(v: number, step: number, min: number) {
  return Math.round((v - min) / step) * step + min;
}

function DualRangeSlider({
  label,
  value,
  bound,
  unit,
  step,
  capped,
  onChange,
}: {
  label: string;
  value: RangeFilter;
  bound: { min: number; max: number };
  unit?: string;
  step?: number;
  /** When true, the max end of the slider represents "and above" — dragging to the max won't cap results. */
  capped?: boolean;
  onChange: (v: RangeFilter) => void;
}) {
  if (bound.min >= bound.max) return null;

  const s = step ?? 1;
  const lo = value.min ?? bound.min;
  const hi = value.max ?? bound.max;
  const isActive = value.min != null || value.max != null;

  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef<"lo" | "hi" | null>(null);

  const pct = (v: number) =>
    ((v - bound.min) / (bound.max - bound.min)) * 100;

  const valFromX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current!.getBoundingClientRect();
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      const raw = bound.min + ratio * (bound.max - bound.min);
      return snap(clamp(raw, bound.min, bound.max), s, bound.min);
    },
    [bound.min, bound.max, s],
  );

  const commit = useCallback(
    (newLo: number, newHi: number) => {
      onChange({
        min: newLo <= bound.min ? null : newLo,
        max: newHi >= bound.max ? null : newHi,
      });
    },
    [bound.min, bound.max, onChange],
  );

  const onPointerDown = useCallback(
    (thumb: "lo" | "hi") => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      draggingRef.current = thumb;
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!draggingRef.current) return;
      const v = valFromX(e.clientX);
      if (draggingRef.current === "lo") {
        commit(Math.min(v, hi), hi);
      } else {
        commit(lo, Math.max(v, lo));
      }
    },
    [valFromX, commit, lo, hi],
  );

  const onPointerUp = useCallback(() => {
    draggingRef.current = null;
  }, []);

  // Click on track to jump nearest thumb
  const onTrackClick = useCallback(
    (e: React.MouseEvent) => {
      if (draggingRef.current) return;
      const v = valFromX(e.clientX);
      const distLo = Math.abs(v - lo);
      const distHi = Math.abs(v - hi);
      if (distLo <= distHi) {
        commit(Math.min(v, hi), hi);
      } else {
        commit(lo, Math.max(v, lo));
      }
    },
    [valFromX, commit, lo, hi],
  );

  // Keyboard support for thumbs
  const onKeyDown = useCallback(
    (thumb: "lo" | "hi") => (e: React.KeyboardEvent) => {
      let delta = 0;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") delta = s;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") delta = -s;
      else if (e.key === "Home") {
        if (thumb === "lo") commit(bound.min, hi);
        else commit(lo, bound.min);
        e.preventDefault();
        return;
      } else if (e.key === "End") {
        if (thumb === "lo") commit(bound.max, hi);
        else commit(lo, bound.max);
        e.preventDefault();
        return;
      } else return;

      e.preventDefault();
      if (thumb === "lo") {
        const next = clamp(lo + delta, bound.min, hi);
        commit(next, hi);
      } else {
        const next = clamp(hi + delta, lo, bound.max);
        commit(lo, next);
      }
    },
    [s, lo, hi, bound.min, bound.max, commit],
  );

  const fmt = (v: number) => {
    const n =
      s < 1
        ? v.toLocaleString("en", { maximumFractionDigits: 1 })
        : v.toLocaleString("en");
    return unit ? `${n}${unit}` : n;
  };

  const hiDisplayText = capped && hi >= bound.max ? `${fmt(hi)}+` : fmt(hi);

  // Commit a typed value for the lo/hi end
  const commitTypedLo = (typed: number) => {
    const clamped = Math.min(typed, hi);
    onChange({
      min: clamped <= bound.min ? null : clamped,
      max: value.max,
    });
  };
  const commitTypedHi = (typed: number) => {
    const clamped = Math.max(typed, lo);
    onChange({
      min: value.min,
      // For capped sliders, any typed value above the slider bound is still valid
      // (it overrides the cap). For non-capped, null means "at bound max".
      max: !capped && clamped >= bound.max ? null : clamped,
    });
  };

  return (
    <div className="flex flex-col gap-2 min-w-[220px]">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`text-[13px] font-medium ${isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
        >
          {label}
        </span>
        <span className="text-[11px] tabular-nums text-gray-400 dark:text-gray-500 whitespace-nowrap flex items-center gap-0.5">
          <EditableValue value={lo} displayText={fmt(lo)} onCommit={commitTypedLo} />
          <span> – </span>
          <EditableValue value={hi} displayText={hiDisplayText} onCommit={commitTypedHi} />
        </span>
      </div>

      {/* Track + thumbs */}
      <div
        ref={trackRef}
        className="relative h-6 select-none touch-none"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onClick={onTrackClick}
      >
        {/* Background track */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700" />

        {/* Active range fill */}
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 transition-[left,right] duration-75"
          style={{
            left: `${pct(lo)}%`,
            right: `${100 - pct(hi)}%`,
          }}
        />

        {/* Low thumb */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={`${label} minimum`}
          aria-valuemin={bound.min}
          aria-valuemax={bound.max}
          aria-valuenow={lo}
          onPointerDown={onPointerDown("lo")}
          onKeyDown={onKeyDown("lo")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4.5 h-4.5 rounded-full bg-white dark:bg-gray-200 border-2 border-blue-500 dark:border-blue-400 shadow-sm cursor-grab active:cursor-grabbing active:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 outline-none"
          style={{ left: `${pct(lo)}%`, zIndex: draggingRef.current === "lo" ? 3 : 2 }}
        />

        {/* High thumb */}
        <div
          role="slider"
          tabIndex={0}
          aria-label={`${label} maximum`}
          aria-valuemin={bound.min}
          aria-valuemax={bound.max}
          aria-valuenow={hi}
          onPointerDown={onPointerDown("hi")}
          onKeyDown={onKeyDown("hi")}
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4.5 h-4.5 rounded-full bg-white dark:bg-gray-200 border-2 border-blue-500 dark:border-blue-400 shadow-sm cursor-grab active:cursor-grabbing active:scale-110 transition-transform focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-1 outline-none"
          style={{ left: `${pct(hi)}%`, zIndex: draggingRef.current === "hi" ? 3 : 2 }}
        />
      </div>
    </div>
  );
}

// ─── Enum & Bool selects ────────────────────────────────────────────────────

function EnumSelect<T extends string>({
  label,
  value,
  options,
  allLabel,
  onChange,
}: {
  label: string;
  value: T | "all";
  options: T[];
  allLabel?: string;
  onChange: (v: T | "all") => void;
}) {
  return (
    <label className="flex flex-col text-sm">
      <span className="text-gray-500 dark:text-gray-400 mb-1">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T | "all")}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 text-sm"
      >
        <option value="all">{allLabel ?? "All"}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

function BoolSelect({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <label className="flex flex-col text-sm">
      <span className="text-gray-500 dark:text-gray-400 mb-1">{label}</span>
      <select
        value={value == null ? "any" : value ? "yes" : "no"}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "any" ? null : v === "yes");
        }}
        className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-800 dark:text-gray-100 text-sm"
      >
        <option value="any">Any</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}

// ─── Filter bar ─────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: Filters;
  manufacturers: string[];
  modelYears: number[];
  bounds: Bounds;
  onChange: (filters: Filters) => void;
  onReset: () => void;
}

export default function FilterBar({
  filters,
  manufacturers,
  modelYears,
  bounds,
  onChange,
  onReset,
}: FilterBarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Count active advanced filters for badge
  const advancedCount = useAdvancedActiveCount(filters);

  const basicCount =
    (filters.modelYears.length > 0 ? 1 : 0) +
    (filters.segment.length > 0 ? 1 : 0) +
    (filters.manufacturer.length > 0 ? 1 : 0) +
    (filters.priceRange.min != null || filters.priceRange.max != null ? 1 : 0) +
    (filters.rangeKm.min != null || filters.rangeKm.max != null ? 1 : 0);
  const totalActiveCount = basicCount + advancedCount;
  const hasActiveFilters = totalActiveCount > 0;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700/80 bg-gray-50/60 dark:bg-gray-800/30">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-200/80 dark:border-gray-700/60">
        <div className="flex items-center gap-2">
          <svg
            className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Filters
          </span>
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 text-[10px] font-bold bg-blue-600 dark:bg-blue-500 text-white rounded-full leading-none">
              {totalActiveCount}
            </span>
          )}
        </div>

      </div>

      {/* Basic filters */}
      <div className="px-4 py-3">
        <div className="flex flex-wrap gap-x-5 gap-y-4 items-end">
          <fieldset className="flex flex-col text-sm">
            <span className="text-gray-500 dark:text-gray-400 mb-1">
              Model Year
            </span>
            <div className="flex gap-1.5 flex-wrap">
              {modelYears.map((y) => {
                const selected = filters.modelYears.includes(y);
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? filters.modelYears.filter((v) => v !== y)
                        : [...filters.modelYears, y];
                      onChange({ ...filters, modelYears: next });
                    }}
                    className={`px-2.5 py-1.5 rounded-lg border text-sm transition-colors ${
                      selected
                        ? "bg-blue-600 text-white border-blue-600 dark:bg-blue-500 dark:border-blue-500"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    }`}
                  >
                    {y}
                  </button>
                );
              })}
              {filters.modelYears.length > 0 && (
                <button
                  type="button"
                  onClick={() => onChange({ ...filters, modelYears: [] })}
                  className="px-2.5 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  All
                </button>
              )}
            </div>
          </fieldset>

          <div className="flex flex-col text-sm">
            <span className="text-gray-500 dark:text-gray-400 mb-1">Segment</span>
            <FuzzyCombobox
              options={SEGMENTS.map((s) => s.charAt(0).toUpperCase() + s.slice(1))}
              multiple
              searchable={false}
              values={filters.segment.map((s) => s.charAt(0).toUpperCase() + s.slice(1))}
              onChangeMulti={(vals) =>
                onChange({ ...filters, segment: vals.map((v) => v.toLowerCase()) as Segment[] })
              }
              placeholder="All segments"
            />
          </div>

          <div className="flex flex-col text-sm">
            <span className="text-gray-500 dark:text-gray-400 mb-1">
              Manufacturers
            </span>
            <FuzzyCombobox
              options={manufacturers}
              multiple
              values={filters.manufacturer}
              onChangeMulti={(vals) => onChange({ ...filters, manufacturer: vals })}
              placeholder="All manufacturers"
            />
          </div>

          <DualRangeSlider
            label="Price"
            value={filters.priceRange}
            bound={bounds.price}
            step={1000}
            capped
            onChange={(v) => onChange({ ...filters, priceRange: v })}
          />

          <DualRangeSlider
            label="Range"
            value={filters.rangeKm}
            bound={bounds.range}
            unit=" km"
            step={10}
            onChange={(v) => onChange({ ...filters, rangeKm: v })}
          />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-xs font-medium text-gray-700 dark:text-gray-200 bg-gray-200/70 dark:bg-gray-700/60 hover:bg-gray-300/80 dark:hover:bg-gray-600/70 px-2.5 py-1 rounded-md transition-colors flex items-center gap-1"
          >
            {showAdvanced ? "Less" : "More"}
            {!showAdvanced && advancedCount > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold bg-blue-600 text-white rounded-full leading-none">
                {advancedCount}
              </span>
            )}
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${showAdvanced ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 12 12"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M3 4.5l3 3 3-3" />
            </svg>
          </button>
          {hasActiveFilters && (
            <button
              onClick={onReset}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 px-2 py-1 rounded-md hover:bg-gray-200/60 dark:hover:bg-gray-700/50 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Advanced filters */}
      {showAdvanced && (
        <div className="border-t border-gray-200/80 dark:border-gray-700/60 px-4 py-4 space-y-6">
          {/* Battery & Charging */}
          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Battery & Charging
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <DualRangeSlider
                label="Battery capacity"
                value={filters.batteryCapacity}
                bound={bounds.batteryCapacity}
                unit=" kWh"
                step={1}
                onChange={(v) => onChange({ ...filters, batteryCapacity: v })}
              />
              <DualRangeSlider
                label="DC fast charge"
                value={filters.fastChargeKw}
                bound={bounds.fastChargeKw}
                unit=" kW"
                step={5}
                onChange={(v) => onChange({ ...filters, fastChargeKw: v })}
              />
              <DualRangeSlider
                label="Charge 10-80%"
                value={filters.charge1080Min}
                bound={bounds.charge1080Min}
                unit=" min"
                step={1}
                onChange={(v) => onChange({ ...filters, charge1080Min: v })}
              />
              <DualRangeSlider
                label="Efficiency"
                value={filters.efficiency}
                bound={bounds.efficiency}
                unit=" Wh/km"
                step={1}
                onChange={(v) => onChange({ ...filters, efficiency: v })}
              />
              <EnumSelect
                label="Battery chemistry"
                value={filters.batteryChemistry}
                options={BATTERY_CHEMISTRIES}
                onChange={(v) =>
                  onChange({ ...filters, batteryChemistry: v })
                }
              />
              <EnumSelect
                label="Charge port"
                value={filters.chargePortType}
                options={CHARGE_PORT_TYPES}
                onChange={(v) => onChange({ ...filters, chargePortType: v })}
              />
            </div>
          </section>

          {/* Performance */}
          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Performance
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <DualRangeSlider
                label="Power"
                value={filters.powerKw}
                bound={bounds.powerKw}
                unit=" kW"
                step={5}
                onChange={(v) => onChange({ ...filters, powerKw: v })}
              />
              <DualRangeSlider
                label="Torque"
                value={filters.torqueNm}
                bound={bounds.torqueNm}
                unit=" Nm"
                step={10}
                onChange={(v) => onChange({ ...filters, torqueNm: v })}
              />
              <DualRangeSlider
                label="0-100 km/h"
                value={filters.acceleration}
                bound={bounds.acceleration}
                unit="s"
                step={0.1}
                onChange={(v) => onChange({ ...filters, acceleration: v })}
              />
              <DualRangeSlider
                label="Top speed"
                value={filters.topSpeed}
                bound={bounds.topSpeed}
                unit=" km/h"
                step={5}
                onChange={(v) => onChange({ ...filters, topSpeed: v })}
              />
              <EnumSelect
                label="Drivetrain"
                value={filters.drivetrain}
                options={DRIVETRAINS}
                onChange={(v) => onChange({ ...filters, drivetrain: v })}
              />
            </div>
          </section>

          {/* Size & Capacity */}
          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Size & Capacity
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
              <DualRangeSlider
                label="Seats"
                value={filters.seats}
                bound={bounds.seats}
                step={1}
                onChange={(v) => onChange({ ...filters, seats: v })}
              />
              <DualRangeSlider
                label="Length"
                value={filters.lengthMm}
                bound={bounds.lengthMm}
                unit=" mm"
                step={10}
                onChange={(v) => onChange({ ...filters, lengthMm: v })}
              />
              <DualRangeSlider
                label="Width"
                value={filters.widthMm}
                bound={bounds.widthMm}
                unit=" mm"
                step={10}
                onChange={(v) => onChange({ ...filters, widthMm: v })}
              />
              <DualRangeSlider
                label="Ground clearance"
                value={filters.groundClearanceMm}
                bound={bounds.groundClearanceMm}
                unit=" mm"
                step={5}
                onChange={(v) => onChange({ ...filters, groundClearanceMm: v })}
              />
              <DualRangeSlider
                label="Cargo volume"
                value={filters.cargoVolume}
                bound={bounds.cargoVolume}
                unit=" L"
                step={10}
                onChange={(v) => onChange({ ...filters, cargoVolume: v })}
              />
              <DualRangeSlider
                label="Curb weight"
                value={filters.curbWeight}
                bound={bounds.curbWeight}
                unit=" kg"
                step={50}
                onChange={(v) => onChange({ ...filters, curbWeight: v })}
              />
              <DualRangeSlider
                label="Towing capacity"
                value={filters.towingCapacity}
                bound={bounds.towingCapacity}
                unit=" kg"
                step={100}
                onChange={(v) => onChange({ ...filters, towingCapacity: v })}
              />
            </div>
          </section>

          {/* Features */}
          <section>
            <h4 className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
              Features
            </h4>
            <div className="flex flex-wrap gap-4">
              <BoolSelect
                label="V2L capable"
                value={filters.v2lCapable}
                onChange={(v) => onChange({ ...filters, v2lCapable: v })}
              />
              <BoolSelect
                label="Plug & Charge"
                value={filters.plugAndCharge}
                onChange={(v) => onChange({ ...filters, plugAndCharge: v })}
              />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

// Count how many advanced filters are currently active
function useAdvancedActiveCount(filters: Filters): number {
  let count = 0;
  const rangeKeys: (keyof Filters)[] = [
    "batteryCapacity",
    "efficiency",
    "fastChargeKw",
    "charge1080Min",
    "powerKw",
    "torqueNm",
    "acceleration",
    "topSpeed",
    "cargoVolume",
    "curbWeight",
    "towingCapacity",
    "seats",
    "lengthMm",
    "widthMm",
    "groundClearanceMm",
  ];
  for (const k of rangeKeys) {
    const r = filters[k] as RangeFilter;
    if (r.min != null || r.max != null) count++;
  }
  if (filters.drivetrain !== "all") count++;
  if (filters.batteryChemistry !== "all") count++;
  if (filters.chargePortType !== "all") count++;
  if (filters.v2lCapable != null) count++;
  if (filters.plugAndCharge != null) count++;
  return count;
}
