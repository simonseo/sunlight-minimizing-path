import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EnvironmentalFeatures } from './environment';

const environment = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/environmental-features.json'), 'utf8')) as EnvironmentalFeatures;

describe('environmental shadow artifact', () => {
  it('contains real footprint and tree-height features for modeled shadows', () => {
    expect(environment.buildings.length).toBeGreaterThan(50_000);
    expect(environment.trees.length).toBeGreaterThan(30_000);
    expect(environment.buildings.some((building) => building.height_m >= 5 && building.ring.length >= 4)).toBe(true);
    expect(environment.trees.some((tree) => tree.height_m > 4 && tree.crown_radius_m > 1)).toBe(true);
  });
});
