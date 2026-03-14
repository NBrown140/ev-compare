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
  fields: string[];
}

type SourcesMap = Record<string, Source[]>;


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

// Columns that don't need a source (derived, not sourced data)
const SOURCE_EXEMPT_FIELDS = new Set(["id"]);

function validateSources(
  sources: SourcesMap,
  vehicleRows: Map<string, Record<string, string>>,
  file: string
): string[] {
  const errors: string[] = [];
  const colNames = schema.columns.map((c) => c.name);

  for (const [id, entries] of Object.entries(sources)) {
    if (!Array.isArray(entries) || entries.length === 0) {
      errors.push(`${file}: "${id}" must have at least one source entry`);
      continue;
    }

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const loc = `${file}: "${id}"[${i}]`;

      if (!entry.url || typeof entry.url !== "string") {
        errors.push(`${loc} — missing or invalid "url"`);
      } else if (!entry.url.startsWith(WAYBACK_PREFIX)) {
        errors.push(
          `${loc} — "url" must be a Wayback Machine URL (start with ${WAYBACK_PREFIX})`
        );
      }

      if (!Array.isArray(entry.fields) || entry.fields.length === 0) {
        errors.push(`${loc} — "fields" is required and must list at least one column`);
      } else {
        for (const f of entry.fields) {
          if (!colNames.includes(f)) {
            errors.push(`${loc} — unknown field "${f}" in "fields"`);
          }
        }
      }
    }
  }

  // Check for orphaned source entries (not in CSV)
  for (const id of Object.keys(sources)) {
    if (!vehicleRows.has(id)) {
      errors.push(`${file}: source entry "${id}" does not match any vehicle in the CSV`);
    }
  }

  // Check that every vehicle in the CSV has sources
  // and that every populated column is covered by at least one source
  for (const [id, row] of vehicleRows) {
    if (!sources[id]) {
      errors.push(`${file}: missing sources for vehicle "${id}"`);
      continue;
    }

    // Collect all fields covered by sources for this vehicle
    const coveredFields = new Set<string>();
    for (const entry of sources[id]) {
      if (Array.isArray(entry.fields)) {
        for (const f of entry.fields) coveredFields.add(f);
      }
    }

    // Check that every populated column has a source
    for (const col of schema.columns) {
      if (SOURCE_EXEMPT_FIELDS.has(col.name)) continue;
      const val = row[col.name]?.trim() ?? "";
      if (val !== "" && !coveredFields.has(col.name)) {
        errors.push(
          `${file}: "${id}" — column "${col.name}" has a value but no source covers it`
        );
      }
    }
  }

  return errors;
}

// Expected range rating per market
const MARKET_RANGE_RATING: Record<string, string> = {
  eu: "wltp",
  us: "epa",
};

// Main
fs.mkdirSync(OUT_DIR, { recursive: true });
const allErrors: string[] = [];
const markets: string[] = [];

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

  const vehicleRows = new Map<string, Record<string, string>>();
  for (let i = 0; i < data.length; i++) {
    allErrors.push(...validate(data[i], i + 2, file));

    // Enforce market-specific range rating
    const expectedRating = MARKET_RANGE_RATING[market];
    const actualRating = data[i].range_rating?.trim();
    if (expectedRating && actualRating && actualRating !== expectedRating) {
      allErrors.push(
        `${file}:${i + 2} — range_rating must be "${expectedRating}" for market "${market}", got "${actualRating}"`
      );
    }

    const id = data[i].id?.trim();
    if (id) vehicleRows.set(id, data[i]);
  }

  // Validate sources for this market
  const sourcesFile = `${market}.sources.json`;
  const sourcesPath = path.join(MARKETS_DIR, sourcesFile);
  let sources: SourcesMap | null = null;
  if (!fs.existsSync(sourcesPath)) {
    allErrors.push(`${sourcesFile}: file not found (expected alongside ${file})`);
  } else {
    sources = JSON.parse(
      fs.readFileSync(sourcesPath, "utf-8")
    );
    allErrors.push(...validateSources(sources!, vehicleRows, sourcesFile));
  }

  if (allErrors.length === 0) {
    const parsed = data.map(parseRow);
    fs.writeFileSync(
      path.join(OUT_DIR, `${market}.json`),
      JSON.stringify(parsed, null, 2)
    );
    if (sources) {
      fs.writeFileSync(
        path.join(OUT_DIR, `${market}.sources.json`),
        JSON.stringify(sources, null, 2)
      );
    }
  }
}

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
