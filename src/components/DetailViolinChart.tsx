import { useState, useMemo, useCallback, useRef } from "react";
import type { EV } from "@/types/ev";
import { formatCurrency, shortenVariant } from "@/utils/format";
import { useTheme } from "@/hooks/useTheme";
import { gaussianKDE } from "@/utils/statistics";

interface DetailViolinChartProps {
  vehicle: EV;
  allVehicles: EV[];
  onSelectVehicle?: (id: string) => void;
}

interface ViolinPoint {
  id: string;
  name: string;
  variant: string | null;
  rangePerPrice: number;
  currency: string;
  range_km: number;
  price: number;
}

const MARGIN = { top: 20, right: 20, bottom: 30, left: 55 };
const HEIGHT = 350;

function stableJitter(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return (h / 0xffffffff) - 0.5;
}

export default function DetailViolinChart({
  vehicle,
  allVehicles,
  onSelectVehicle,
}: DetailViolinChartProps) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  const gridStroke = isDark ? "#374151" : "#f0f0f0";
  const tickFill = isDark ? "#9ca3af" : "#666";

  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: ViolinPoint;
  } | null>(null);
  const [containerWidth, setContainerWidth] = useState(400);

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

  const segmentPoints = useMemo(() => {
    const points: ViolinPoint[] = [];
    for (const v of allVehicles) {
      if (v.segment !== vehicle.segment) continue;
      if (v.price_local <= 0) continue;
      points.push({
        id: v.id,
        name: `${v.manufacturer} ${v.model}`,
        variant: v.variant,
        rangePerPrice: (v.range_km / v.price_local) * 1000,
        currency: v.currency,
        range_km: v.range_km,
        price: v.price_local,
      });
    }
    return points;
  }, [allVehicles, vehicle.segment, vehicle.price_local]);

  const kde = useMemo(
    () => gaussianKDE(segmentPoints.map((p) => p.rangePerPrice)),
    [segmentPoints],
  );

  const width = containerWidth;
  const innerW = width - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const allValues = segmentPoints.map((p) => p.rangePerPrice);
  const yMin = allValues.length ? Math.min(...allValues) * 0.9 : 0;
  const yMax = allValues.length ? Math.max(...allValues) * 1.1 : 10;
  const yScale = (v: number) =>
    innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const yTicks = useMemo(() => {
    const tickCount = 6;
    const step = (yMax - yMin) / (tickCount - 1);
    return Array.from({ length: tickCount }, (_, i) =>
      Math.round((yMin + i * step) * 10) / 10,
    );
  }, [yMin, yMax]);

  const cx = innerW / 2;
  const violinMaxHalfWidth = Math.min(innerW * 0.38, 120);
  const maxDensity = kde.length ? Math.max(...kde.map((k) => k.density)) : 0;


  const otherDotFill = isDark ? "#4b5563" : "#d1d5db";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg font-semibold mb-4">
        Range per Price — {vehicle.segment}
      </h3>
      <div ref={containerRef} className="relative">
        <svg
          ref={svgRef}
          width={width}
          height={HEIGHT}
          className="overflow-visible"
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
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

            {/* Violin shape */}
            {maxDensity > 0 && segmentPoints.length >= 2 && (() => {
              const rightPath = kde
                .map((k) => {
                  const x = (k.density / maxDensity) * violinMaxHalfWidth;
                  const y = yScale(k.value);
                  return `${cx + x},${y}`;
                })
                .join(" L");
              const leftPath = [...kde]
                .reverse()
                .map((k) => {
                  const x = (k.density / maxDensity) * violinMaxHalfWidth;
                  const y = yScale(k.value);
                  return `${cx - x},${y}`;
                })
                .join(" L");
              return (
                <path
                  d={`M ${rightPath} L ${leftPath} Z`}
                  fill={isDark ? "#374151" : "#e5e7eb"}
                  fillOpacity={0.5}
                  stroke={isDark ? "#4b5563" : "#d1d5db"}
                  strokeWidth={1}
                />
              );
            })()}

            {/* Other vehicle dots (rendered first, below) */}
            {segmentPoints
              .filter((pt) => pt.id !== vehicle.id)
              .map((pt, pi) => {
                const localWidth =
                  maxDensity > 0
                    ? (() => {
                        const nearestKde = kde.reduce((best, k) =>
                          Math.abs(k.value - pt.rangePerPrice) <
                          Math.abs(best.value - pt.rangePerPrice)
                            ? k
                            : best,
                        );
                        return (
                          (nearestKde.density / maxDensity) *
                          violinMaxHalfWidth *
                          0.85
                        );
                      })()
                    : 6;
                const jitter = stableJitter(pt.id) * 2 * localWidth;
                return (
                  <circle
                    key={pi}
                    cx={cx + jitter}
                    cy={yScale(pt.rangePerPrice)}
                    r={5}
                    fill={otherDotFill}
                    opacity={0.6}
                    stroke={isDark ? "#1f2937" : "#fff"}
                    strokeWidth={1}
                    className={onSelectVehicle ? "cursor-pointer" : undefined}
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

            {/* Current vehicle dot (rendered last, on top) */}
            {(() => {
              const currentPt = segmentPoints.find(
                (pt) => pt.id === vehicle.id,
              );
              if (!currentPt) return null;
              const localWidth =
                maxDensity > 0
                  ? (() => {
                      const nearestKde = kde.reduce((best, k) =>
                        Math.abs(k.value - currentPt.rangePerPrice) <
                        Math.abs(best.value - currentPt.rangePerPrice)
                          ? k
                          : best,
                      );
                      return (
                        (nearestKde.density / maxDensity) *
                        violinMaxHalfWidth *
                        0.85
                      );
                    })()
                  : 6;
              const jitter = stableJitter(currentPt.id) * 2 * localWidth;
              return (
                <circle
                  cx={cx + jitter}
                  cy={yScale(currentPt.rangePerPrice)}
                  r={8}
                  fill="#3b82f6"
                  stroke={isDark ? "#1f2937" : "#fff"}
                  strokeWidth={2}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    const svgRect =
                      svgRef.current?.getBoundingClientRect();
                    if (!svgRect) return;
                    setTooltip({
                      x: e.clientX - svgRect.left,
                      y: e.clientY - svgRect.top - 10,
                      point: currentPt,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })()}

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
              Price:{" "}
              {formatCurrency(tooltip.point.price, tooltip.point.currency)}
            </div>
            <div>
              Value: {tooltip.point.rangePerPrice.toFixed(1)} km/1k{" "}
              {tooltip.point.currency}
            </div>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Current vehicle highlighted in blue. Higher is better.
      </p>
    </div>
  );
}
