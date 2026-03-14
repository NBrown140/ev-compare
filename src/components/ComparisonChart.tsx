import { useState, useMemo, useCallback, useRef } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { EV, Segment } from "@/types/ev";
import { formatCurrency, shortenVariant } from "@/utils/format";
import { useTheme } from "@/hooks/useTheme";
import {
  removeOutliersIQR,
  linearRegression,
  gaussianKDE,
} from "@/utils/statistics";

interface ComparisonChartProps {
  vehicles: EV[];
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

function getCategoryColorMap(values: string[]): Map<string, string> {
  const unique = [...new Set(values)].sort();
  const map = new Map<string, string>();
  unique.forEach((v, i) => map.set(v, PASTEL_COLORS[i % PASTEL_COLORS.length]));
  return map;
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
  isDark,
  gridStroke,
  tickFill,
}: {
  data: ViolinSegmentData[];
  colorMap: Map<string, string>;
  colorByKey: ColorByKey;
  isDark: boolean;
  gridStroke: string;
  tickFill: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
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

  // Seeded random for stable jitter (seed must never be 0)
  function seededRandom(seed: number) {
    let s = ((seed + 1) * 16807) % 2147483647;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
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
              stroke={gridStroke}
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
              fill={tickFill}
            >
              {tick.toFixed(1)}
            </text>
          ))}

          {/* Each segment violin */}
          {data.map((seg, segIdx) => {
            const cx = segIdx * bandWidth + bandWidth / 2;
            const maxDensity = Math.max(...seg.kde.map((k) => k.density));

            // Build violin path (mirrored KDE)
            if (maxDensity === 0 || seg.points.length < 2) {
              // Just draw dots for small groups
              const rng = seededRandom(segIdx * 1000);
              return (
                <g key={seg.segment}>
                  {seg.points.map((pt, pi) => (
                    <circle
                      key={pi}
                      cx={cx + (rng() - 0.5) * 12}
                      cy={yScale(pt.rangePerPrice)}
                      r={5}
                      fill={colorMap.get(pt[colorByKey]) ?? "#93c5fd"}
                      fillOpacity={0.7}
                      stroke={isDark ? "#1f2937" : "#fff"}
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
                    />
                  ))}
                  {/* Segment label */}
                  <text
                    x={cx}
                    y={innerH + 24}
                    textAnchor="middle"
                    fontSize={12}
                    fill={tickFill}
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

            const rng = seededRandom(segIdx * 1000);

            return (
              <g key={seg.segment}>
                {/* Violin shape */}
                <path
                  d={`M ${rightPath} L ${leftPath} Z`}
                  fill={isDark ? "#374151" : "#e5e7eb"}
                  fillOpacity={0.5}
                  stroke={isDark ? "#4b5563" : "#d1d5db"}
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
                  const jitter = (rng() - 0.5) * 2 * localWidth;

                  return (
                    <circle
                      key={pi}
                      cx={cx + jitter}
                      cy={yScale(pt.rangePerPrice)}
                      r={5}
                      fill={colorMap.get(pt[colorByKey]) ?? "#93c5fd"}
                      fillOpacity={0.7}
                      stroke={isDark ? "#1f2937" : "#fff"}
                      strokeWidth={1}
                      className="cursor-pointer transition-transform"
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
                    />
                  );
                })}

                {/* Segment label */}
                <text
                  x={cx}
                  y={innerH + 24}
                  textAnchor="middle"
                  fontSize={12}
                  fill={tickFill}
                  className="capitalize"
                >
                  {seg.segment}
                </text>
              </g>
            );
          })}

          {/* Y-axis label */}
          <text
            transform={`translate(-42,${innerH / 2}) rotate(-90)`}
            textAnchor="middle"
            fontSize={12}
            fill={tickFill}
          >
            km / 1,000 currency
          </text>
        </g>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute pointer-events-none z-10 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-sm"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="font-semibold">{tooltip.point.name}</div>
          {tooltip.point.variant && (
            <div className="text-gray-500 dark:text-gray-400">
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

export default function ComparisonChart({ vehicles }: ComparisonChartProps) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  const gridStroke = isDark ? "#374151" : "#f0f0f0";
  const tickFill = isDark ? "#9ca3af" : "#666";

  const [hideOutliers, setHideOutliers] = useState(true);
  const [showTrendline, setShowTrendline] = useState(true);
  const [colorBy, setColorBy] = useState<ColorByKey>("manufacturer");

  const allScatterData = useMemo(
    () =>
      vehicles.map((v) => ({
        name: `${v.manufacturer} ${v.model}`,
        variant: v.variant,
        manufacturer: v.manufacturer,
        model_year: String(v.model_year),
        segment: v.segment,
        drivetrain: v.drivetrain ?? "Unknown",
        battery_chemistry: v.battery_chemistry ?? "Unknown",
        range_km: v.range_km,
        price: v.price_local,
        currency: v.currency,
      })),
    [vehicles],
  );

  const scatterData = useMemo(
    () =>
      hideOutliers
        ? removeOutliersIQR(allScatterData, ["range_km", "price"])
        : allScatterData,
    [allScatterData, hideOutliers],
  );

  const colorMap = useMemo(
    () => getCategoryColorMap(scatterData.map((d) => d[colorBy])),
    [scatterData, colorBy],
  );

  const trendlineData = useMemo(() => {
    if (!showTrendline) return null;
    const points = scatterData.map((d) => ({ x: d.range_km, y: d.price }));
    return linearRegression(points, { x: "range_km", y: "price" });
  }, [scatterData, showTrendline]);

  const filteredNames = useMemo(
    () => new Set(scatterData.map((d) => d.name)),
    [scatterData],
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
      if (!filteredNames.has(`${v.manufacturer} ${v.model}`)) continue;
      if (v.price_local <= 0) continue;
      const rangePerPrice = (v.range_km / v.price_local) * 1000;
      const seg = v.segment;
      if (!bySegment.has(seg)) bySegment.set(seg, []);
      bySegment.get(seg)!.push({
        name: `${v.manufacturer} ${v.model}`,
        variant: v.variant,
        manufacturer: v.manufacturer,
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
  }, [vehicles, filteredNames]);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h3 className="text-lg font-semibold">Range vs Price</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={hideOutliers}
                onChange={(e) => setHideOutliers(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Hide outliers
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={showTrendline}
                onChange={(e) => setShowTrendline(e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              Trendline
            </label>
            <label className="flex items-center gap-1.5">
              Color by
              <select
                value={colorBy}
                onChange={(e) => setColorBy(e.target.value as ColorByKey)}
                className="ml-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm px-2 py-0.5"
              >
                {COLOR_BY_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <ScatterChart margin={{ top: 10, right: 30, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              dataKey="range_km"
              name="Range"
              unit=" km"
              type="number"
              tick={{ fontSize: 12, fill: tickFill }}
            />
            <YAxis
              dataKey="price"
              name="Price"
              type="number"
              tick={{ fontSize: 12, fill: tickFill }}
              tickFormatter={(v: number) =>
                `${Math.round(v / 1000)}k`
              }
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload as (typeof scatterData)[number];
                if (!d.name) return null;
                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-sm">
                    <div className="font-semibold">{d.name}</div>
                    {d.variant && (
                      <div className="text-gray-500 dark:text-gray-400">
                        {shortenVariant(d.variant)}
                      </div>
                    )}
                    <div>Range: {d.range_km} km</div>
                    <div>Price: {formatCurrency(d.price, d.currency)}</div>
                  </div>
                );
              }}
            />
            <Scatter data={scatterData} fill="#3b82f6" fillOpacity={0.7}>
              {scatterData.map((entry, i) => (
                <Cell
                  key={i}
                  fill={colorMap.get(entry[colorBy]) ?? "#93c5fd"}
                  fillOpacity={0.7}
                />
              ))}
            </Scatter>
            {trendlineData && (
              <Scatter
                data={trendlineData.line}
                line={{ strokeDasharray: "6 3", stroke: isDark ? "#6b7280" : "#9ca3af", strokeWidth: 2 }}
                shape={<></>}
                legendType="none"
                isAnimationActive={false}
              />
            )}
          </ScatterChart>
        </ResponsiveContainer>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-xs text-gray-600 dark:text-gray-400">
          {[...colorMap.entries()].map(([label, color]) => (
            <span key={label} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: color, opacity: 0.85 }}
              />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">
          Range per Price by Segment
        </h3>
        <SegmentViolinPlot
          data={violinData}
          colorMap={colorMap}
          colorByKey={colorBy}
          isDark={isDark}
          gridStroke={gridStroke}
          tickFill={tickFill}
        />
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Higher is better. Values show km per 1,000 in local currency.
        </p>
      </div>
    </div>
  );
}
