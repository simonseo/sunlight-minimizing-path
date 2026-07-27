# Shade ML Experiment

## Purpose

Test whether a lightweight model can approximate the deterministic shade baseline without compromising route selection. This is an experiment, not a production dependency.

## Label

`shade_fraction` from the precomputed geometric/ray-traced baseline at a sidewalk sample and time slot.

## Features

- Solar azimuth and elevation.
- Sidewalk bearing and local slope.
- Distance and height statistics of nearby building surfaces.
- Canopy height, canopy density, and distance to tree inventory points.
- Street width/right-of-way proxy where available.
- Spatial grid identifier for grouped validation only, not as a shortcut feature.

## Candidate model

Start with LightGBM regression. It is fast, interpretable enough for feature importance, and suitable for mixed numeric geospatial features. Compare to a simple logistic baseline for sun-versus-shade classification.

## Split strategy

Never use a random row split alone. Hold out contiguous spatial blocks and time windows so near-duplicate sidewalk samples cannot leak between train and test sets.

## Acceptance criteria

- Shade-fraction MAE <= 0.15 on held-out blocks.
- Sun/shade classification accuracy >= 85%.
- At least 90% agreement with deterministic route ranking on the study-trip set.
- Clear failure analysis by tree type and street context.

## Decision

If criteria are not met, ship only the deterministic precomputed shade layer and document the ML result. The prototype remains valid.
