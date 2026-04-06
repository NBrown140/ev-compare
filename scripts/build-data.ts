import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import YAML from "yaml";

const ROOT = path.resolve(import.meta.dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const MARKETS_DIR = path.join(DATA_DIR, "markets");
const INCENTIVES_DIR = path.join(DATA_DIR, "incentives");
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
  date_viewed: string;
  fields: string[];
}

type SourcesMap = Record<string, Source[]>;

function validateHeaders(headers: string[] | undefined, file: string): string[] {
  if (!headers) {
    return [`${file}: missing header row`];
  }

  const errors: string[] = [];
  const expectedHeaders = schema.columns.map((col) => col.name);
  const missing = expectedHeaders.filter((header) => !headers.includes(header));
  const unexpected = headers.filter((header) => !expectedHeaders.includes(header));

  if (missing.length > 0) {
    errors.push(`${file}: missing columns [${missing.join(", ")}]`);
  }

  if (unexpected.length > 0) {
    errors.push(`${file}: unexpected columns [${unexpected.join(", ")}]`);
  }

  if (missing.length === 0 && unexpected.length === 0) {
    const orderMismatch = headers.some((header, index) => header !== expectedHeaders[index]);
    if (orderMismatch) {
      errors.push(`${file}: column order must match data/schema.json exactly`);
    }
  }

  return errors;
}

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

      if (!entry.date_viewed || typeof entry.date_viewed !== "string") {
        errors.push(`${loc} — missing or invalid "date_viewed"`);
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date_viewed)) {
        errors.push(`${loc} — "date_viewed" must be in YYYY-MM-DD format, got "${entry.date_viewed}"`);
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
  be: "wltp",
  ca: "epa",
  de: "wltp",
  fr: "wltp",
  it: "wltp",
  nl: "wltp",
  se: "wltp",
  uk: "wltp",
  us: "epa",
};

// Main
interface MarketSummary {
  vehicleCount: number;
  manufacturerCount: number;
  segments: string[];
}

fs.mkdirSync(OUT_DIR, { recursive: true });
const allErrors: string[] = [];
const markets: string[] = [];
const summaries: Record<string, MarketSummary> = {};

const csvFiles = fs
  .readdirSync(MARKETS_DIR)
  .filter((f) => f.endsWith(".csv"))
  .sort();

for (const file of csvFiles) {
  const market = path.basename(file, ".csv");
  markets.push(market);

  const csv = fs.readFileSync(path.join(MARKETS_DIR, file), "utf-8");
  const { data, errors, meta } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  allErrors.push(...validateHeaders(meta.fields, file));

  if (errors.length > 0) {
    for (const e of errors) {
      allErrors.push(`${file}:${e.row} — parse error: ${e.message}`);
    }
  }

  const vehicleRows = new Map<string, Record<string, string>>();
  const seenIds = new Map<string, number>();
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
    if (!id) continue;

    const previousRow = seenIds.get(id);
    if (previousRow != null) {
      allErrors.push(
        `${file}:${i + 2} — duplicate id "${id}" (first seen at row ${previousRow})`
      );
      continue;
    }

    seenIds.set(id, i + 2);
    vehicleRows.set(id, data[i]);
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

    // Compute summary stats for the home page
    const manufacturers = new Set<string>();
    const segments = new Set<string>();
    for (const row of parsed) {
      const r = row as Record<string, unknown>;
      if (r.manufacturer) manufacturers.add(r.manufacturer as string);
      if (r.segment) segments.add(r.segment as string);
    }
    summaries[market] = {
      vehicleCount: parsed.length,
      manufacturerCount: manufacturers.size,
      segments: [...segments].sort(),
    };
  }
}

