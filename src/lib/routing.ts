import type { ExposureConditions, GraphEdge, RouteResult, StudyGraph } from '../data/types';
import { edgeExposure, heatBurden } from './exposure';

interface SearchResult {
  nodeIds: string[];
  edges: GraphEdge[];
  cost: number;
}

type Weight = (edge: GraphEdge) => number;
type Adjacency = Map<string, Array<{ edge: GraphEdge; next: string }>>;
const adjacencyCache = new WeakMap<StudyGraph, Adjacency>();

class MinPriorityQueue {
  private readonly items: Array<{ nodeId: string; cost: number }> = [];

  get length() {
    return this.items.length;
  }

  push(item: { nodeId: string; cost: number }) {
    this.items.push(item);
    let index = this.items.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].cost <= this.items[index].cost) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }

  pop() {
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length > 0 && last) {
      this.items[0] = last;
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        let smallest = index;
        if (left < this.items.length && this.items[left].cost < this.items[smallest].cost) smallest = left;
        if (right < this.items.length && this.items[right].cost < this.items[smallest].cost) smallest = right;
        if (smallest === index) break;
        [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
        index = smallest;
      }
    }
    return first;
  }
}

function buildAdjacency(graph: StudyGraph): Adjacency {
  const cached = adjacencyCache.get(graph);
  if (cached) return cached;
  const adjacency: Adjacency = new Map();
  for (const edge of graph.edges) {
    const from = adjacency.get(edge.from) ?? [];
    from.push({ edge, next: edge.to });
    adjacency.set(edge.from, from);
    const to = adjacency.get(edge.to) ?? [];
    to.push({ edge, next: edge.from });
    adjacency.set(edge.to, to);
  }
  adjacencyCache.set(graph, adjacency);
  return adjacency;
}

function shortestPath(adjacency: Adjacency, startId: string, endId: string, weight: Weight): SearchResult | null {
  const queue = new MinPriorityQueue();
  queue.push({ nodeId: startId, cost: 0 });
  const costs = new Map<string, number>([[startId, 0]]);
  const previous = new Map<string, { nodeId: string; edge: GraphEdge }>();

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) break;
    if (current.nodeId === endId) break;
    if (current.cost !== costs.get(current.nodeId)) continue;

    for (const { edge, next } of adjacency.get(current.nodeId) ?? []) {
      const nextCost = current.cost + weight(edge);
      if (nextCost < (costs.get(next) ?? Number.POSITIVE_INFINITY)) {
        costs.set(next, nextCost);
        previous.set(next, { nodeId: current.nodeId, edge });
        queue.push({ nodeId: next, cost: nextCost });
      }
    }
  }

  if (!costs.has(endId)) return null;
  const nodeIds = [endId];
  const edges: GraphEdge[] = [];
  let cursor = endId;
  while (cursor !== startId) {
    const step = previous.get(cursor);
    if (!step) return null;
    edges.unshift(step.edge);
    nodeIds.unshift(step.nodeId);
    cursor = step.nodeId;
  }
  return { nodeIds, edges, cost: costs.get(endId) ?? 0 };
}

function summarize(search: SearchResult, time: string, conditions: ExposureConditions): RouteResult {
  const minutes = search.edges.reduce((sum, edge) => sum + edge.minutes, 0);
  const sunBurden = search.edges.reduce((sum, edge) => sum + edge.minutes * edgeExposure(edge, time, conditions), 0);
  const heat = search.edges.reduce((sum, edge) => sum + heatBurden(edge, time, conditions), 0);
  const confidence = search.edges.reduce((sum, edge) => sum + edge.confidence, 0) / search.edges.length;
  return {
    ...search,
    minutes,
    directSunMinutes: sunBurden,
    heatScore: Math.round(Math.min(100, (heat / Math.max(minutes, 1)) * 100)),
    confidence,
  };
}

export function calculateRoutes(graph: StudyGraph, startId: string, endId: string, time: string, conditions: ExposureConditions) {
  const adjacency = buildAdjacency(graph);
  const fastestSearch = shortestPath(adjacency, startId, endId, (edge) => edge.minutes);
  if (!fastestSearch) return null;
  const fastest = summarize(fastestSearch, time, conditions);
  const coolerSearch = shortestPath(adjacency, startId, endId, (edge) => edge.minutes + heatBurden(edge, time, conditions) * 3.8);
  const coolerCandidate = coolerSearch ? summarize(coolerSearch, time, conditions) : fastest;
  const isMeaningfullyCooler = coolerCandidate.heatScore < fastest.heatScore - 2;
  const isWithinDetourCap = coolerCandidate.minutes <= fastest.minutes * 1.25;
  return {
    fastest,
    cooler: isMeaningfullyCooler && isWithinDetourCap ? coolerCandidate : fastest,
  };
}
