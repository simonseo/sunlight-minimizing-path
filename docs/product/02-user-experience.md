# User Experience Specification

## Core flow

1. User enters an origin and destination using Mapbox Search Box.
2. User selects `Leave now` or a departure time from the same day.
3. User sees Fastest and Cooler route cards on the map.
4. User selects either card to highlight its path and inspect the exposure explanation.

## Main screen

The visual language should make heat legible without looking alarming:

- A muted base map preserves geographic context.
- A translucent blue-to-amber layer communicates low-to-high modeled sun exposure.
- Fastest is neutral charcoal; Cooler is deep teal.
- The selected route is thicker and receives a subtle animated sun/shade treatment.
- A time slider previews changing shade over the study window.

## Route card fields

| Field | Fastest | Cooler |
|---|---|---|
| ETA | Required | Required |
| Distance | Required | Required |
| Modeled direct-sun minutes | Required | Required |
| Relative heat score | Required | Required |
| Time tradeoff | N/A | Required |
| Data confidence | Required | Required |

## Explanation copy

Use plain, qualified language: `This route is modeled to spend 8 fewer minutes in direct sun, with an estimated 4-minute longer walk.` Do not say `This route prevents perspiration` or `This route is medically safer.`

## Empty and failure states

- No route: explain that the trip is outside the Santa Monica research area.
- Low confidence: display the route, label the limitation, and avoid an exact percentage claim.
- No weather scenario: default to `Typical sunny afternoon` and disclose it.
- Geocoder failure: retain typed values and offer a retry state.

## Accessibility

- Meet WCAG AA contrast for text and route colors.
- Do not rely on color alone; all route cards include text metrics.
- Keyboard access supports origin, destination, time selection, and route selection.
- Respect reduced-motion preferences by disabling animated overlays.
