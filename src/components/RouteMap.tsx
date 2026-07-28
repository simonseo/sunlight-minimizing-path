import { useCallback, useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import type { EnvironmentalFeatures } from '../data/environment';
import type { LidarSurfaceGrid } from '../data/lidarSurface';
import type { Coordinate, ExposureConditions, Place, RouteResult, SolarPosition, StudyGraph } from '../data/types';
import { edgeExposure } from '../lib/exposure';
import { lidarShadowMask } from '../lib/lidarRaycast';

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
  lidarSurface: LidarSurfaceGrid | null;
  environment: EnvironmentalFeatures | null;
  showShadows: boolean;
}

function shadowCoordinate(coordinate: Coordinate, heightMeters: number, sunPosition: SolarPosition) {
  const azimuth = sunPosition.azimuthDegrees + 180;
  const distance = sunPosition.elevationDegrees <= 0 ? 0 : Math.min(130, heightMeters / Math.tan((sunPosition.elevationDegrees * Math.PI) / 180));
  const radians = (azimuth * Math.PI) / 180;
  return [coordinate[0] + (Math.sin(radians) * distance) / 92000, coordinate[1] + (Math.cos(radians) * distance) / 111000] as Coordinate;
}

function closedRing(ring: Coordinate[]) {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring.at(-1);
  return last?.[0] === first[0] && last?.[1] === first[1] ? ring : [...ring, first];
}

function canopyRing(center: Coordinate, radiusMeters: number) {
  const latitudeMeters = 111_000;
  const longitudeMeters = latitudeMeters * Math.cos((center[1] * Math.PI) / 180);
  const radius = Math.max(2, Math.min(16, radiusMeters));
  const ring = Array.from({ length: 14 }, (_, index) => {
    const angle = (index / 12) * Math.PI * 2;
    return [center[0] + (Math.sin(angle) * radius) / longitudeMeters, center[1] + (Math.cos(angle) * radius) / latitudeMeters] as Coordinate;
  });
  return closedRing(ring);
}

function buildingShadowGeometry(ring: Coordinate[], heightMeters: number, sunPosition: SolarPosition) {
  const footprint = closedRing(ring);
  const projected = closedRing(footprint.map((coordinate) => shadowCoordinate(coordinate, heightMeters, sunPosition)));
  return {
    type: 'Polygon' as const,
    coordinates: [projected],
  };
}

