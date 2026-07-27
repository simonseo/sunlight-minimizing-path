import type { StudyGraph } from '../data/types';

function isGraph(value: unknown): value is StudyGraph {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<StudyGraph>;
  return Array.isArray(candidate.nodes) && candidate.nodes.length > 100 && Array.isArray(candidate.edges) && candidate.edges.length > 500;
}

export async function loadRealGraph() {
  const response = await fetch(`${import.meta.env.BASE_URL}data/real-graph.json`, { cache: 'no-store' });
  if (!response.ok) return null;
  const candidate: unknown = await response.json();
  return isGraph(candidate) ? candidate : null;
}
