import { describe, expect, it } from 'vitest';
import { studyGraph, weatherScenarios } from '../data/studyGraph';
import { edgeExposure, solarIntensity } from './exposure';
import { calculateRoutes } from './routing';

describe('exposure model', () => {
  it('is stronger at noon than early morning', () => {
    expect(solarIntensity('12:00')).toBeGreaterThan(solarIntensity('08:00'));
  });

  it('does not make a more shaded edge more exposed', () => {
    const scenario = weatherScenarios[0];
    const exposed = { ...studyGraph.edges[0], treeCover: 0, buildingShade: 0 };
    const shaded = { ...studyGraph.edges[0], treeCover: 0.9, buildingShade: 0.5 };
    expect(edgeExposure(shaded, '13:00', scenario)).toBeLessThan(edgeExposure(exposed, '13:00', scenario));
  });
});

describe('route selection', () => {
  it('returns connected fastest and cooler routes with reconciled duration', () => {
    const result = calculateRoutes(studyGraph, 'node-3-0', 'node-3-6', '13:30', weatherScenarios[0]);
    if (!result) throw new Error('Expected a route');
    expect(result.fastest.nodeIds[0]).toBe('node-3-0');
    expect(result.fastest.nodeIds.at(-1)).toBe('node-3-6');
    expect(result.fastest.minutes).toBeCloseTo(result.fastest.edges.reduce((sum, edge) => sum + edge.minutes, 0));
    expect(result.cooler.minutes).toBeLessThanOrEqual(result.fastest.minutes * 1.25);
    expect(result.cooler.directSunMinutes).toBeLessThan(result.fastest.directSunMinutes);
    expect(result.cooler.nodeIds).not.toEqual(result.fastest.nodeIds);
  });
});
