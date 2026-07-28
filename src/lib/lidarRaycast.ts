import type { LidarSurfaceGrid } from '../data/lidarSurface';
import type { Coordinate, SolarPosition, StudyGraph } from '../data/types';
import { webMercator } from '../data/lidarSurface';

const WALKER_EYE_HEIGHT_METERS = 1.65;
const MAX_RAY_DISTANCE_METERS = 180;

export function surfaceOccludesSun(coordinate: Coordinate, grid: LidarSurfaceGrid, sun: SolarPosition) {
  if (sun.elevationDegrees <= 0) return true;
  const startElevation = grid.elevationAt(coordinate);
  if (!startElevation) return false;
  const [originX, originY] = webMercator(coordinate);
  const azimuth = (sun.azimuthDegrees * Math.PI) / 180;
  const east = Math.sin(azimuth);
  const north = Math.cos(azimuth);
  const elevationSlope = Math.tan((sun.elevationDegrees * Math.PI) / 180);
  for (let distance = grid.resolutionMeters; distance <= MAX_RAY_DISTANCE_METERS; distance += grid.resolutionMeters) {
    const sample = grid.elevationAtMercator(originX + east * distance, originY + north * distance);
    if (!sample) continue;
    const rayHeight = startElevation.ground + WALKER_EYE_HEIGHT_METERS + distance * elevationSlope;
    if (sample.surface > rayHeight + 0.5) return true;
  }
  return false;
}

function edgeSamplePoints(fromId: string, toId: string, nodes: Map<string, Coordinate>) {
  const from = nodes.get(fromId);
  const to = nodes.get(toId);
  if (!from || !to) return [];
  return [0.25, 0.5, 0.75].map((fraction) => [
    from[0] + (to[0] - from[0]) * fraction,
    from[1] + (to[1] - from[1]) * fraction,
  ] as Coordinate);
}

/** Returns the fraction of each walking edge occluded by the LiDAR surface along the sun ray. */
export function raycastGraphOcclusion(graph: StudyGraph, grid: LidarSurfaceGrid, sun: SolarPosition) {
  const nodes = new Map(graph.nodes.map((node) => [node.id, node.coordinate]));
  const occlusion = new Map<string, number>();
  for (const edge of graph.edges) {
    const samples = edgeSamplePoints(edge.from, edge.to, nodes);
    if (samples.length === 0) continue;
    const blocked = samples.filter((coordinate) => surfaceOccludesSun(coordinate, grid, sun)).length;
    occlusion.set(edge.id, blocked / samples.length);
  }
  return occlusion;
}
