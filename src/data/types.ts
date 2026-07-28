export type Coordinate = readonly [number, number];

export interface GraphNode {
  id: string;
  coordinate: Coordinate;
  label: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  minutes: number;
  treeCover: number;
  buildingShade: number;
  confidence: number;
  corridor: string;
}

export interface StudyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  lidar?: {
    dem: string;
    dsm: string;
    resolution_m: number;
    edges_with_obstruction: number;
  };
}

export interface Place {
  label: string;
  coordinate: Coordinate;
}

export type WeatherScenarioId = 'clear' | 'marine' | 'warm';

export interface WeatherScenario {
  id: WeatherScenarioId;
  label: string;
  description: string;
  radiationMultiplier: number;
  heatMultiplier: number;
}

export interface ExposureConditions {
  radiationMultiplier: number;
  heatMultiplier: number;
  solarElevationDegrees?: number;
  lidarOcclusionByEdge?: ReadonlyMap<string, number>;
}

export interface SolarPosition {
  azimuthDegrees: number;
  elevationDegrees: number;
}

export interface LiveWeather {
  observedAt: string;
  localDate: string;
  timezone: string;
  temperatureC: number;
  apparentTemperatureC: number;
  relativeHumidity: number;
  cloudCover: number;
  windSpeedKph: number;
  directRadiationWm2: number;
  diffuseRadiationWm2: number;
  shortwaveRadiationWm2: number;
  sunrise: string;
  sunset: string;
}

export interface RouteResult {
  nodeIds: string[];
  edges: GraphEdge[];
  minutes: number;
  directSunMinutes: number;
  heatScore: number;
  confidence: number;
  cost: number;
}
