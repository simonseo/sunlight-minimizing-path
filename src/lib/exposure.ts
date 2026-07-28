import type { ExposureConditions, GraphEdge } from '../data/types';

function minutesAfterMidnight(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

export function solarIntensity(time: string, solarElevationDegrees?: number) {
  if (solarElevationDegrees !== undefined) return Math.max(0, Math.sin((solarElevationDegrees * Math.PI) / 180));
  const minutes = minutesAfterMidnight(time);
  const dawn = 420;
  const dusk = 1170;
  if (minutes <= dawn || minutes >= dusk) return 0;
  return Math.sin(((minutes - dawn) / (dusk - dawn)) * Math.PI);
}

export function edgeExposure(edge: GraphEdge, time: string, conditions: ExposureConditions) {
  const directSun = solarIntensity(time, conditions.solarElevationDegrees) * conditions.radiationMultiplier;
  const corridorOrientationPenalty = edge.id.startsWith('edge-e-') ? 0.08 : 0.03;
  const staticObstruction = Math.min(0.9, edge.treeCover * 0.62 + edge.buildingShade * 0.48);
  const lidarObstruction = conditions.lidarOcclusionByEdge?.get(edge.id);
  const obstruction = lidarObstruction === undefined ? staticObstruction : Math.max(staticObstruction, lidarObstruction);
  return Math.min(1, Math.max(0, directSun * (1 - obstruction + corridorOrientationPenalty)));
}

export function heatBurden(edge: GraphEdge, time: string, conditions: ExposureConditions) {
  return edge.minutes * edgeExposure(edge, time, conditions) * conditions.heatMultiplier;
}
