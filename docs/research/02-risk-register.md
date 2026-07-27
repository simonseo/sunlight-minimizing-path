# Risk Register

| Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|
| Tree inventory is stale or lacks crown measurements | Medium | High | Validate against LiDAR canopy; label confidence; version snapshot | Data |
| LiDAR collection date differs from current streetscape | Medium | Medium | Document imagery date; avoid precise claims where changed | Data |
| OSM misses sidewalks/crossings | Medium | High | Constrain study area; inspect disconnected components; use conservative fallback | Routing |
| Palm canopy produces poor shade estimates | High | Medium | Use LiDAR crown geometry and create a palm-specific error slice | Data/ML |
| Marine layer makes radiation scenarios inaccurate | Medium | Medium | Use direct/diffuse radiation scenarios, not temperature-only scoring | Research |
| Mapbox public token is exposed or abused | Low | Medium | URL restrictions, usage alerts, prompt revocation/replacement | Engineering |
| Browser bundle is too large | Medium | Medium | Simplify graph, tile assets, lazy load, and keep source rasters offline | Web |
| ML result is weaker than geometry baseline | Medium | Low | Treat ML as optional research result; retain deterministic method | Data/ML |
| UI implies medical certainty | Medium | High | Use qualified language and methodology/limitations page | Product |

Review this register at the start and end of every milestone. A high-impact unresolved risk blocks publication of strong claims, not continued internal research.
