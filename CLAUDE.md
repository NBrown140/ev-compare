# EV Compare

A comparison tool for electric vehicles across markets (EU, US).

See [DESIGN.md](./DESIGN.md) for the design system. You must use it anytime you work on the UI.

## Adding Data

Vehicle data lives in CSV files under `data/markets/` (one per market). Each row is a vehicle variant with specs, pricing, and sourcing info.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide on:No
- CSV column format and naming conventions
- Source requirements (Wayback Machine archived URLs)
- Adding new markets
- Validation and CI checks
