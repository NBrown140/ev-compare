# Contributing to EV Compare

Thanks for helping keep EV data accurate and up to date!

## Adding or updating vehicle data

1. Fork this repo
2. Edit the CSV file for the relevant market in `data/markets/` (e.g., `de.csv`, `us.csv`)
3. Follow the column format defined in `data/schema.json`
4. Submit a pull request

### CSV guidelines

- **id**: Use the format `manufacturer-model-variant-year` in lowercase with hyphens (e.g., `tesla-model-3-lr-2025`)
- **price_local**: MSRP in local currency before incentives
- **range_km**: Official rated range in kilometers
- **range_rating**: `wltp` for European markets (DE, FR, NL, SE, BE, IT, UK), `epa` for North American markets (US, CA)
### Sources

Every CSV column (except `id`) must be backed by a source. Sources live in a JSON file alongside each market CSV (e.g., `us.sources.json` next to `us.csv`), keyed by vehicle `id`.

Each source entry needs:
- **url** — a Wayback Machine snapshot with a **real** archive timestamp. To create one:
  1. Go to `https://web.archive.org/save/<url>` and wait for the save to complete
  2. Copy the resulting URL — it will look like `https://web.archive.org/web/20250315123456/https://example.com`
  3. The timestamp must correspond to an actual snapshot, not an arbitrary date
- **date_viewed** — the date you viewed the source page, in `YYYY-MM-DD` format (e.g. `"2025-03-17"`)
- **fields** — which CSV columns this source covers

You can verify and fix timestamps in bulk with:
```bash
pnpm run check:sources                        # report status without changes
pnpm run fix:sources                          # save missing pages and fix timestamps
pnpm run fix:sources -- --market us           # process a single market
```

To save new pages, you need Internet Archive API credentials (free at https://archive.org/account/s3.php):
```bash
export WAYBACK_ACCESS_KEY=your_access_key
export WAYBACK_SECRET_KEY=your_secret_key
```

When data comes from multiple sources, add multiple entries and split the fields between them. The build will fail if any populated column is missing from all sources.

```json
{
  "tesla-model-3-lr-2025": [
    {
      "url": "https://web.archive.org/web/20250315123456/https://www.tesla.com/model3",
      "date_viewed": "2025-03-15",
      "fields": ["manufacturer", "model", "price_local", "range_km", "..."]
    }
  ]
}
```

### Adding a new market

1. Create a new CSV file in `data/markets/` (e.g., `jp.csv`)
2. Create a matching sources file (e.g., `jp.sources.json`)
3. Use the same column headers as existing files
4. Include at least 5 vehicles with accurate data

## Useful Data Sources

When researching EV specs, the following sources are generally reliable. Always cross-reference multiple sources and archive the URL via the Wayback Machine before adding it.

### Primary sources (prefer these)

- **Official manufacturer websites** — best for MSRP, range, battery, drivetrain, and dimensions (e.g., tesla.com/model3, hyundai.com/ioniq-5)
- **EPA / WLTP official filings** — authoritative for range and efficiency ratings
  - US EPA: [fueleconomy.gov](https://fueleconomy.gov)
  - EU WLTP: typically published via manufacturer spec sheets

### Aggregators and databases

- **[ev-database.org](https://ev-database.org)** — comprehensive European-focused database with WLTP range, charging curves, and efficiency data
- **[ev-specifications.com](https://ev-specifications.com)** — detailed specs including dimensions, weight, and performance
- **[insideevs.com](https://insideevs.com)** — news and specs, useful for US pricing and real-world range tests
- **[pushevs.com](https://pushevs.com)** — battery chemistry breakdowns and charging details
- **[Wikipedia](https://en.wikipedia.org)** — good overview articles with sourced specs for most EV models

### Charging-specific

- **[fastned.nl/en/blog](https://fastned.nl/en/blog)** — real-world charging curve tests
- **[electrek.co](https://electrek.co)** — news and pricing updates, especially for the US market

### Pricing

- **Official configurators** — always the best source for current MSRP
- **[carwow.co.uk](https://www.carwow.co.uk)** / **[carwow.de](https://www.carwow.de)** — EU pricing comparisons
- **[edmunds.com](https://www.edmunds.com)** — US pricing and incentives

## Adding or updating incentives

Government incentives live in YAML files under `data/incentives/{market}/` (e.g., `data/incentives/us/federal.yaml`). Each file describes one incentive program.

### Incentive file format

```yaml
id: us-federal-ira                # unique across all incentive files
name: "Federal Clean Vehicle Tax Credit"
market: us                        # must match the parent directory
region: federal                   # "federal" or a sub-region code (e.g., "ca", "qc")
region_label: "Federal"           # human-readable label shown in the UI
currency: USD
effective_date: "2024-01-01"
expiry_date: null                 # null = ongoing, or "YYYY-MM-DD"
source: "https://example.gov/ev-incentive" # URL to the official program page
disclaimer: "Amount depends on..."        # optional, shown in the UI

# Rules are evaluated top-to-bottom; first match wins. No match = $0.
rules:
  - amount: 7500
    conditions:
      price_local_max: 55000
      segments: [sedan, hatchback]
  - amount: 7500
    conditions:
      price_local_max: 80000
      segments: [suv, truck, crossover, van]
```

### Supported condition fields

| Field | Type | Meaning |
|---|---|---|
| `price_local_max` | number | Vehicle MSRP must be <= this value |
| `price_local_min` | number | Vehicle MSRP must be >= this value |
| `segments` | string[] | Vehicle segment must be in this list |
| `model_years` | number[] | Vehicle model year must be in this list |
| `battery_capacity_kwh_min` | number | Battery capacity must be >= this value |

Conditions within a rule are AND'd. A rule with no conditions matches all vehicles.

### Adding a new incentive

1. Create a YAML file in `data/incentives/{market}/` (e.g., `data/incentives/ca/qc-roulez-vert.yaml`)
2. Follow the format above
3. Include a source URL linking to the official program page
4. Run `pnpm run build:data` to validate

## Validating the schema locally

This is not absolutely required as it will be validated in the CI, but it allows finding schema errors faster.

```bash
pnpm install
pnpm run build:data   # validate and build JSON from CSVs
```

## Validation

The build script validates all CSV data against the schema. Your PR will fail CI if:

- Required fields are missing
- Values don't match expected types or enums
- CSV parsing errors occur
- A vehicle is missing sources, or a populated column has no source covering it
- Archived URLs are not Wayback Machine links

Run `pnpm run build:data` locally to check before submitting.
