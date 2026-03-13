# Contributing to EV Compare

Thanks for helping keep EV data accurate and up to date!

## Adding or updating vehicle data

1. Fork this repo
2. Edit the CSV file for the relevant market in `data/markets/` (e.g., `eu.csv`, `us.csv`)
3. Follow the column format defined in `data/schema.json`
4. Submit a pull request

### CSV guidelines

- **id**: Use the format `manufacturer-model-variant-year` in lowercase with hyphens (e.g., `tesla-model-3-lr-2025`)
- **price_local**: MSRP in local currency before incentives
- **range_km**: Official rated range in kilometers
- **range_rating**: `wltp` for EU, `epa` for US
### Sources

Every CSV column (except `id`) must be backed by a source. Sources live in a JSON file alongside each market CSV (e.g., `us.sources.json` next to `us.csv`), keyed by vehicle `id`.

Each source entry needs:
- **url** — a Wayback Machine snapshot (`https://web.archive.org/web/YYYYMMDD/<url>`). You can create one at `https://web.archive.org/save/<url>`
- **fields** — which CSV columns this source covers

When data comes from multiple sources, add multiple entries and split the fields between them. The build will fail if any populated column is missing from all sources.

```json
{
  "tesla-model-3-lr-2025": [
    {
      "url": "https://web.archive.org/web/20250301/https://www.tesla.com/model3",
      "fields": ["manufacturer", "model", "price_local", "range_km", "..."]
    }
  ]
}
```

### Adding a new market

1. Create a new CSV file in `data/markets/` (e.g., `cn.csv`)
2. Create a matching sources file (e.g., `cn.sources.json`)
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
