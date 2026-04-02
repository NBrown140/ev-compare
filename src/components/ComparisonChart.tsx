import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import type { EV, Segment } from "@/types/ev";
import { formatCurrency, shortenVariant } from "@/utils/format";
import { useChartColors } from "@/hooks/useChartColors";
import { gaussianKDE } from "@/utils/statistics";

interface ComparisonChartProps {
  vehicles: EV[];
  onSelectVehicle?: (id: string) => void;
}

const PASTEL_COLORS = [
  "#93c5fd", // blue
  "#fca5a5", // red
  "#6ee7b7", // green
  "#fcd34d", // amber
  "#c4b5fd", // violet
  "#f9a8d4", // pink
  "#67e8f9", // cyan
  "#fdba74", // orange
  "#5eead4", // teal
  "#a5b4fc", // indigo
  "#d9f99d", // lime
  "#fde68a", // yellow
  "#e9d5ff", // purple
  "#fbcfe8", // rose
];

const OTHER_LABEL = "Other";
const OTHER_COLOR = "#d1d5db"; // gray-300

function getCategoryColorMap(values: string[]): Map<string, string> {
  // Sort by frequency (most common first), then alphabetically for ties
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  const sorted = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([v]) => v);
  const map = new Map<string, string>();
  sorted.forEach((v, i) => {
    if (v === OTHER_LABEL) return;
    map.set(v, PASTEL_COLORS[i % PASTEL_COLORS.length]);
  });
  // "Other" always last with gray
  if (counts.has(OTHER_LABEL)) {
    map.set(OTHER_LABEL, OTHER_COLOR);
  }
  return map;
}

const MAX_NAMED_CATEGORIES = 10;

/** Count distinct models per manufacturer, return set of top N. */
function getTopManufacturers(vehicles: EV[], topN: number): Set<string> {
  const modelsByMfr = new Map<string, Set<string>>();
  for (const v of vehicles) {
    if (!modelsByMfr.has(v.manufacturer)) modelsByMfr.set(v.manufacturer, new Set());
    modelsByMfr.get(v.manufacturer)!.add(v.model);
  }
  const sorted = [...modelsByMfr.entries()]
    .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
  return new Set(sorted.slice(0, topN).map(([m]) => m));
}

type ColorByKey = "manufacturer" | "model_year" | "segment" | "drivetrain" | "battery_chemistry";

const COLOR_BY_OPTIONS: { key: ColorByKey; label: string }[] = [
  { key: "manufacturer", label: "Manufacturer" },
  { key: "model_year", label: "Model year" },
  { key: "segment", label: "Segment" },
  { key: "drivetrain", label: "Drivetrain" },
  { key: "battery_chemistry", label: "Battery chemistry" },
];

interface ViolinPoint {
  id: string;
  name: string;
  variant: string | null;
  manufacturer: string;
  model_year: string;
  segment: string;
  drivetrain: string;
  battery_chemistry: string;
  rangePerPrice: number;
  currency: string;
  range_km: number;
  price: number;
}

interface ViolinSegmentData {
  segment: string;
  points: ViolinPoint[];
  kde: { value: number; density: number }[];
}

const VIOLIN_MARGIN = { top: 20, right: 30, bottom: 40, left: 55 };
const VIOLIN_HEIGHT = 380;

