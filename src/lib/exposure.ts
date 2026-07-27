import type { GraphEdge, WeatherScenario } from '../data/types';

function minutesAfterMidnight(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function solarIntensity(time: string) {
  const minutes = minutesAfterMidnight(time);
  const dawn = 420;
  const dusk = 1170;
  if (minutes <= dawn || minutes >= dusk) return 0;
  return Math.sin(((minutes - dawn) / (dusk - dawn)) * Math.PI);
}

export function edgeExposure(edge: GraphEdge, time: string, scenario: WeatherScenario) {
  const directSun = solarIntensity(time) * scenario.radiationMultiplier;
  const corridorOrientationPenalty = edge.id.startsWith('edge-e-') ? 0.08 : 0.03;
  const obstruction = Math.min(0.9, edge.treeCover * 0.62 + edge.buildingShade * 0.48);
  return Math.min(1, Math.max(0, directSun * (1 - obstruction + corridorOrientationPenalty)));
}

export function heatBurden(edge: GraphEdge, time: string, scenario: WeatherScenario) {
  return edge.minutes * edgeExposure(edge, time, scenario) * scenario.heatMultiplier;
}
