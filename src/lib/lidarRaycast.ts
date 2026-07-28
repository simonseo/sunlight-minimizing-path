import type { LidarSurfaceGrid } from '../data/lidarSurface';
import type { Coordinate, SolarPosition, StudyGraph } from '../data/types';
import { webMercator } from '../data/lidarSurface';

const WALKER_EYE_HEIGHT_METERS = 1.65;
const MAX_RAY_DISTANCE_METERS = 180;

export function surfaceOccludesSun(coordinate: Coordinate, grid: LidarSurfaceGrid, sun: SolarPosition) {
  if (sun.elevationDegrees <= 0) return true;
  const [originX, originY] = webMercator(coordinate);
  return surfaceOccludesSunAtMercator(originX, originY, grid, sun);
}

export function surfaceOccludesSunAtMercator(originX: number, originY: number, grid: LidarSurfaceGrid, sun: SolarPosition) {
  if (sun.elevationDegrees <= 0) return true;
  const startElevation = grid.elevationAtMercator(originX, originY);
  if (!startElevation) return false;
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

export function lidarShadowMask(grid: LidarSurfaceGrid, sun: SolarPosition, stride = 2) {
  const width = Math.ceil(grid.width / stride);
  const height = Math.ceil(grid.height / stride);
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      const x = grid.origin[0] + (column * stride + 0.5) * grid.resolutionMeters;
      const y = grid.origin[1] - (row * stride + 0.5) * grid.resolutionMeters;
      if (!surfaceOccludesSunAtMercator(x, y, grid, sun)) continue;
      const index = (row * width + column) * 4;
      pixels[index] = 28;
      pixels[index + 1] = 59;
      pixels[index + 2] = 76;
      pixels[index + 3] = 76;
    }
  }
  return { width, height, pixels };
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