function SegmentViolinPlot({
  data,
  colorMap,
  colorByKey,
  highlightCategory,
  chartColors,
  onSelectVehicle,
}: {
  data: ViolinSegmentData[];
  colorMap: Map<string, string>;
  colorByKey: ColorByKey;
  highlightCategory: string | null;
  chartColors: ReturnType<typeof useChartColors>;
  onSelectVehicle?: (id: string) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dotsRef = useRef<SVGGElement>(null);

  // DOM-based highlight: update opacity and z-order directly without re-rendering
  useEffect(() => {
    const container = dotsRef.current;
    if (!container) return;
    const circles = container.querySelectorAll<SVGCircleElement>("circle[data-category]");
    const toRaise: SVGCircleElement[] = [];
    for (const circle of circles) {
      const cat = circle.getAttribute("data-category");
      const match = !highlightCategory || cat === highlightCategory;
      circle.style.opacity = match ? "0.7" : "0.1";
      if (highlightCategory && match) toRaise.push(circle);
    }
    // Move highlighted dots to end of their parent so they render on top
    for (const circle of toRaise) {
      circle.parentNode?.appendChild(circle);
    }
  }, [highlightCategory]);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: ViolinPoint;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(600);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(node);
    setContainerWidth(node.clientWidth);
    return () => observer.disconnect();
  }, []);

  const width = containerWidth;
  const innerW = width - VIOLIN_MARGIN.left - VIOLIN_MARGIN.right;
  const innerH = VIOLIN_HEIGHT - VIOLIN_MARGIN.top - VIOLIN_MARGIN.bottom;

  // Global y-scale across all segments
  const allValues = data.flatMap((d) => d.points.map((p) => p.rangePerPrice));
  const yMin = allValues.length ? Math.min(...allValues) * 0.9 : 0;
  const yMax = allValues.length ? Math.max(...allValues) * 1.1 : 10;

  const yScale = (v: number) =>
    innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const segCount = data.length;
  const bandWidth = segCount > 0 ? innerW / segCount : 0;
  const violinMaxHalfWidth = bandWidth * 0.38;

  // Y-axis ticks
  const yTicks = useMemo(() => {
    const tickCount = 6;
    const step = (yMax - yMin) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) =>
      Math.round((yMin + i * step) * 10) / 10,
    );
  }, [yMin, yMax]);

  // Stable jitter value for a point derived from its string ID
  function stableJitter(id: string): number {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return (h / 0xffffffff) - 0.5; // in (-0.5, 0.5)
  }

  return (
    <div ref={containerRef} className="relative">
      <svg
        ref={svgRef}
        width={width}
        height={VIOLIN_HEIGHT}
        className="overflow-visible"
      >
        <g
          transform={`translate(${VIOLIN_MARGIN.left},${VIOLIN_MARGIN.top})`}
        >
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <line
              key={tick}
              x1={0}
              x2={innerW}
              y1={yScale(tick)}
              y2={yScale(tick)}
              stroke={chartColors.gridStroke}
              strokeDasharray="3 3"
            />
          ))}

          {/* Y-axis labels */}
          {yTicks.map((tick) => (
            <text
              key={tick}
              x={-10}
              y={yScale(tick)}
              dy="0.35em"
              textAnchor="end"
              fontSize={12}
              fill={chartColors.tickFill}
            >
              {tick.toFixed(1)}
            </text>
          ))}

          {/* Each segment violin */}
          <g ref={dotsRef}>
          {data.map((seg, segIdx) => {
            const cx = segIdx * bandWidth + bandWidth / 2;
            const maxDensity = Math.max(...seg.kde.map((k) => k.density));

            // Build violin path (mirrored KDE)
            if (maxDensity === 0 || seg.points.length < 2) {
              // Just draw dots for small groups
              return (
                <g key={seg.segment}>
                  {seg.points.map((pt, pi) => (
                    <circle
                      key={pi}
                      data-category={pt[colorByKey]}
                      cx={cx + stableJitter(pt.id) * 12}
                      cy={yScale(pt.rangePerPrice)}
                      r={5}
                      fill={colorMap.get(pt[colorByKey]) ?? "#93c5fd"}
                      style={{ opacity: 0.7 }}
                      stroke={chartColors.dotStroke}
                      strokeWidth={1}
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        const svgRect =
                          svgRef.current?.getBoundingClientRect();
                        if (!svgRect) return;
                        setTooltip({
                          x: e.clientX - svgRect.left,
                          y: e.clientY - svgRect.top - 10,
                          point: pt,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => onSelectVehicle?.(pt.id)}
                    />
                  ))}
                  {/* Segment label */}
                  <text
                    x={cx}
                    y={innerH + 24}
                    textAnchor="middle"
                    fontSize={12}
                    fill={chartColors.tickFill}
                    className="capitalize"
                  >
                    {seg.segment}
                  </text>
                </g>
              );
            }

            // Build SVG path for the violin shape
            const rightPath = seg.kde
              .map((k) => {
                const x = (k.density / maxDensity) * violinMaxHalfWidth;
                const y = yScale(k.value);
                return `${cx + x},${y}`;
              })
              .join(" L");
            const leftPath = [...seg.kde]
              .reverse()
              .map((k) => {
                const x = (k.density / maxDensity) * violinMaxHalfWidth;
                const y = yScale(k.value);
                return `${cx - x},${y}`;
              })
              .join(" L");

            return (
              <g key={seg.segment}>
                {/* Violin shape */}
                <path
                  d={`M ${rightPath} L ${leftPath} Z`}
                  fill={chartColors.violinFill}
                  fillOpacity={0.5}
                  stroke={chartColors.violinStroke}
                  strokeWidth={1}
                />

                {/* Individual points - jittered within violin width */}
                {seg.points.map((pt, pi) => {
                  // Find density at this point's value to bound jitter
                  const nearestKde = seg.kde.reduce((best, k) =>
                    Math.abs(k.value - pt.rangePerPrice) <
                    Math.abs(best.value - pt.rangePerPrice)
                      ? k
                      : best,
                  );
                  const localWidth =
                    (nearestKde.density / maxDensity) *
                    violinMaxHalfWidth *
                    0.85;
                  const jitter = stableJitter(pt.id) * 2 * localWidth;

                  return (
                    <circle
                      key={pi}
                      data-category={pt[colorByKey]}
                      cx={cx + jitter}
                      cy={yScale(pt.rangePerPrice)}
                      r={5}
                      fill={colorMap.get(pt[colorByKey]) ?? "#93c5fd"}
                      style={{ opacity: 0.7 }}
                      stroke={chartColors.dotStroke}
                      strokeWidth={1}
                      className="cursor-pointer"
                      onMouseEnter={(e) => {
                        const svgRect =
                          svgRef.current?.getBoundingClientRect();
                        if (!svgRect) return;
                        setTooltip({
                          x: e.clientX - svgRect.left,
                          y: e.clientY - svgRect.top - 10,
                          point: pt,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      onClick={() => onSelectVehicle?.(pt.id)}
                    />
                  );
                })}

                {/* Segment label */}
                <text
                  x={cx}
                  y={innerH + 24}
                  textAnchor="middle"
                  fontSize={12}
                  fill={chartColors.tickFill}
                  className="capitalize"
                >
                  {seg.segment}
                </text>
              </g>
            );
          })}
          </g>

          {/* Y-axis label */}
          <text
            transform={`translate(-42,${innerH / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={12}
            fill={chartColors.tickFill}
          >
            km / 1,000 currency
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-surface border border-outline-variant rounded-lg p-3 shadow-lg text-sm"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-semibold">{tooltip.point.name}</div>
          {tooltip.point.variant && (
            <div className="text-outline">
              {shortenVariant(tooltip.point.variant)}
            </div>
          )}
          <div>Range: {tooltip.point.range_km} km</div>
          <div>
            Price: {formatCurrency(tooltip.point.price, tooltip.point.currency)}
          </div>
          <div>
            Value: {tooltip.point.rangePerPrice.toFixed(1)} km/1k{" "}
            {tooltip.point.currency}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ComparisonChart({ vehicles, onSelectVehicle }: ComparisonChartProps) {
  const chartColors = useChartColors();

  const [colorBy, setColorBy] = useState<ColorByKey>("manufacturer");
  const [hoveredCategory, setHoveredCategoryRaw] = useState<string | null>(null);
  const rafRef = useRef<number>(0);
  const setHoveredCategory = useCallback((v: string | null) => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => setHoveredCategoryRaw(v));
  }, []);
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);
  const [expandOther, setExpandOther] = useState(false);
  const highlightCategory = pinnedCategory ?? hoveredCategory;
  const legendRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pinnedCategory) return;
    const handleClick = (e: MouseEvent) => {
      if (legendRef.current?.contains(e.target as Node)) return;
      setPinnedCategory(null);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pinnedCategory]);

  const topManufacturers = useMemo(
    () => getTopManufacturers(vehicles, MAX_NAMED_CATEGORIES),
    [vehicles],
  );

  const shouldBucket = colorBy === "manufacturer" && !expandOther;

  const allScatterData = useMemo(
    () =>
      vehicles.map((v) => ({
        id: v.id,
        name: `${v.manufacturer} ${v.model}`,
        variant: v.variant,
        manufacturer:
          shouldBucket && !topManufacturers.has(v.manufacturer)
            ? OTHER_LABEL
            : v.manufacturer,
        model_year: String(v.model_year),
        segment: v.segment,
        drivetrain: v.drivetrain ?? "Unknown",
        battery_chemistry: v.battery_chemistry ?? "Unknown",
        range_km: v.range_km,
        price: v.price_local,
        currency: v.currency,
      })),
    [vehicles, topManufacturers, shouldBucket],
  );

  const colorMap = useMemo(
    () => getCategoryColorMap(allScatterData.map((d) => d[colorBy])),
    [allScatterData, colorBy],
  );

  // Violin plot data: range per price by segment
  const SEGMENT_ORDER: Segment[] = [
    "hatchback",
    "sedan",
    "crossover",
    "suv",
    "truck",
    "van",
  ];

  const violinData = useMemo(() => {
    const bySegment = new Map<Segment, ViolinPoint[]>();
    for (const v of vehicles) {
      if (v.price_local <= 0) continue;
      const rangePerPrice = (v.range_km / v.price_local) * 1000;
      const seg = v.segment;
      if (!bySegment.has(seg)) bySegment.set(seg, []);
      bySegment.get(seg)!.push({
        id: v.id,
        name: `${v.manufacturer} ${v.model}`,
        variant: v.variant,
        manufacturer:
          shouldBucket && !topManufacturers.has(v.manufacturer)
            ? OTHER_LABEL
            : v.manufacturer,
        model_year: String(v.model_year),
        segment: v.segment,
        drivetrain: v.drivetrain ?? "Unknown",
        battery_chemistry: v.battery_chemistry ?? "Unknown",
        rangePerPrice,
        currency: v.currency,
        range_km: v.range_km,
        price: v.price_local,
      });
    }

    const result: ViolinSegmentData[] = [];
    for (const seg of SEGMENT_ORDER) {
      const points = bySegment.get(seg);
      if (!points || points.length === 0) continue;
      const values = points.map((p) => p.rangePerPrice);
      result.push({
        segment: seg,
        points,
        kde: gaussianKDE(values),
      });
    }
    return result;
  }, [vehicles, topManufacturers, shouldBucket]);

  return (
    <div className="space-y-6">
      {/* Shared color controls */}
      <div className="bg-surface rounded-xl border border-outline-variant px-5 py-3 space-y-2.5">
        <label className="flex items-center gap-1.5 text-sm text-outline">
          Color by
          <select
            value={colorBy}
            onChange={(e) => {
              setColorBy(e.target.value as ColorByKey);
              setPinnedCategory(null);
              setExpandOther(false);
            }}
            className="ml-1 rounded border border-outline-variant bg-surface text-on-surface text-sm px-2 py-0.5"
          >
            {COLOR_BY_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <div ref={legendRef} className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-outline">
          {[...colorMap.entries()].map(([label, color]) => {
            if (label === OTHER_LABEL) {
              // "Other" entry: expand/collapse toggle
              const dimmed = highlightCategory != null && highlightCategory !== OTHER_LABEL;
              const otherCount = vehicles.length - vehicles.filter((v) => topManufacturers.has(v.manufacturer)).length;
              return (
                <span
                  key={label}
                  className="flex items-center gap-1.5 cursor-pointer select-none transition-opacity text-outline hover:text-on-surface"
                  style={{ opacity: dimmed ? 0.3 : 1 }}
                  onMouseEnter={() => setHoveredCategory(label)}
                  onMouseLeave={() => setHoveredCategory(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandOther(true);
                    setPinnedCategory(null);
                  }}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  Other ({otherCount})
                  <span className="text-[10px] text-outline ml-0.5">
                    expand
                  </span>
                </span>
              );
            }

            const active = highlightCategory != null && highlightCategory === label;
            const dimmed = highlightCategory != null && !active;
            return (
              <span
                key={label}
                className={`flex items-center gap-1.5 cursor-pointer select-none transition-opacity ${
                  pinnedCategory === label
                    ? "font-semibold text-on-surface"
                    : ""
                }`}
                style={{ opacity: dimmed ? 0.3 : 1 }}
                onMouseEnter={() => setHoveredCategory(label)}
                onMouseLeave={() => setHoveredCategory(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setPinnedCategory(pinnedCategory === label ? null : label);
                }}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: pinnedCategory === label ? `0 0 0 2px ${color}40` : undefined,
                  }}
                />
                {label}
              </span>
            );
          })}
          {expandOther && colorBy === "manufacturer" && (
            <span
              className="flex items-center gap-1 cursor-pointer select-none text-[10px] text-outline hover:text-on-surface"
              onClick={(e) => {
                e.stopPropagation();
                setExpandOther(false);
                setPinnedCategory(null);
              }}
            >
              collapse
            </span>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-xl border border-outline-variant p-6">
        <h3 className="text-lg font-semibold mb-4">
          Range per Price by Segment
        </h3>
        <SegmentViolinPlot
          data={violinData}
          colorMap={colorMap}
          colorByKey={colorBy}
          highlightCategory={highlightCategory}
          chartColors={chartColors}
          onSelectVehicle={onSelectVehicle}
        />
        <p className="text-xs text-outline mt-2">
          Higher is better. Values show km per 1,000 in local currency.
        </p>
      </div>

    </div>
  );
}
