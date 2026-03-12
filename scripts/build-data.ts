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

  for (let i = 0; i < data.length; i++) {
    allErrors.push(...validate(data[i], i + 2, file));
  }

  if (allErrors.length === 0) {
    const parsed = data.map(parseRow);
    fs.writeFileSync(
      path.join(OUT_DIR, `${market}.json`),
      JSON.stringify(parsed, null, 2)
    );
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
