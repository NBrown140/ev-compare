# EV Compare

An open-source database and web application to compare electric vehicles across markets. Built with React, TypeScript, and Vite.

## Contributing data

Vehicle data lives in CSV files under `data/markets/` (e.g., `eu.csv`, `us.csv`). The columns are defined in `data/schema.json`.

To add or update vehicles:

1. Fork this repo
2. Edit (or create) the CSV for the relevant market in `data/markets/`. Add your sources to `data/markets/sources.json`.
3. Follow the column format in `data/schema.json` — run `pnpm run build:data` locally to validate
4. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines on column formats, ID conventions, and adding new markets.


## Running locally

**Prerequisites:** [Node.js](https://nodejs.org/) (v18+) and [pnpm](https://pnpm.io/)

```bash
# Install dependencies
pnpm install

# Build vehicle data from CSVs and start the dev server
pnpm run dev
```

Other commands:

```bash
pnpm run build:data   # validate CSVs and generate JSON
pnpm run build        # production build
pnpm run preview      # preview the production build
pnpm run lint         # run ESLint
```

### Archiving sources

Saving new pages requires Internet Archive API credentials (free at https://archive.org/account/s3.php):
```bash
export WAYBACK_ACCESS_KEY=your_access_key
export WAYBACK_SECRET_KEY=your_secret_key
```

All source URLs must point to real Wayback Machine snapshots. Use the archive script to verify and fix timestamps, or save pages that haven't been archived yet:

```bash
pnpm run check:sources                        # report which URLs are valid/broken
pnpm run fix:sources                          # save missing pages and fix timestamps
pnpm run fix:sources -- --market us           # process a single market
```


## License

[MIT](LICENSE)
