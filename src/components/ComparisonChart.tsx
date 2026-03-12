import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { EV } from "@/types/ev";
import { formatCurrency } from "@/utils/format";
import { useTheme } from "@/hooks/useTheme";

interface ComparisonChartProps {
  vehicles: EV[];
}

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#14b8a6",
  "#6366f1",
];

export default function ComparisonChart({ vehicles }: ComparisonChartProps) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === "dark";
  const gridStroke = isDark ? "#374151" : "#f0f0f0";
  const tickFill = isDark ? "#9ca3af" : "#666";

  const scatterData = vehicles.map((v) => ({
    name: `${v.manufacturer} ${v.model}`,
    range_km: v.range_km,
    price: v.price_local,
    battery: v.battery_capacity_kwh,
    currency: v.currency,
  }));

  const barData = vehicles
    .filter((v) => v.price_per_range_km != null)
    .map((v) => ({
      name: `${v.manufacturer} ${v.model}`,
      price_per_km: v.price_per_range_km!,
      currency: v.currency,
    }))
    .sort((a, b) => a.price_per_km - b.price_per_km);

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">Range vs Price</h3>
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
                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-sm">
                    <div className="font-semibold">{d.name}</div>
                    <div>Range: {d.range_km} km</div>
                    <div>Price: {formatCurrency(d.price, d.currency)}</div>
                    <div>Battery: {d.battery} kWh</div>
                  </div>
                );
              }}
            />
            <Scatter data={scatterData} fill="#3b82f6">
              {scatterData.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  r={Math.max(
                    6,
                    Math.min(16, scatterData[i].battery / 5)
                  )}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
          Dot size represents battery capacity
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold mb-4">
          Price per Range km (Best Value)
        </h3>
        <ResponsiveContainer width="100%" height={Math.max(250, barData.length * 40)}>
          <BarChart
            data={barData}
            layout="vertical"
            margin={{ top: 5, right: 30, bottom: 5, left: 120 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
            <XAxis
              type="number"
              tick={{ fontSize: 12, fill: tickFill }}
              tickFormatter={(v: number) =>
                formatCurrency(v, barData[0]?.currency ?? "USD")
              }
            />
            <YAxis
              dataKey="name"
              type="category"
              width={110}
              tick={{ fontSize: 12, fill: tickFill }}
            />
            <Tooltip
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload as (typeof barData)[number];
                return (
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-sm">
                    <div className="font-semibold">{d.name}</div>
                    <div>Price/km: {formatCurrency(d.price_per_km, d.currency)}</div>
                  </div>
                );
              }}
            />
            <Bar dataKey="price_per_km" name="Price/km" radius={[0, 4, 4, 0]}>
              {barData.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
