import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const MARKETS_DIR = path.join(DATA_DIR, "markets");
const OUT_DIR = path.join(ROOT, "src", "data", "generated");

interface Column {
  name: string;
  type: "string" | "int" | "number" | "bool" | "enum";
  required: boolean;
  values?: string[];
}

const schema: { columns: Column[] } = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "schema.json"), "utf-8")
);

interface Source {
  url: string;
  archived_url: string;
  accessed: string;
  fields?: string[];
}

type SourcesMap = Record<string, Source[]>;

const sources: SourcesMap = JSON.parse(
  fs.readFileSync(path.join(DATA_DIR, "sources.json"), "utf-8")
);

function validate(
  row: Record<string, string>,
  rowIndex: number,
  file: string
): string[] {
  const errors: string[] = [];
  for (const col of schema.columns) {
    const val = row[col.name]?.trim() ?? "";
    if (col.required && val === "") {
      errors.push(`${file}:${rowIndex} — missing required field "${col.name}"`);
      continue;
    }
    if (val === "") continue;

    switch (col.type) {
      case "int":
        if (!/^-?\d+$/.test(val))
          errors.push(
            `${file}:${rowIndex} — "${col.name}" must be an integer, got "${val}"`
          );
        break;
      case "number":
        if (isNaN(Number(val)))
          errors.push(
            `${file}:${rowIndex} — "${col.name}" must be a number, got "${val}"`
          );
        break;
      case "bool":
        if (!["true", "false"].includes(val))
          errors.push(
            `${file}:${rowIndex} — "${col.name}" must be true/false, got "${val}"`
          );
        break;
      case "enum":
        if (col.values && !col.values.includes(val))
          errors.push(
            `${file}:${rowIndex} — "${col.name}" must be one of [${col.values.join(", ")}], got "${val}"`
          );
        break;
    }
  }
  return errors;
}

function parseRow(row: Record<string, string>) {
  const out: Record<string, unknown> = {};
  for (const col of schema.columns) {
    const val = row[col.name]?.trim() ?? "";
    if (val === "") {
      out[col.name] = null;
      continue;
    }
    switch (col.type) {
      case "int":
        out[col.name] = parseInt(val, 10);
        break;
      case "number":
        out[col.name] = parseFloat(val);
        break;
      case "bool":
        out[col.name] = val === "true";
        break;
      default:
        out[col.name] = val;
    }
  }
  // Computed metrics
  const price = out.price_local as number;
  const range = out.range_km as number;
  const battery = out.battery_capacity_kwh as number;
  if (price && range) out.price_per_range_km = Math.round((price / range) * 100) / 100;
  if (price && battery) out.price_per_kwh = Math.round((price / battery) * 100) / 100;
  return out;
}

const WAYBACK_PREFIX = "https://web.archive.org/web/";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateSources(
  sources: SourcesMap,
  allVehicleIds: Set<string>
): string[] {
  const errors: string[] = [];

  for (const [id, entries] of Object.entries(sources)) {
    if (!Array.isArray(entries) || entries.length === 0) {
      errors.push(`sources.json: "${id}" must have at least one source entry`);
      continue;
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const loc = `sources.json: "${id}"[${i}]`;

      if (!entry.url || typeof entry.url !== "string") {
        errors.push(`${loc} — missing or invalid "url"`);
      }

      if (!entry.archived_url || typeof entry.archived_url !== "string") {
        errors.push(`${loc} — missing or invalid "archived_url"`);
      } else if (!entry.archived_url.startsWith(WAYBACK_PREFIX)) {
        errors.push(
          `${loc} — "archived_url" must be a Wayback Machine URL (start with ${WAYBACK_PREFIX})`
        );
      }

      if (!entry.accessed || typeof entry.accessed !== "string") {
        errors.push(`${loc} — missing or invalid "accessed"`);
      } else if (!DATE_RE.test(entry.accessed)) {
        errors.push(`${loc} — "accessed" must be YYYY-MM-DD, got "${entry.accessed}"`);
      }

      if (entry.fields !== undefined) {
        if (!Array.isArray(entry.fields)) {
          errors.push(`${loc} — "fields" must be an array of strings`);
        } else {
          const colNames = schema.columns.map((c) => c.name);
          for (const f of entry.fields) {
            if (!colNames.includes(f)) {
              errors.push(`${loc} — unknown field "${f}" in "fields"`);
            }
          }
        }
      }
    }
  }

  // Check that every vehicle in the CSVs has sources
  for (const id of allVehicleIds) {
    if (!sources[id]) {
      errors.push(`sources.json: missing sources for vehicle "${id}"`);
    }
  }

  return errors;
}

// Main
fs.mkdirSync(OUT_DIR, { recursive: true });
const allErrors: string[] = [];
const markets: string[] = [];
const allVehicleIds = new Set<string>();

const csvFiles = fs
  .readdirSync(MARKETS_DIR)
  .filter((f) => f.endsWith(".csv"))
  .sort();

for (const file of csvFiles) {
  const market = path.basename(file, ".csv");
  markets.push(market);

  const csv = fs.readFileSync(path.join(MARKETS_DIR, file), "utf-8");
  const { data, errors } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  if (errors.length > 0) {
    for (const e of errors) {
      allErrors.push(`${file}:${e.row} — parse error: ${e.message}`);
    }
  }

  for (let i = 0; i < data.length; i++) {
    allErrors.push(...validate(data[i], i + 2, file));
    const id = data[i].id?.trim();
    if (id) allVehicleIds.add(id);
  }

  if (allErrors.length === 0) {
    const parsed = data.map(parseRow);
    fs.writeFileSync(
      path.join(OUT_DIR, `${market}.json`),
      JSON.stringify(parsed, null, 2)
    );
  }
}

// Validate sources
allErrors.push(...validateSources(sources, allVehicleIds));

if (allErrors.length > 0) {
  console.error("Validation errors:");
  for (const e of allErrors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

fs.writeFileSync(
  path.join(OUT_DIR, "markets.json"),
  JSON.stringify(markets, null, 2)
);

console.log(
  `✓ Built ${csvFiles.length} market(s): ${markets.join(", ")} → src/data/generated/`
);
