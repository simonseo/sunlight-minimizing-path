import type { Coordinate } from './types';

interface PackedLidarSurface {
  version: number;
  crs: 'EPSG:3857';
  origin_m: [number, number];
  resolution_m: number;
  width: number;
  height: number;
  quantization_m: number;
  nodata: number;
  ground_decimeters_base64: string;
  surface_decimeters_base64: string;
  source: string;
}

function decodeUint16(encoded: string) {
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Uint16Array(bytes.buffer);
}

export function webMercator(coordinate: Coordinate) {
  const [longitude, latitude] = coordinate;
  const x = longitude * 20_037_508.34 / 180;
  const y = Math.log(Math.tan((90 + latitude) * Math.PI / 360)) / (Math.PI / 180);
  return [x, y * 20_037_508.34 / 180] as const;
}

export class LidarSurfaceGrid {
  constructor(
    readonly origin: readonly [number, number],
    readonly resolutionMeters: number,
    readonly width: number,
    readonly height: number,
    readonly quantizationMeters: number,
    readonly nodata: number,
    private readonly ground: Uint16Array,
    private readonly surface: Uint16Array,
    readonly source: string,
  ) {}

  elevationAtMercator(x: number, y: number) {
    const column = Math.floor((x - this.origin[0]) / this.resolutionMeters);
    const row = Math.floor((this.origin[1] - y) / this.resolutionMeters);
    if (row < 0 || column < 0 || row >= this.height || column >= this.width) return null;
    const index = row * this.width + column;
    const ground = this.ground[index];
    const surface = this.surface[index];
    if (ground === this.nodata || surface === this.nodata) return null;
    return { ground: ground * this.quantizationMeters, surface: surface * this.quantizationMeters };
  }

  elevationAt(coordinate: Coordinate) {
    const [x, y] = webMercator(coordinate);
    return this.elevationAtMercator(x, y);
  }
}

export function parseLidarSurface(payload: PackedLidarSurface) {
  if (payload.version !== 1 || payload.crs !== 'EPSG:3857') throw new Error('Unsupported LiDAR surface artifact.');
  const ground = decodeUint16(payload.ground_decimeters_base64);
  const surface = decodeUint16(payload.surface_decimeters_base64);
  if (ground.length !== payload.width * payload.height || surface.length !== ground.length) throw new Error('Corrupt LiDAR surface artifact.');
  return new LidarSurfaceGrid(payload.origin_m, payload.resolution_m, payload.width, payload.height, payload.quantization_m, payload.nodata, ground, surface, payload.source);
}

export async function loadLidarSurface() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/lidar-surface-grid.json`);
  if (!response.ok) return null;
  return parseLidarSurface(await response.json() as PackedLidarSurface);
}
