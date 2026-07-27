# Testing Strategy

## Unit tests

- Solar time-slot lookup and timezone conversion.
- Edge-cost calculation at boundary values.
- Graph snapping and path reconstruction.
- Cost aggregation equals displayed metrics.
- Mapbox token configuration fails clearly when absent.

## Property tests

- An edge with more direct radiation cannot receive a lower exposure cost when every other input is fixed.
- A route with equal edge costs reduces to fastest-time routing.
- A dominated route cannot win selection.
- Changing a departure time changes only the corresponding time-slot features.

## Integration tests

- Load a small fixture graph and route between known nodes.
- Render route cards for Fastest and Cooler choices.
- Simulate geocoder failure and missing shade data.
- Verify static artifact version matches UI metadata.

## Visual tests

Capture screenshots at desktop and mobile widths for morning, noon, afternoon, loading, no-route, and low-confidence states. Manually inspect route contrast against all supported base-map styles.

## Data tests

- CRS and units are consistent.
- All graph coordinates remain inside the study boundary.
- No null or negative edge duration/cost.
- Every source has provenance metadata.
