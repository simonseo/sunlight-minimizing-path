# Research Questions and Metrics

## Questions

1. Does time-aware routing reduce modeled direct-sun exposure compared with a fastest walking route?
2. How much added travel time is required to obtain that reduction?
3. Does a compact ML model approximate ray-traced shade closely enough to be useful for future city expansion?
4. Which environments create the largest model uncertainty: dense buildings, broad-canopy trees, palms, parks, or coastal paths?

## Primary metrics

| Metric | Definition | Target |
|---|---|---|
| Direct-sun reduction | `(fastest sun minutes - cooler sun minutes) / fastest sun minutes` | Median >= 15% on eligible trips |
| Time penalty | `(cooler ETA - fastest ETA) / fastest ETA` | Median <= 25% |
| Shade classification accuracy | Agreement of predicted sun/shade against held-out labels | >= 85% where labels exist |
| Route response time | Client calculation/rendering time | P95 < 2 seconds |

## Secondary metrics

- Fraction of requests where a useful Cooler alternative exists.
- Percentage of selected route samples with high-confidence geometry coverage.
- ML mean absolute error for shade fraction versus deterministic labels.
- Difference in route ranking between ML and deterministic shade costs.

## Reporting rules

- Segment-level values must aggregate exactly to route-level metrics.
- Report medians and distributions, not only best examples.
- Separate building shade, tree shade, and low-confidence samples in analysis.
- Do not infer user comfort, health outcomes, or behavior without a separate approved study.
