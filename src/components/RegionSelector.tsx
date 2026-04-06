import { useState } from "react";
import type { MarketIncentives, IncentiveProgram } from "@/types/ev";

interface RegionSelectorProps {
  incentives: MarketIncentives;
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
}

function ProgramDetail({ program, regionLabel }: { program: IncentiveProgram; regionLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  const text = [program.description, program.disclaimer].filter(Boolean).join(" ");
  const needsTruncation = text.length > 120;
  const displayText = needsTruncation && !expanded ? text.slice(0, 120) + "\u2026" : text;

  return (
    <div className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-on-surface">
            {program.name}
          </span>
          <span className="text-[10px] text-outline px-1.5 py-0.5 rounded bg-surface-container-low">
            {regionLabel}
          </span>
        </div>
        {text && (
          <p className="text-xs text-outline leading-relaxed mt-1">
            {displayText}
            {needsTruncation && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="ml-1 text-primary hover:underline font-medium"
              >
                {expanded ? "less" : "more"}
              </button>
            )}
          </p>
        )}
      </div>
      <a
        href={program.source}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 self-start mt-0.5 text-[10px] text-primary hover:underline"
        title="View source"
      >
        <svg className="w-3.5 h-3.5 inline-block" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
        </svg>
      </a>
    </div>
  );
}

export default function RegionSelector({
  incentives,
  selectedRegions,
  onChange,
}: RegionSelectorProps) {
  const regionIds = Object.keys(incentives.regions);
  if (regionIds.length === 0) return null;

  const levels = new Map<string, string[]>();
  for (const id of regionIds) {
    const { level } = incentives.regions[id];
    if (!levels.has(level)) levels.set(level, []);
    levels.get(level)!.push(id);
  }

  function toggle(regionId: string) {
    const region = incentives.regions[regionId];
    const isSelected = selectedRegions.includes(regionId);

    if (isSelected) {
      onChange(selectedRegions.filter((r) => r !== regionId));
    } else {
      const sameLevel = regionIds.filter(
        (r) => r !== regionId && incentives.regions[r].level === region.level
      );
      const without = selectedRegions.filter((r) => !sameLevel.includes(r));
      onChange([...without, regionId]);
    }
  }

  const selectedProgramsWithRegion = selectedRegions.flatMap((regionId) => {
    const region = incentives.regions[regionId];
    if (!region) return [];
    return region.programs.map((p) => ({ program: p, regionLabel: region.label }));
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-outline uppercase tracking-wide">
          Incentives
        </span>
        {[...levels.entries()].map(([level, ids], levelIdx) => (
          <div key={level} className="flex items-center gap-1.5">
            {levelIdx > 0 && (
              <span className="w-px h-4 bg-outline-variant mx-1" />
            )}
            <span className="text-[11px] text-outline">{level}</span>
            {ids.map((id) => {
              const region = incentives.regions[id];
              const isSelected = selectedRegions.includes(id);
              return (
                <button
                  key={id}
                  onClick={() => toggle(id)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                    isSelected
                      ? "border-primary-dim bg-primary-container text-primary"
                      : "border-outline-variant bg-surface text-outline hover:border-outline hover:bg-surface-container-low"
                  }`}
                >
                  {region.label}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {selectedProgramsWithRegion.length > 0 && (
        <div className="rounded-lg bg-surface-container-low/50 px-4 py-3 divide-y divide-outline-variant/30">
          {selectedProgramsWithRegion.map(({ program, regionLabel }) => (
            <ProgramDetail
              key={program.id}
              program={program}
              regionLabel={regionLabel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
