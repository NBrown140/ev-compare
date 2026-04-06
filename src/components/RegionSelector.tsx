import type { MarketIncentives } from "@/types/ev";

interface RegionSelectorProps {
  incentives: MarketIncentives;
  selectedRegions: string[];
  onChange: (regions: string[]) => void;
}

export default function RegionSelector({
  incentives,
  selectedRegions,
  onChange,
}: RegionSelectorProps) {
  const regionIds = Object.keys(incentives.regions);
  if (regionIds.length === 0) return null;

  // Group regions by level, preserving insertion order
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

  // Collect all programs from selected regions
  const selectedPrograms = selectedRegions.flatMap((regionId) => {
    const region = incentives.regions[regionId];
    if (!region) return [];
    return region.programs;
  });

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-outline uppercase tracking-wide">
          Incentives
        </span>
        {[...levels.entries()].map(([level, ids]) => (
          <div key={level} className="flex items-center gap-1.5">
            <span className="text-xs text-outline mr-0.5">{level}:</span>
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

      {selectedPrograms.length > 0 && (
        <div className="space-y-1.5 pl-0.5">
          {selectedPrograms.map((program) => (
            <div key={program.id} className="text-xs text-outline leading-relaxed">
              <span className="font-medium text-on-surface">{program.name}</span>
              {program.description && (
                <span> — {program.description}</span>
              )}
              {program.disclaimer && (
                <span className="italic"> {program.disclaimer}</span>
              )}
              {" "}
              <a
                href={program.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Source
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
