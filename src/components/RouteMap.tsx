import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { Coordinate, Place, RouteResult, StudyGraph, WeatherScenario } from '../data/types';
import { edgeExposure } from '../lib/exposure';

interface RouteMapProps {
  graph: StudyGraph;
  fastest: RouteResult | null;
  cooler: RouteResult | null;
  selectedRoute: 'fastest' | 'cooler';
  origin: Place;
  destination: Place;
  time: string;
  scenario: WeatherScenario;
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

export function RouteMap({ graph, fastest, cooler, selectedRoute, origin, destination, time, scenario }: RouteMapProps) {
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
      const exposure = edgeExposure(edge, time, scenario);
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

    markers.current.forEach((marker) => marker.remove());
    markers.current = [
      new mapboxgl.Marker({ color: '#f4ad50' }).setLngLat([...origin.coordinate]).addTo(instance),
      new mapboxgl.Marker({ color: '#0d6664' }).setLngLat([...destination.coordinate]).addTo(instance),
    ];
  }, [cooler, destination.coordinate, fastest, graph, origin.coordinate, scenario, selectedRoute, time]);

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
