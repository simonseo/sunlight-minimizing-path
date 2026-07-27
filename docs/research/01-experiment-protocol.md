# Research Experiment Protocol

## Study object

The unit of analysis is a route request: origin, destination, departure time, weather scenario, and route-cost model version. It is not a person or a health outcome.

## Procedure

1. Freeze data sources and preprocessing configuration.
2. Generate the study-trip corpus with a seeded random generator and store it.
3. Run all candidate methods under each scenario.
4. Validate routes and exclude only predeclared invalid cases.
5. Compute aggregate metrics and uncertainty slices.
6. Inspect representative map outputs for geometry defects.
7. Publish methods, exclusions, and limitations with results.

## Baselines

- Fastest: shortest walking time on the same graph.
- Static shade: shade averaged across daylight hours.
- Orientation heuristic: penalize streets facing the afternoon sun.
- Deterministic Cooler: primary proposed approach.
- ML Cooler: experimental approximation only.

## Reproducibility package

Include a code tag, input manifest, environment lockfile, parameter configuration, seeded trip set, aggregate result tables, and artifact metadata. Keep raw data redistribution subject to each source license.

## Interpretation

The experiment supports only claims about modeled solar/heat exposure and route-time tradeoffs. It does not establish perspiration, comfort, health, user preference, or safety outcomes.
