import type { GraphEdge, GraphNode, StudyGraph, WeatherScenario } from './types';

const LATITUDES = [34.003, 34.009, 34.015, 34.021, 34.027, 34.033, 34.039] as const;
const LONGITUDES = [-118.505, -118.497, -118.489, -118.481, -118.473, -118.465, -118.457] as const;

const northSouthLabels = ['Ocean Avenue', '2nd Street', '4th Street', 'Lincoln Boulevard', '11th Street', '17th Street', '26th Street'];
const eastWestLabels = ['Ocean Park Boulevard', 'Pico Boulevard', 'Colorado Avenue', 'Broadway', 'Wilshire Boulevard', 'Montana Avenue', 'San Vicente Boulevard'];

function nodeId(row: number, column: number) {
  return `node-${row}-${column}`;
}

function corridorTraits(row: number, column: number, horizontal: boolean) {
  const leafyCorridor = horizontal ? row === 3 || row === 5 : column === 1 || column === 4;
  const exposedCorridor = horizontal ? row === 1 || row === 6 : column === 0 || column === 6;
  return {
    treeCover: leafyCorridor ? 0.76 : exposedCorridor ? 0.16 : 0.42,
    buildingShade: horizontal ? (row === 4 ? 0.34 : 0.18) : (column === 3 ? 0.32 : 0.14),
    confidence: leafyCorridor || exposedCorridor ? 0.78 : 0.68,
  };
}

const nodes: GraphNode[] = LATITUDES.flatMap((latitude, row) => LONGITUDES.map((longitude, column) => ({
  id: nodeId(row, column),
  coordinate: [longitude, latitude] as const,
  label: `${northSouthLabels[column]} & ${eastWestLabels[row]}`,
})));

const edges: GraphEdge[] = [];
for (let row = 0; row < LATITUDES.length; row += 1) {
  for (let column = 0; column < LONGITUDES.length; column += 1) {
    if (column < LONGITUDES.length - 1) {
      const traits = corridorTraits(row, column, true);
      edges.push({
        id: `edge-e-${row}-${column}`,
        from: nodeId(row, column),
        to: nodeId(row, column + 1),
        minutes: 5.1,
        corridor: eastWestLabels[row],
        ...traits,
      });
    }
    if (row < LATITUDES.length - 1) {
      const traits = corridorTraits(row, column, false);
      edges.push({
        id: `edge-n-${row}-${column}`,
        from: nodeId(row, column),
        to: nodeId(row + 1, column),
        minutes: 4.8,
        corridor: northSouthLabels[column],
        ...traits,
      });
    }
  }
}

// The exposed express mesh deliberately creates a useful fastest-vs-cooler research comparison.
for (let row = 1; row <= 5; row += 1) {
  edges.push({
    id: `edge-express-${row}`,
    from: nodeId(row, 0),
    to: nodeId(row, 6),
    minutes: 25,
    treeCover: 0.05,
    buildingShade: 0.04,
    confidence: 0.72,
    corridor: 'Exposed study express',
  });
}

export const studyGraph: StudyGraph = { nodes, edges };

export const weatherScenarios: WeatherScenario[] = [
  {
    id: 'clear',
    label: 'Clear afternoon',
    description: 'High direct radiation, light coastal wind.',
    radiationMultiplier: 1,
    heatMultiplier: 1,
  },
  {
    id: 'marine',
    label: 'Marine layer',
    description: 'Cloud-filtered direct sun and cooler air.',
    radiationMultiplier: 0.55,
    heatMultiplier: 0.78,
  },
  {
    id: 'warm',
    label: 'Warm inland flow',
    description: 'High radiation and warmer, drier conditions.',
    radiationMultiplier: 1.14,
    heatMultiplier: 1.22,
  },
];
