import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { StudyGraph } from './types';

const graph = JSON.parse(readFileSync(resolve(process.cwd(), 'public/data/real-graph.json'), 'utf8')) as StudyGraph;

describe('real Santa Monica graph artifact', () => {
  it('contains the expected public-source coverage and LiDAR enrichment', () => {
    expect(graph.nodes.length).toBeGreaterThan(50_000);
    expect(graph.edges.length).toBeGreaterThan(60_000);
    expect(graph.lidar?.resolution_m).toBe(2);
    expect(graph.lidar?.edges_with_obstruction).toBeGreaterThan(30_000);
  });

  it('contains valid coordinates and usable routing edges', () => {
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    for (const node of graph.nodes) {
      expect(node.coordinate[0]).toBeGreaterThanOrEqual(-118.525);
      expect(node.coordinate[0]).toBeLessThanOrEqual(-118.435);
      expect(node.coordinate[1]).toBeGreaterThanOrEqual(33.99);
      expect(node.coordinate[1]).toBeLessThanOrEqual(34.055);
    }
    for (const edge of graph.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
      expect(edge.minutes).toBeGreaterThan(0);
      expect(edge.treeCover).toBeGreaterThanOrEqual(0);
      expect(edge.treeCover).toBeLessThanOrEqual(1);
      expect(edge.buildingShade).toBeGreaterThanOrEqual(0);
      expect(edge.buildingShade).toBeLessThanOrEqual(1);
    }
  });
});
