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
- **on_sale**: Set to `true` only if currently available for order
- **sources**: Add source URLs to `data/sources.json` keyed by vehicle `id`. Use Wayback Machine archived URLs (`https://web.archive.org/web/YYYYMMDD/<url>`) for permanence

### Adding a new market

1. Create a new CSV file in `data/markets/` (e.g., `cn.csv`)
2. Use the same column headers as existing files
3. Include at least 5 vehicles with accurate data

## Development

```bash
pnpm install
pnpm run build:data   # validate and build JSON from CSVs
pnpm run dev           # start dev server
```

## Validation

The build script validates all CSV data against the schema. Your PR will fail CI if:

- Required fields are missing
- Values don't match expected types or enums
- CSV parsing errors occur

Run `pnpm run build:data` locally to check before submitting.