function mercatorToCoordinate(x: number, y: number) {
  const longitude = (x / 20_037_508.34) * 180;
  const latitude = (360 / Math.PI) * Math.atan(Math.exp((y / 20_037_508.34) * Math.PI)) - 90;
  return [longitude, latitude] as Coordinate;
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

export function RouteMap({ graph, fastest, cooler, selectedRoute, origin, destination, time, conditions, sunPosition, lidarSurface, environment, showShadows }: RouteMapProps) {
  const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
  const container = useRef<HTMLDivElement | null>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const updateLayersRef = useRef<() => void>(() => {});
  const shadowMaskKey = useRef('');

  const updateLayers = useCallback(() => {
    const instance = map.current;
    if (!instance || !instance.isStyleLoaded()) return;
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
    const exposurePoints = graph.edges.filter((_, index) => index % (showShadows ? 72 : 20) === 0).map((edge) => {
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
    // Once the DSM/DEM is available, the map uses its ray-cast ground-shadow
    // raster instead of the older footprint/height illustration.
    const showIllustratedShadows = showShadows && !lidarSurface;
    const eligibleBuildings = showIllustratedShadows && environment ? environment.buildings.filter((building) => building.height_m >= 5).slice(0, 6000) : [];
    buildingSource?.setData({
      type: 'FeatureCollection',
      features: eligibleBuildings.map((building) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: buildingShadowGeometry(building.ring, building.height_m, sunPosition),
      })),
    });
    footprintSource?.setData({
      type: 'FeatureCollection',
      features: eligibleBuildings.map((building) => ({ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [closedRing(building.ring)] } })),
    });
    treeSource?.setData({
      type: 'FeatureCollection',
      features: showIllustratedShadows && environment ? environment.trees.filter((_, index) => index % 2 === 0).map((tree) => ({
        type: 'Feature' as const,
        properties: {},
        geometry: { type: 'Polygon' as const, coordinates: [canopyRing(shadowCoordinate(tree.coordinate, tree.height_m, sunPosition), tree.crown_radius_m)] },
      })) : [],
    });

    const maskLayerId = 'lidar-shadow-mask-layer';
    if (showShadows && lidarSurface) {
      const maskKey = `${sunPosition.azimuthDegrees.toFixed(2)}:${sunPosition.elevationDegrees.toFixed(2)}`;
      if (maskKey !== shadowMaskKey.current) {
        const mask = lidarShadowMask(lidarSurface, sunPosition);
        const canvas = document.createElement('canvas');
        canvas.width = mask.width;
        canvas.height = mask.height;
        const context = canvas.getContext('2d');
        if (context) context.putImageData(new ImageData(mask.pixels, mask.width, mask.height), 0, 0);
        const east = lidarSurface.origin[0] + lidarSurface.width * lidarSurface.resolutionMeters;
        const south = lidarSurface.origin[1] - lidarSurface.height * lidarSurface.resolutionMeters;
        const coordinates = [
          mercatorToCoordinate(lidarSurface.origin[0], lidarSurface.origin[1]),
          mercatorToCoordinate(east, lidarSurface.origin[1]),
          mercatorToCoordinate(east, south),
          mercatorToCoordinate(lidarSurface.origin[0], south),
        ] as unknown as [[number, number], [number, number], [number, number], [number, number]];
        const source = instance.getSource('lidar-shadow-mask') as mapboxgl.ImageSource | undefined;
        if (source) source.updateImage({ url: canvas.toDataURL(), coordinates });
        else {
          instance.addSource('lidar-shadow-mask', { type: 'image', url: canvas.toDataURL(), coordinates });
          instance.addLayer({ id: maskLayerId, type: 'raster', source: 'lidar-shadow-mask', paint: { 'raster-opacity': 0.72, 'raster-fade-duration': 0 } }, 'exposure-points-layer');
        }
        shadowMaskKey.current = maskKey;
      }
      instance.setLayoutProperty(maskLayerId, 'visibility', 'visible');
    } else if (instance.getLayer(maskLayerId)) {
      instance.setLayoutProperty(maskLayerId, 'visibility', 'none');
      shadowMaskKey.current = '';
    }

    markers.current.forEach((marker) => marker.remove());
    markers.current = [
      new mapboxgl.Marker({ color: '#f4ad50' }).setLngLat([...origin.coordinate]).addTo(instance),
      new mapboxgl.Marker({ color: '#0d6664' }).setLngLat([...destination.coordinate]).addTo(instance),
    ];
  }, [conditions, cooler, destination.coordinate, environment, fastest, graph, lidarSurface, origin.coordinate, selectedRoute, showShadows, sunPosition, time]);

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
        paint: { 'circle-radius': 4, 'circle-color': ['get', 'color'], 'circle-opacity': 0.2, 'circle-blur': 0.12 },
      });
      instance.addSource('building-shadows', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      instance.addLayer({ id: 'building-shadows-layer', type: 'fill', source: 'building-shadows', paint: { 'fill-color': '#263d5a', 'fill-opacity': 0.1 } });
      instance.addSource('tree-shadows', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      instance.addLayer({ id: 'tree-shadows-layer', type: 'fill', source: 'tree-shadows', paint: { 'fill-color': '#426b58', 'fill-opacity': 0.2 } });
      instance.addSource('building-footprints', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      instance.addLayer({ id: 'building-footprints-layer', type: 'line', source: 'building-footprints', paint: { 'line-color': '#263d5a', 'line-opacity': 0.26, 'line-width': 0.7 } });
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
