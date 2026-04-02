import type { EV } from "@/types/ev";
import type { Source, SourcesMap } from "@/types/ev";
import { SECTIONS, FIELD_LABELS, formatFieldValue } from "@/utils/vehicleFields";
import { formatCurrency } from "@/utils/format";
import DetailViolinChart from "@/components/DetailViolinChart";

interface VehicleDetailProps {
  vehicle: EV;
  trims: EV[];
  modelYears: EV[];
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
  modelYears,
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
    <div className={`space-y-6 ${compareIds && compareIds.length > 0 ? "pb-20" : ""}`}>
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-low pl-2.5 pr-3.5 py-1.5 text-sm font-medium text-outline hover:bg-surface-container transition-colors cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          Back to list
        </button>
        <h2 className="text-2xl font-bold">
          {vehicle.manufacturer} {vehicle.model}{" "}
          <span className="text-outline font-normal">
            ({vehicle.model_year})
          </span>
        </h2>
        {onToggleCompare && (
          <button
            onClick={() => onToggleCompare(vehicle.id)}
            disabled={compareFull}
            className={`ml-auto text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              isInCompare
                ? "border-primary-dim bg-primary-container text-primary hover:bg-primary-container/70"
                : compareFull
                  ? "border-outline-variant bg-surface-container-low text-outline cursor-not-allowed"
                  : "border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low"
            }`}
          >
            {isInCompare
              ? `Remove from compare (${compareIds!.length})`
              : `Add to compare (${compareIds?.length ?? 0})`}
          </button>
        )}
      </div>

      {modelYears.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-outline uppercase tracking-wide mr-1">
            Year
          </span>
          {modelYears.map((mv) => {
            const isSelected = mv.model_year === vehicle.model_year;
            return (
              <button
                key={mv.model_year}
                onClick={() => onSelectVehicle?.(mv.id)}
                className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  isSelected
                    ? "border-primary-dim bg-primary-container text-primary"
                    : "border-outline-variant bg-surface text-outline hover:border-outline hover:bg-surface-container-low"
                }`}
              >
                {mv.model_year}
              </button>
            );
          })}
        </div>
      )}

      {trims.length > 1 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs font-medium text-outline uppercase tracking-wide mr-1">
            Trim
          </span>
          {trims.map((trim) => {
            const isSelected = trim.id === vehicle.id;
            return (
              <button
                key={trim.id}
                onClick={() => onSelectVehicle?.(trim.id)}
                className={`group relative px-4 py-2.5 rounded-lg border text-left transition-colors ${
                  isSelected
                    ? "border-primary-dim bg-primary-container"
                    : "border-outline-variant bg-surface hover:border-outline hover:bg-surface-container-low"
                }`}
              >
                <span
                  className={`block text-sm font-semibold ${
                    isSelected
                      ? "text-primary"
                      : "text-on-surface group-hover:text-on-surface"
                  }`}
                >
                  {trim.variant ?? "Standard"}
                </span>
                <span
                  className={`block text-xs mt-0.5 tabular-nums ${
                    isSelected
                      ? "text-primary/70"
                      : "text-outline"
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
                className="bg-surface rounded-xl border border-outline-variant p-5"
              >
                <h3 className="text-sm font-semibold text-outline uppercase tracking-wide mb-3">
                  {section.title}
                </h3>
                <dl className="divide-y divide-outline-variant/30">
                  {visibleFields.map((field) => {
                    const notes = fieldToNotes.get(field);
                    const showNotes =
                      notes && !COMPUTED_FIELDS.has(field);
                    return (
                      <div
                        key={field}
                        className="flex justify-between py-2 text-sm"
                      >
                        <dt className="text-outline">
                          {FIELD_LABELS[field] ?? field}
                        </dt>
                        <dd className="font-medium text-right">
                          {formatFieldValue(vehicle, field)}
                          {showNotes && (
                            <sup className="ml-1 text-xs text-primary">
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
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <h3 className="text-sm font-semibold text-outline uppercase tracking-wide mb-3">
            Sources
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            {footnotes.map((source, i) => (
              <li key={i} id={`fn-${i + 1}`}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline break-all"
                >
                  {source.url.replace(/^https:\/\/web\.archive\.org\/web\/\d+\//, '')}
                </a>
                <span className="text-outline ml-2">
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
