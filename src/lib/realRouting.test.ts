import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { StudyGraph } from '../data/types';
import { weatherScenarios } from '../data/studyGraph';
import { nearestNode } from './geo';
import { calculateRoutes } from './routing';

const graph = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/real-graph.json'), 'utf8')) as StudyGraph;

describe('real graph routing performance', () => {
  it('returns valid alternatives for a cross-city trip within a research interaction budget', () => {
    const origin = nearestNode(graph.nodes, [-118.505, 34.021]);
    const destination = nearestNode(graph.nodes, [-118.457, 34.021]);
    const started = performance.now();
    const routes = calculateRoutes(graph, origin.id, destination.id, '13:30', weatherScenarios[0]);
    const elapsed = performance.now() - started;
    expect(routes).not.toBeNull();
    expect(routes?.fastest.edges.length).toBeGreaterThan(0);
    expect(routes?.cooler.minutes).toBeLessThanOrEqual((routes?.fastest.minutes ?? 0) * 1.25);
    expect(elapsed).toBeLessThan(1_500);
  });
});