if (allErrors.length > 0) {
  console.error("Validation errors:");
  for (const e of allErrors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

fs.writeFileSync(
  path.join(OUT_DIR, "markets.json"),
  JSON.stringify(summaries, null, 2)
);

// --- Incentives ---

interface IncentiveRule {
  amount: number;
  conditions: Record<string, unknown>;
}

interface IncentiveFile {
  id: string;
  name: string;
  market: string;
  region: string;
  region_label: string;
  level: string;
  currency: string;
  effective_date: string;
  expiry_date?: string | null;
  source: string;
  description?: string;
  disclaimer?: string;
  rules: IncentiveRule[];
}

interface IncentiveOutput {
  regions: Record<string, {
    label: string;
    level: string;
    programs: { id: string; name: string; description?: string; disclaimer?: string; source: string }[];
  }>;
  vehicles: Record<string, Record<string, Record<string, number>>>;
}

const VALID_CONDITION_FIELDS = new Set([
  "price_local_max",
  "price_local_min",
  "segments",
  "model_years",
  "battery_capacity_kwh_min",
]);

const REQUIRED_INCENTIVE_FIELDS = [
  "id", "name", "market", "region", "region_label", "level",
  "currency", "effective_date", "source", "rules",
] as const;

function validateIncentiveFile(
  inc: IncentiveFile,
  expectedMarket: string,
  filePath: string
): string[] {
  const errors: string[] = [];

  for (const field of REQUIRED_INCENTIVE_FIELDS) {
    if (inc[field] == null || inc[field] === "") {
      errors.push(`${filePath}: missing required field "${field}"`);
    }
  }

  if (inc.market && inc.market !== expectedMarket) {
    errors.push(
      `${filePath}: "market" is "${inc.market}" but file is in "${expectedMarket}/" directory`
    );
  }

  if (inc.source && !inc.source.startsWith("https://")) {
    errors.push(`${filePath}: "source" must be an HTTPS URL`);
  }

  if (!Array.isArray(inc.rules) || inc.rules.length === 0) {
    errors.push(`${filePath}: "rules" must be a non-empty array`);
  } else {
    for (let i = 0; i < inc.rules.length; i++) {
      const rule = inc.rules[i];
      if (typeof rule.amount !== "number") {
        errors.push(`${filePath}: rules[${i}].amount must be a number`);
      }
      if (rule.conditions) {
        for (const key of Object.keys(rule.conditions)) {
          if (!VALID_CONDITION_FIELDS.has(key)) {
            errors.push(`${filePath}: rules[${i}] unknown condition "${key}"`);
          }
        }
      }
    }
  }

  return errors;
}

function evaluateIncentive(
  vehicle: Record<string, unknown>,
  rules: IncentiveRule[]
): number {
  for (const rule of rules) {
    if (!rule.conditions || Object.keys(rule.conditions).length === 0) {
      return rule.amount;
    }

    let match = true;
    const cond = rule.conditions;

    if (cond.price_local_max != null) {
      if ((vehicle.price_local as number) > (cond.price_local_max as number)) match = false;
    }
    if (cond.price_local_min != null) {
      if ((vehicle.price_local as number) < (cond.price_local_min as number)) match = false;
    }
    if (cond.segments != null) {
      if (!(cond.segments as string[]).includes(vehicle.segment as string)) match = false;
    }
    if (cond.model_years != null) {
      if (!(cond.model_years as number[]).includes(vehicle.model_year as number)) match = false;
    }
    if (cond.battery_capacity_kwh_min != null) {
      if ((vehicle.battery_capacity_kwh as number) < (cond.battery_capacity_kwh_min as number)) match = false;
    }

    if (match) return rule.amount;
  }
  return 0;
}

// Process incentive YAML files per market
const incentiveErrors: string[] = [];
const seenIncentiveIds = new Set<string>();

if (fs.existsSync(INCENTIVES_DIR)) {
  const marketDirs = fs.readdirSync(INCENTIVES_DIR).filter((d) => {
    const full = path.join(INCENTIVES_DIR, d);
    return fs.statSync(full).isDirectory();
  });

  for (const marketDir of marketDirs) {
    const yamlFiles = fs
      .readdirSync(path.join(INCENTIVES_DIR, marketDir))
      .filter((f) => f.endsWith(".yaml") || f.endsWith(".yml"))
      .sort();

    if (yamlFiles.length === 0) continue;

    const incentives: IncentiveFile[] = [];

    for (const file of yamlFiles) {
      const filePath = path.join("data/incentives", marketDir, file);
      const raw = fs.readFileSync(path.join(INCENTIVES_DIR, marketDir, file), "utf-8");
      const parsed = YAML.parse(raw) as IncentiveFile;

      incentiveErrors.push(...validateIncentiveFile(parsed, marketDir, filePath));

      if (parsed.id) {
        if (seenIncentiveIds.has(parsed.id)) {
          incentiveErrors.push(`${filePath}: duplicate incentive id "${parsed.id}"`);
        }
        seenIncentiveIds.add(parsed.id);
      }

      incentives.push(parsed);
    }

    if (incentiveErrors.length > 0) continue;

    // Build output for this market
    const output: IncentiveOutput = { regions: {}, vehicles: {} };

    // Sort so Federal-level regions come first, then alphabetically by level/region
    incentives.sort((a, b) => {
      if (a.level === b.level) return a.region.localeCompare(b.region);
      if (a.level === "Federal") return -1;
      if (b.level === "Federal") return 1;
      return a.level.localeCompare(b.level);
    });

    // Filter out expired or not-yet-effective programs
    const today = new Date().toISOString().slice(0, 10);
    const activeIncentives = incentives.filter((inc) => {
      if (inc.effective_date && inc.effective_date > today) return false;
      if (inc.expiry_date && inc.expiry_date < today) return false;
      return true;
    });

    for (const inc of activeIncentives) {
      if (!output.regions[inc.region]) {
        output.regions[inc.region] = { label: inc.region_label, level: inc.level, programs: [] };
      }
      output.regions[inc.region].programs.push({
        id: inc.id,
        name: inc.name,
        source: inc.source,
        ...(inc.description ? { description: inc.description } : {}),
        ...(inc.disclaimer ? { disclaimer: inc.disclaimer } : {}),
      });
    }

    // Load parsed vehicle data for this market
    const vehicleJsonPath = path.join(OUT_DIR, `${marketDir}.json`);
    if (!fs.existsSync(vehicleJsonPath)) continue;

    const vehicles = JSON.parse(
      fs.readFileSync(vehicleJsonPath, "utf-8")
    ) as Record<string, unknown>[];

    for (const vehicle of vehicles) {
      const id = vehicle.id as string;
      if (!id) continue;

      const vehicleIncentives: Record<string, Record<string, number>> = {};

      for (const inc of activeIncentives) {
        const amount = evaluateIncentive(vehicle, inc.rules);
        if (!vehicleIncentives[inc.region]) {
          vehicleIncentives[inc.region] = {};
        }
        vehicleIncentives[inc.region][inc.id] = amount;
      }

      output.vehicles[id] = vehicleIncentives;
    }

    fs.writeFileSync(
      path.join(OUT_DIR, `${marketDir}.incentives.json`),
      JSON.stringify(output, null, 2)
    );
  }
}

if (incentiveErrors.length > 0) {
  console.error("Incentive validation errors:");
  for (const e of incentiveErrors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

console.log(
  `✓ Built ${csvFiles.length} market(s): ${markets.join(", ")} → src/data/generated/`
);
