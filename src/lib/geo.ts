import type { Coordinate, GraphNode } from '../data/types';

export function distanceInKilometers(a: Coordinate, b: Coordinate) {
  const [lngA, latA] = a;
  const [lngB, latB] = b;
  const earthRadiusKm = 6371;
  const latitudeDelta = ((latB - latA) * Math.PI) / 180;
  const longitudeDelta = ((lngB - lngA) * Math.PI) / 180;
  const startLatitude = (latA * Math.PI) / 180;
  const endLatitude = (latB * Math.PI) / 180;
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLatitude) * Math.cos(endLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function nearestNode(nodes: GraphNode[], coordinate: Coordinate) {
  return nodes.reduce((closest, node) => (
    distanceInKilometers(node.coordinate, coordinate) < distanceInKilometers(closest.coordinate, coordinate)
      ? node
      : closest
  ));
}

export function isInStudyArea(coordinate: Coordinate) {
  const [longitude, latitude] = coordinate;
  return longitude >= -118.525 && longitude <= -118.435 && latitude >= 33.99 && latitude <= 34.055;
}
