import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { EV } from "@/types/ev";
import { formatCurrency, shortenVariant } from "@/utils/format";
import { useTheme } from "@/hooks/useTheme";
import { removeOutliersIQR, linearRegression } from "@/utils/statistics";

interface DetailComparisonChartProps {
  vehicle: EV;
  allVehicles: EV[];
  onSelectVehicle?: (id: string) => void;
}

type FilterMode = "all" | "similar";

export default function DetailComparisonChart({
  vehicle,
  allVehicles,
  onSelectVehicle,
}: DetailComparisonChartProps) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  const gridStroke = isDark ? "#374151" : "#f0f0f0";
  const tickFill = isDark ? "#9ca3af" : "#666";

  const [mode, setMode] = useState<FilterMode>("all");
  const [hideOutliers, setHideOutliers] = useState(true);
  const [showTrendline, setShowTrendline] = useState(true);

  const others = useMemo(
    () =>
      allVehicles.filter((v) => {
        if (v.id === vehicle.id) return false;
        if (mode === "similar") {
          const priceDiff =
            Math.abs(v.price_local - vehicle.price_local) / vehicle.price_local;
          return priceDiff <= 0.05;
        }
        return true;
      }),
    [allVehicles, vehicle, mode],
  );

  const allOtherData = useMemo(
    () =>
      others.map((v) => ({
        id: v.id,
        name: `${v.manufacturer} ${v.model}`,
        variant: v.variant,
        range_km: v.range_km,
        price: v.price_local,
        currency: v.currency,
      })),
    [others],
  );

  const otherData = useMemo(
    () =>
      hideOutliers
        ? removeOutliersIQR(allOtherData, ["range_km", "price"])
        : allOtherData,
    [allOtherData, hideOutliers],
  );

  const currentData = useMemo(
    () => [
      {
        id: vehicle.id,
        name: `${vehicle.manufacturer} ${vehicle.model}`,
        variant: vehicle.variant,
        range_km: vehicle.range_km,
        price: vehicle.price_local,
        currency: vehicle.currency,
      },
    ],
    [vehicle],
  );

  const trendlineData = useMemo(() => {
    if (!showTrendline) return null;
    const allVisible = [...otherData, ...currentData];
    const points = allVisible.map((d) => ({ x: d.range_km, y: d.price }));
    return linearRegression(points, { x: "range_km", y: "price" });
  }, [otherData, currentData, showTrendline]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Range vs Price</h3>
        <div className="flex items-center gap-4">
          <div className="flex gap-1 text-sm">
            <button
              onClick={() => setMode("all")}
              className={`px-3 py-1 rounded-l-md border ${
                mode === "all"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
              }`}
            >
              All vehicles
            </button>
            <button
              onClick={() => setMode("similar")}
              className={`px-3 py-1 rounded-r-md border ${
                mode === "similar"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
              }`}
            >
              Within 5% price
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
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
          </div>
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
            tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
          />
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload as (typeof otherData)[number];
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
          <Scatter
            data={otherData}
            fill={isDark ? "#4b5563" : "#d1d5db"}
            opacity={0.6}
            className={onSelectVehicle ? "cursor-pointer" : undefined}
            onClick={(data) => {
              const d = data as unknown as (typeof otherData)[number];
              if (d?.id) onSelectVehicle?.(d.id);
            }}
          />
          <Scatter
            data={currentData}
            fill="#3b82f6"
            className={onSelectVehicle ? "cursor-pointer" : undefined}
            onClick={(data) => {
              const d = data as unknown as (typeof currentData)[number];
              if (d?.id) onSelectVehicle?.(d.id);
            }}
          >
            {currentData.map((_, i) => (
              <circle key={i} r={10} />
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
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
        Current vehicle highlighted in blue
      </p>
    </div>
  );
}
