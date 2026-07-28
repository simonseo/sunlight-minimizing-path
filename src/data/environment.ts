import type { Coordinate } from './types';

export interface EnvironmentalFeatures {
  buildings: Array<{ id: string; ring: Coordinate[]; height_m: number }>;
  trees: Array<{ id: string; coordinate: Coordinate; height_m: number; crown_radius_m: number }>;
  source: string;
}

export async function loadEnvironmentalFeatures() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/environmental-features.json`);
  if (!response.ok) return null;
  return (await response.json()) as EnvironmentalFeatures;
}
