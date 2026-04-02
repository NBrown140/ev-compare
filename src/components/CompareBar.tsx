import type { EV } from "@/types/ev";

interface CompareBarProps {
  vehicles: EV[];
  compareIds: string[];
  onToggleCompare: (id: string) => void;
  onClearCompare: () => void;
  onCompare: () => void;
}

export default function CompareBar({
  vehicles,
  compareIds,
  onToggleCompare,
  onClearCompare,
  onCompare,
}: CompareBarProps) {
  if (compareIds.length === 0) return null;

  const selectedVehicles = compareIds
    .map((id) => vehicles.find((v) => v.id === id))
    .filter(Boolean) as EV[];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
      <div className="mx-auto max-w-7xl px-4 pb-4">
        <div className="rounded-xl border border-outline-variant bg-surface/95 backdrop-blur-sm shadow-lg px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-outline shrink-0">
              {compareIds.length} selected
            </span>

            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {selectedVehicles.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-3 py-1 text-sm text-primary"
                >
                  <span className="truncate max-w-[150px]">
                    {v.manufacturer} {v.model}
                  </span>
                  <button
                    onClick={() => onToggleCompare(v.id)}
                    className="ml-0.5 text-primary hover:text-primary-dim cursor-pointer"
                    aria-label={`Remove ${v.manufacturer} ${v.model}`}
                  >
                    x
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onClearCompare}
                className="text-sm text-outline hover:text-on-surface cursor-pointer"
              >
                Clear all
              </button>
              <button
                onClick={onCompare}
                disabled={compareIds.length < 2}
                className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  compareIds.length >= 2
                    ? "bg-primary text-on-primary hover:bg-primary-dim"
                    : "bg-surface-container text-outline cursor-not-allowed"
                }`}
              >
                Compare
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
