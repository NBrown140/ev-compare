interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
}

export default function MetricCard({ label, value, sub }: MetricCardProps) {
  return (
    <div className="bg-surface rounded-xl border border-outline-variant p-5">
      <div className="text-sm text-outline mb-1">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-outline mt-1">{sub}</div>}
    </div>
  );
}
