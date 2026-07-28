import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { EnvironmentalFeatures } from '../data/environment';
import type { Coordinate, ExposureConditions, Place, RouteResult, SolarPosition, StudyGraph } from '../data/types';
import { edgeExposure } from '../lib/exposure';

interface RouteMapProps {
  graph: StudyGraph;
  fastest: RouteResult | null;
  cooler: RouteResult | null;
  selectedRoute: 'fastest' | 'cooler';
  origin: Place;
  destination: Place;
  time: string;
  conditions: ExposureConditions;
  sunPosition: SolarPosition;
  environment: EnvironmentalFeatures | null;
  showShadows: boolean;
}

function shadowCoordinate(coordinate: Coordinate, heightMeters: number, sunPosition: SolarPosition) {
  const azimuth = sunPosition.azimuthDegrees + 180;
  const distance = sunPosition.elevationDegrees <= 0 ? 0 : Math.min(130, heightMeters / Math.tan((sunPosition.elevationDegrees * Math.PI) / 180));
  const radians = (azimuth * Math.PI) / 180;
  return [coordinate[0] + (Math.sin(radians) * distance) / 92000, coordinate[1] + (Math.cos(radians) * distance) / 111000] as Coordinate;
}

function lineFeature(nodeIds: string[], graph: StudyGraph) {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  return {
    type: 'Feature' as const,
    properties: {},
    geometry: {
      type: 'LineString' as const,
      coordinates: nodeIds.map((id) => nodeById.get(id)?.coordinate).filter((point): point is Coordinate => Boolean(point)),
    },
  };
}

export function RouteMap({ graph, fastest, cooler, selectedRoute, origin, destination, time, conditions, sunPosition, environment, showShadows }: RouteMapProps) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const updateLayersRef = useRef<() => void>(() => {});

  const updateLayers = useCallback(() => {
    const instance = map.current;
    if (!instance || !instance.isStyleLoaded()) return;
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const exposurePoints = graph.edges.filter((_, index) => index % 12 === 0).map((edge) => {
      const from = nodeById.get(edge.from)?.coordinate;
      const to = nodeById.get(edge.to)?.coordinate;
      const midpoint: Coordinate = from && to ? [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2] : [-118.49, 34.02];
      const exposure = edgeExposure(edge, time, conditions);
      return {
        type: 'Feature' as const,
        properties: { color: exposure > 0.65 ? '#f1a847' : exposure > 0.35 ? '#d9cf86' : '#3e9a94' },
        geometry: { type: 'Point' as const, coordinates: midpoint },
      };
    });
    const exposureSource = instance.getSource('exposure-points') as mapboxgl.GeoJSONSource | undefined;
    exposureSource?.setData({ type: 'FeatureCollection', features: exposurePoints });

    const routeSource = instance.getSource('route-lines') as mapboxgl.GeoJSONSource | undefined;
    const selected = selectedRoute === 'cooler' ? cooler : fastest;
    routeSource?.setData({
      type: 'FeatureCollection',
      features: [
        ...(fastest ? [{ ...lineFeature(fastest.nodeIds, graph), properties: { route: 'fastest' } }] : []),
        ...(cooler ? [{ ...lineFeature(cooler.nodeIds, graph), properties: { route: 'cooler' } }] : []),
        ...(selected ? [{ ...lineFeature(selected.nodeIds, graph), properties: { route: 'selected' } }] : []),
      ],
    });

    const buildingSource = instance.getSource('building-shadows') as mapboxgl.GeoJSONSource | undefined;
    const treeSource = instance.getSource('tree-shadows') as mapboxgl.GeoJSONSource | undefined;
    const footprintSource = instance.getSource('building-footprints') as mapboxgl.GeoJSONSource | undefined;
    const eligibleBuildings = showShadows && environment ? environment.buildings.filter((building) => building.height_m >= 5).slice(0, 12000) : [];
    buildingSource?.setData({
      type: 'FeatureCollection',
      features: eligibleBuildings.map((building) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Polygon' as const, coordinates: [building.ring.map((coordinate) => shadowCoordinate(coordinate, building.height_m, sunPosition))] },
      })),
    });
    footprintSource?.setData({
      type: 'FeatureCollection',
      features: eligibleBuildings.map((building) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [building.ring] } })),
    });
    treeSource?.setData({
      type: 'FeatureCollection',
      features: showShadows && environment ? environment.trees.filter((_, index) => index % 3 === 0).map((tree) => ({
        type: 'Feature' as const,
        properties: { radius: Math.max(4, Math.min(28, tree.crown_radius_m * 1.4)) },
        geometry: { type: 'Point' as const, coordinates: shadowCoordinate(tree.coordinate, tree.height_m, sunPosition) },
      })) : [],
    });

    markers.current.forEach((marker) => marker.remove());
    markers.current = [
      new mapboxgl.Marker({ color: '#f4ad50' }).setLngLat([...origin.coordinate]).addTo(instance),
      new mapboxgl.Marker({ color: '#0d6664' }).setLngLat([...destination.coordinate]).addTo(instance),
    ];
  }, [conditions, cooler, destination.coordinate, environment, fastest, graph, origin.coordinate, selectedRoute, showShadows, sunPosition, time]);

  useEffect(() => {
    updateLayersRef.current = updateLayers;
    updateLayers();
  }, [updateLayers]);

  useEffect(() => {
    if (!container.current || !token || map.current) return undefined;
    mapboxgl.accessToken = token;
    const instance = new mapboxgl.Map({
      container: container.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-118.4912, 34.0195],
      zoom: 13.4,
      attributionControl: true,
    });
    map.current = instance;
    instance.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right');
    instance.on('load', () => {
      instance.addSource('exposure-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      instance.addLayer({
        id: 'exposure-points-layer',
        type: 'circle',
        source: 'exposure-points',
        paint: { 'circle-radius': 7, 'circle-color': ['get', 'color'], 'circle-opacity': 0.32, 'circle-blur': 0.18 },
      });
      instance.addSource('building-shadows', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      instance.addLayer({ id: 'building-shadows-layer', type: 'fill', source: 'building-shadows', paint: { 'fill-color': '#263d5a', 'fill-opacity': 0.16 } });
      instance.addSource('tree-shadows', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      instance.addLayer({ id: 'tree-shadows-layer', type: 'circle', source: 'tree-shadows', paint: { 'circle-color': '#426b58', 'circle-opacity': 0.16, 'circle-radius': ['get', 'radius'], 'circle-blur': 0.28 } });
      instance.addSource('building-footprints', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      instance.addLayer({ id: 'building-footprints-layer', type: 'line', source: 'building-footprints', paint: { 'line-color': '#263d5a', 'line-opacity': 0.38, 'line-width': 1 } });
      instance.addSource('route-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      instance.addLayer({
        id: 'route-lines-layer',
        type: 'line',
        source: 'route-lines',
        paint: {
          'line-color': ['match', ['get', 'route'], 'fastest', '#415964', 'cooler', '#0d6664', '#f4ad50'],
          'line-width': ['match', ['get', 'route'], 'selected', 7, 4],
          'line-opacity': ['match', ['get', 'route'], 'selected', 1, 0.6],
        },
      });
      updateLayersRef.current();
    });
    return () => {
      markers.current.forEach((marker) => marker.remove());
      markers.current = [];
      instance.remove();
      map.current = null;
    };
  }, [token]);

  if (!token) {
    return <div className="map-fallback">Add `VITE_MAPBOX_ACCESS_TOKEN` to `.env` to render the research map.</div>;
  }
  return <div ref={container} className="map" aria-label="Santa Monica heat-route map" />;
}
