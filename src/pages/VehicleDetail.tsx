import type { EV } from "@/types/ev";
import type { Source, SourcesMap } from "@/types/ev";
import { SECTIONS, FIELD_LABELS, formatFieldValue } from "@/utils/vehicleFields";
import { formatCurrency } from "@/utils/format";
import DetailViolinChart from "@/components/DetailViolinChart";

interface VehicleDetailProps {
  vehicle: EV;
  trims: EV[];
  allVehicles: EV[];
  sources: SourcesMap | null;
  onBack: () => void;
  onSelectVehicle?: (id: string) => void;
  compareIds?: string[];
  onToggleCompare?: (id: string) => void;
}

const COMPUTED_FIELDS = new Set(["price_per_range_km", "price_per_kwh"]);

function buildFootnotes(
  vehicleId: string,
  sources: SourcesMap | null
): { fieldToNotes: Map<string, number[]>; footnotes: Source[] } {
  const fieldToNotes = new Map<string, number[]>();
  const vehicleSources = sources?.[vehicleId];
  if (!vehicleSources) return { fieldToNotes, footnotes: [] };

  const footnotes = vehicleSources;
  for (let i = 0; i < footnotes.length; i++) {
    for (const field of footnotes[i].fields) {
      const existing = fieldToNotes.get(field) ?? [];
      existing.push(i + 1);
      fieldToNotes.set(field, existing);
    }
  }
  return { fieldToNotes, footnotes };
}

export default function VehicleDetail({
  vehicle,
  trims,
  allVehicles,
  sources,
  onBack,
  onSelectVehicle,
  compareIds,
  onToggleCompare,
}: VehicleDetailProps) {
  const { fieldToNotes, footnotes } = buildFootnotes(vehicle.id, sources);
  const isInCompare = compareIds?.includes(vehicle.id) ?? false;
  const compareFull = (compareIds?.length ?? 0) >= 5 && !isInCompare;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer hover:underline transition-colors"
        >
          &larr; Back to list
        </button>
        <h2 className="text-2xl font-bold">
          {vehicle.manufacturer} {vehicle.model}{" "}
          <span className="text-gray-400 dark:text-gray-500 font-normal">
            ({vehicle.model_year})
          </span>
        </h2>
        {onToggleCompare && (
          <button
            onClick={() => onToggleCompare(vehicle.id)}
            disabled={compareFull}
            className={`ml-auto text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              isInCompare
                ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                : compareFull
                  ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-700 dark:bg-gray-800 dark:text-gray-600"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            }`}
          >
            {isInCompare
              ? `Remove from compare (${compareIds!.length})`
              : `Add to compare (${compareIds?.length ?? 0})`}
          </button>
        )}
      </div>

      {trims.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {trims.map((trim) => {
            const isSelected = trim.id === vehicle.id;
            return (
              <button
                key={trim.id}
                onClick={() => onSelectVehicle?.(trim.id)}
                className={`group relative px-4 py-2.5 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? "border-blue-300 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/40"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-750"
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${
                    isSelected
                      ? "text-blue-700 dark:text-blue-300"
                      : "text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                  }`}
                >
                  {trim.variant ?? "Standard"}
                </span>
                <span
                  className={`block text-xs mt-0.5 tabular-nums ${
                    isSelected
                      ? "text-blue-500 dark:text-blue-400/70"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {formatCurrency(trim.price_local, trim.currency)}
                  {" / "}
                  {trim.range_km} km
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Specs - left column */}
        <div className="lg:col-span-3 space-y-6">
          {SECTIONS.map((section) => {
            const visibleFields = section.fields.filter(
              (f) => vehicle[f] != null
            );
            if (visibleFields.length === 0) return null;
            return (
              <div
                key={section.title}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5"
              >
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  {section.title}
                </h3>
                <dl className="divide-y divide-gray-100 dark:divide-gray-700">
                  {visibleFields.map((field) => {
                    const notes = fieldToNotes.get(field);
                    const showNotes =
                      notes && !COMPUTED_FIELDS.has(field);
                    return (
                      <div
                        key={field}
                        className="flex justify-between py-2 text-sm"
                      >
                        <dt className="text-gray-500 dark:text-gray-400">
                          {FIELD_LABELS[field] ?? field}
                        </dt>
                        <dd className="font-medium text-right">
                          {formatFieldValue(vehicle, field)}
                          {showNotes && (
                            <sup className="ml-1 text-xs text-blue-500">
                              {notes.map((n, i) => (
                                <span key={n}>
                                  {i > 0 && ","}
                                  <a
                                    href={`#fn-${n}`}
                                    className="hover:underline"
                                  >
                                    {n}
                                  </a>
                                </span>
                              ))}
                            </sup>
                          )}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            );
          })}
        </div>

        {/* Chart - right column */}
        <div className="lg:col-span-2">
          <DetailViolinChart
            vehicle={vehicle}
            allVehicles={allVehicles}
            highlightIds={trims.map((t) => t.id)}
            onSelectVehicle={onSelectVehicle}
          />
        </div>
      </div>

      {/* Footnotes */}
      {footnotes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Sources
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            {footnotes.map((source, i) => (
              <li key={i} id={`fn-${i + 1}`}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                >
                  {source.url.replace(/^https:\/\/web\.archive\.org\/web\/\d+\//, '')}
                </a>
                <span className="text-gray-400 dark:text-gray-500 ml-2">
                  ({source.fields.map((f) => FIELD_LABELS[f] ?? f).join(", ")})
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
