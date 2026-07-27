# Prototype Charter

## Objective

Build a research demonstrator that compares the normal fastest walking route with a route designed to reduce modeled sunlight and heat exposure in Santa Monica.

## Primary hypothesis

For a meaningful set of short urban walking trips, a time-aware shade model can identify routes with lower cumulative direct-sun exposure while keeping the travel-time penalty below 25%.

## In scope

- City of Santa Monica, California.
- Walks of up to 30 minutes.
- Origin, destination, and departure-time input.
- Fastest and Cooler route comparison.
- Building- and tree-shade model sampled at 15-minute intervals.
- Cached weather conditions and selectable weather scenarios.
- A reproducible data pipeline and an optional ML approximation experiment.

## Out of scope

- Medical advice, sweat-volume predictions, or accessibility certification.
- Account creation, social features, native apps, and voice navigation.
- Nationwide coverage, live incident data, and continuous rerouting.
- Claims that the route is safer than alternatives.

## Success criteria

1. The application produces two valid, distinct walking-route options for the selected study trips.
2. The Cooler option reduces modeled direct-sun minutes or heat score by at least 15% versus Fastest for a predefined share of hot-day test requests.
3. Route results and their explanations render in under two seconds from static/local prototype assets.
4. Every numerical claim shown in the UI is traceable to a documented feature and calculation.

## Deliverable

A hosted research web application, versioned preprocessing code, versioned derived data artifacts, and a short results report. The prototype is successful even if the ML model fails, provided the deterministic baseline is evaluated honestly.
