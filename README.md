# EV Compare

An open-source tool to compare electric vehicles across markets. Built with React, TypeScript, and Vite.

## Contributing data

Vehicle data lives in CSV files under `data/markets/` (e.g., `eu.csv`, `us.csv`). The columns are defined in `data/schema.json`.

To add or update vehicles:

1. Fork this repo
2. Edit (or create) the CSV for the relevant market in `data/markets/`
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


## License

[MIT](LICENSE)
