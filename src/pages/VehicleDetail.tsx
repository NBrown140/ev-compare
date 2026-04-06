import type { EV } from "@/types/ev";
import type { MarketIncentives, Source, SourcesMap } from "@/types/ev";
import { SECTIONS, FIELD_LABELS, formatFieldValue } from "@/utils/vehicleFields";
import { formatCurrency } from "@/utils/format";
import { getVehicleIncentiveBreakdown, getVehicleIncentiveTotal } from "@/utils/incentives";
import RegionSelector from "@/components/RegionSelector";
import DetailViolinChart from "@/components/DetailViolinChart";

const REPO_URL = "https://github.com/NBrown140/ev-compare";

interface VehicleDetailProps {
  vehicle: EV;
  market: string;
  trims: EV[];
  modelYears: EV[];
  allVehicles: EV[];
  sources: SourcesMap | null;
  incentives: MarketIncentives | null;
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
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

function buildIssueUrl(vehicle: EV, market: string): string {
  const params = new URLSearchParams({
    title: `[Vehicle data] ${vehicle.manufacturer} ${vehicle.model} (${vehicle.model_year})`,
    body: [
      "## Vehicle",
      `- ID: ${vehicle.id}`,
      `- Market: ${market}`,
      `- Model: ${vehicle.manufacturer} ${vehicle.model}`,
      `- Variant: ${vehicle.variant ?? "Standard"}`,
      `- Model year: ${vehicle.model_year}`,
      "",
      "## What looks wrong?",
      "",
      "## Suggested correction or source",
      "",
    ].join("\n"),
  });

  return `${REPO_URL}/issues/new?${params.toString()}`;
}

export default function VehicleDetail({
  vehicle,
  market,
  trims,
  modelYears,
  allVehicles,
  sources,
  incentives,
  selectedRegions,
  onRegionsChange,
  onBack,
  onSelectVehicle,
  compareIds,
  onToggleCompare,
}: VehicleDetailProps) {
  const { fieldToNotes, footnotes } = buildFootnotes(vehicle.id, sources);
  const incentiveTotal = getVehicleIncentiveTotal(incentives, vehicle.id, selectedRegions);
  const incentiveBreakdown = getVehicleIncentiveBreakdown(incentives, vehicle.id, selectedRegions);
  const isInCompare = compareIds?.includes(vehicle.id) ?? false;
  const compareFull = (compareIds?.length ?? 0) >= 5 && !isInCompare;
  const issueUrl = buildIssueUrl(vehicle, market);
  const contributingUrl = `${REPO_URL}/blob/main/CONTRIBUTING.md`;
  const downloadUrl = `${REPO_URL}/raw/main/data/markets/${market}.csv`;

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

      {incentives && (
        <RegionSelector
          incentives={incentives}
          selectedRegions={selectedRegions}
          onChange={onRegionsChange}
        />
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
                          {field === "price_local" && incentiveTotal > 0 && (
                            <div className="text-xs text-tertiary mt-0.5">
                              ~{formatCurrency(vehicle.price_local - incentiveTotal, vehicle.currency)} after incentives
                            </div>
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

      {incentiveTotal > 0 && (
        <div className="bg-surface rounded-xl border border-outline-variant p-5">
          <h3 className="text-sm font-semibold text-outline uppercase tracking-wide mb-3">
            Estimated Incentives
          </h3>
          <dl className="divide-y divide-outline-variant/30">
            {incentiveBreakdown.map((item) => (
              <div key={item.program} className="flex justify-between py-2 text-sm">
                <dt className="text-outline">{item.program}</dt>
                <dd className="font-medium text-tertiary">
                  -{formatCurrency(item.amount, vehicle.currency)}
                </dd>
              </div>
            ))}
            <div className="flex justify-between py-2 text-sm font-semibold">
              <dt>Estimated price after incentives</dt>
              <dd className="text-tertiary">
                ~{formatCurrency(vehicle.price_local - incentiveTotal, vehicle.currency)}
              </dd>
            </div>
          </dl>
          {incentiveBreakdown.some((item) => item.disclaimer) && (
            <div className="mt-3 space-y-1">
              {incentiveBreakdown
                .filter((item) => item.disclaimer)
                .map((item) => (
                  <p key={item.program} className="text-xs text-outline italic">
                    {item.program}: {item.disclaimer}
                  </p>
                ))}
            </div>
          )}
        </div>
      )}

      <section className="bg-surface-container-low rounded-xl p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h3 className="text-sm font-semibold text-outline uppercase tracking-wide mb-2">
              Help improve this entry
            </h3>
            <p className="text-sm text-on-surface">
              Found something off? This entry is part of an open-source dataset.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={issueUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-primary-container px-3.5 py-1.5 text-sm font-medium text-primary hover:bg-primary-container/80 transition-colors"
            >
              Report an error
            </a>
            <a
              href={contributingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              Suggest an edit
            </a>
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center rounded-full bg-surface px-3.5 py-1.5 text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
            >
              Download dataset
            </a>
          </div>
        </div>
      </section>

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
