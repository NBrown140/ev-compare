import type { EV } from "@/types/ev";
import type { Source, SourcesMap } from "@/types/ev";
import { formatCurrency, formatNumber } from "@/utils/format";
import DetailViolinChart from "@/components/DetailViolinChart";

interface VehicleDetailProps {
  vehicle: EV;
  allVehicles: EV[];
  sources: SourcesMap | null;
  onBack: () => void;
  onSelectVehicle?: (id: string) => void;
}

const COMPUTED_FIELDS = new Set(["price_per_range_km", "price_per_kwh"]);

const FIELD_LABELS: Record<string, string> = {
  manufacturer: "Manufacturer",
  model: "Model",
  model_year: "Model Year",
  variant: "Variant",
  segment: "Segment",
  seats: "Seats",
  price_local: "Price",
  currency: "Currency",
  range_km: "Range",
  range_rating: "Range Rating",
  battery_capacity_kwh: "Battery Capacity",
  battery_chemistry: "Battery Chemistry",
  efficiency_wh_km: "Efficiency",
  fast_charge_kw: "DC Fast Charge",
  charge_10_80_min: "Charge 10-80%",
  charge_port_type: "Charge Port",
  onboard_charger_kw: "Onboard Charger",
  drivetrain: "Drivetrain",
  power_kw: "Power",
  torque_nm: "Torque",
  acceleration_0_100_s: "0-100 km/h",
  top_speed_kmh: "Top Speed",
  length_mm: "Length",
  width_mm: "Width",
  height_mm: "Height",
  wheelbase_mm: "Wheelbase",
  ground_clearance_mm: "Ground Clearance",
  cargo_volume_l: "Cargo Volume",
  frunk_volume_l: "Frunk Volume",
  towing_capacity_kg: "Towing Capacity",
  curb_weight_kg: "Curb Weight",
  v2l_capable: "V2L Capable",
  plug_and_charge: "Plug & Charge",
  range_city_km: "City Range",
  range_highway_km: "Highway Range",
  price_per_range_km: "Price per Range km",
  price_per_kwh: "Price per kWh",
};

interface Section {
  title: string;
  fields: (keyof EV)[];
}

const SECTIONS: Section[] = [
  {
    title: "Overview",
    fields: [
      "manufacturer",
      "model",
      "model_year",
      "variant",
      "segment",
      "seats",
    ],
  },
  {
    title: "Pricing",
    fields: ["price_local", "currency", "price_per_range_km", "price_per_kwh"],
  },
  {
    title: "Range & Efficiency",
    fields: [
      "range_km",
      "range_rating",
      "efficiency_wh_km",
      "range_city_km",
      "range_highway_km",
    ],
  },
  {
    title: "Battery & Charging",
    fields: [
      "battery_capacity_kwh",
      "battery_chemistry",
      "fast_charge_kw",
      "charge_10_80_min",
      "charge_port_type",
      "onboard_charger_kw",
    ],
  },
  {
    title: "Performance",
    fields: [
      "drivetrain",
      "power_kw",
      "torque_nm",
      "acceleration_0_100_s",
      "top_speed_kmh",
    ],
  },
  {
    title: "Dimensions & Capacity",
    fields: [
      "length_mm",
      "width_mm",
      "height_mm",
      "wheelbase_mm",
      "ground_clearance_mm",
      "cargo_volume_l",
      "frunk_volume_l",
      "towing_capacity_kg",
      "curb_weight_kg",
    ],
  },
  {
    title: "Features",
    fields: ["v2l_capable", "plug_and_charge"],
  },
];

function formatFieldValue(vehicle: EV, field: keyof EV): string {
  const value = vehicle[field];
  if (value == null) return "\u2014";

  switch (field) {
    case "price_local":
      return formatCurrency(value as number, vehicle.currency);
    case "price_per_range_km":
    case "price_per_kwh":
      return formatCurrency(value as number, vehicle.currency);
    case "range_km":
    case "range_city_km":
    case "range_highway_km":
      return `${formatNumber(value as number)} km`;
    case "battery_capacity_kwh":
      return `${formatNumber(value as number, 1)} kWh`;
    case "efficiency_wh_km":
      return `${formatNumber(value as number)} Wh/km`;
    case "fast_charge_kw":
    case "onboard_charger_kw":
      return `${formatNumber(value as number)} kW`;
    case "power_kw":
      return `${formatNumber(value as number)} kW`;
    case "torque_nm":
      return `${formatNumber(value as number)} Nm`;
    case "acceleration_0_100_s":
      return `${value}s`;
    case "top_speed_kmh":
      return `${formatNumber(value as number)} km/h`;
    case "length_mm":
    case "width_mm":
    case "height_mm":
    case "wheelbase_mm":
    case "ground_clearance_mm":
      return `${formatNumber(value as number)} mm`;
    case "cargo_volume_l":
    case "frunk_volume_l":
      return `${formatNumber(value as number)} L`;
    case "towing_capacity_kg":
    case "curb_weight_kg":
      return `${formatNumber(value as number)} kg`;
    case "charge_10_80_min":
      return `${formatNumber(value as number)} min`;
    case "v2l_capable":
    case "plug_and_charge":
      return value ? "Yes" : "No";
    case "range_rating":
      return String(value).toUpperCase();
    case "drivetrain":
      return String(value).toUpperCase();
    case "battery_chemistry":
    case "charge_port_type":
      return String(value).toUpperCase();
    default:
      return String(value);
  }
}

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
  allVehicles,
  sources,
  onBack,
  onSelectVehicle,
}: VehicleDetailProps) {
  const { fieldToNotes, footnotes } = buildFootnotes(vehicle.id, sources);

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
          {vehicle.manufacturer} {vehicle.model}
          {vehicle.variant ? ` ${vehicle.variant}` : ""}
        </h2>
      </div>

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
                  {source.url}
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
