# Step-by-Step Implementation Roadmap

## Milestone 0 — Repository foundation

1. Scaffold the React/Vite/TypeScript app.
2. Add format, lint, type-check, and unit-test commands.
3. Add `.env.example`; verify `.env` is ignored.
4. Configure GitHub Actions for checks on pull requests.

**Exit:** A blank map page deploys to GitHub Pages without exposing credentials.

## Milestone 1 — Data foundation

1. Create a source-data manifest.
2. Download and checksum source snapshots.
3. Build normalized tree, building, and pedestrian datasets.
4. Produce basic coverage maps and data-quality reports.

**Exit:** Re-running the pipeline produces the same normalized outputs from the same inputs.

## Milestone 2 — Exposure baseline

1. Build the digital surface/canopy model.
2. Sample sidewalk geometry.
3. Calculate sun position and 15-minute shade values.
4. Generate edge costs for fixed weather scenarios.

**Exit:** Inspectable maps show plausible morning, midday, and afternoon shadow movement.

## Milestone 3 — Routing and research evaluation

1. Implement graph loading and A* route search.
2. Add Fastest and Cooler cost functions.
3. Generate the study-trip corpus.
4. Run baseline comparisons and record results.

**Exit:** The Cooler route passes all routing invariants and has quantified benefits/tradeoffs.

## Milestone 4 — Web experience

1. Add address search and graph snapping.
2. Build route cards and time/scenario controls.
3. Add exposure visualization and explanation panel.
4. Implement loading, error, and low-confidence states.

**Exit:** A researcher can complete the core flow without developer tools.

## Milestone 5 — ML experiment and release

1. Train/evaluate the ML shade approximation.
2. Decide whether to expose it only in results or use it as an optional comparison.
3. Run final visual and accessibility QA.
4. Publish methodology and known limitations.

**Exit:** A tagged research release includes reproducible artifacts and an evidence package.
