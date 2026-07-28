# Santa Monica Heat-Route Research Prototype

This directory is the planning source of truth for the research-only web prototype. The project tests whether a route that is less exposed to direct sunlight can be computed and clearly explained for pedestrians in Santa Monica.

## Reading order

1. Start with [the prototype charter](product/01-prototype-charter.md).
2. Read [the data-source decision](data-ml/01-data-sources.md) and [pipeline specification](data-ml/02-pipeline-spec.md).
3. Build from [the architecture](engineering/01-architecture.md) and [implementation roadmap](engineering/03-implementation-roadmap.md).
4. Use [the experiment protocol](research/01-experiment-protocol.md) and [evaluation plan](data-ml/04-evaluation-plan.md) before making research claims.

## Scope guardrails

- Santa Monica only; no expansion until the offline evaluation is complete.
- Browser-only prototype; no login, mobile app, or turn-by-turn navigation.
- Keep the geography/shade artifacts precomputed, but refresh local weather and measured radiation in the browser. Compute the selected time’s solar position from the current date, Santa Monica coordinate, and local timezone.
- Present a modeled exposure score, never a medical perspiration estimate.
- Keep credentials in the ignored local `.env` file; never place them in this directory.
