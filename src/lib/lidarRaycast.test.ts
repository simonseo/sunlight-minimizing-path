import { describe, expect, it } from 'vitest';
import { LidarSurfaceGrid } from '../data/lidarSurface';
import { surfaceOccludesSun } from './lidarRaycast';

function gridWithObstacle() {
  const width = 30;
  const ground = new Uint16Array(width * width).fill(100);
  const surface = new Uint16Array(width * width).fill(100);
  // A 16 m building 40 m east of the pedestrian's location.
  surface[15 * width + 9] = 260;
  return new LidarSurfaceGrid([-100, 100], 10, width, width, 0.1, 65535, ground, surface, 'test surface');
}

describe('LiDAR sun-ray casting', () => {
  it('detects a DSM surface intersecting a low eastern sun ray', () => {
    const grid = gridWithObstacle();
    // This Web Mercator point lands in grid row 15 / column 5.
    const point = [-0.0004, -0.0005] as const;
    expect(surfaceOccludesSun(point, grid, { azimuthDegrees: 90, elevationDegrees: 15 })).toBe(true);
  });

  it('does not call the same obstacle shade when the sun is high', () => {
    const grid = gridWithObstacle();
    const point = [-0.0004, -0.0005] as const;
    expect(surfaceOccludesSun(point, grid, { azimuthDegrees: 90, elevationDegrees: 70 })).toBe(false);
  });
});
