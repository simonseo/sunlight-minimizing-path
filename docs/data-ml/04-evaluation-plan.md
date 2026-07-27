# Offline Evaluation Plan

## Route corpus

Generate a fixed, reproducible set of origin-destination pairs within Santa Monica. Stratify by distance, direction, building density, tree cover, and proximity to the coast. Exclude invalid and inaccessible pairs before scoring.

## Conditions

Run every trip under at least these scenarios:

| Scenario | Departure times | Conditions |
|---|---|---|
| Clear summer morning | 09:00, 10:30 | High direct radiation |
| Clear summer midday | 12:00, 13:30 | Maximum overhead load |
| Clear summer afternoon | 15:00, 16:30 | Long west-facing shadows |
| Marine-layer day | 10:00, 13:00 | Lower direct radiation, higher cloud |

## Comparisons

Compare Fastest, orientation-only heuristic, static-shade heuristic, deterministic Cooler, and ML-approximated Cooler routes.

## Validations

- Route edges must form a connected legal walking path.
- Edge costs must aggregate to the displayed route cost.
- A dominated route is never selected over a strictly faster and cooler route.
- Increasing direct radiation cannot lower an exposed edge score.
- Selected routes must stay within the configured time-detour cap.

## Evidence package

For each run save summary metrics, route geometry, per-edge scores, scenario configuration, model version, and visual map snapshots. Publish aggregate findings, not raw location histories.
