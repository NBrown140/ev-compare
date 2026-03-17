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
        <div className="rounded-xl border border-gray-200 bg-white/95 backdrop-blur-sm shadow-lg dark:border-gray-700 dark:bg-gray-800/95 px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 shrink-0">
              {compareIds.length} selected
            </span>

            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
              {selectedVehicles.map((v) => (
                <span
                  key={v.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                >
                  <span className="truncate max-w-[150px]">
                    {v.manufacturer} {v.model}
                  </span>
                  <button
                    onClick={() => onToggleCompare(v.id)}
                    className="ml-0.5 text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 cursor-pointer"
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
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 cursor-pointer"
              >
                Clear all
              </button>
              <button
                onClick={onCompare}
                disabled={compareIds.length < 2}
                className={`text-sm font-medium px-4 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  compareIds.length >= 2
                    ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-gray-700 dark:text-gray-500"
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
