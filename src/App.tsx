import { useEffect, useMemo, useState } from 'react';
import { LocationSearch } from './components/LocationSearch';
import { RouteMap } from './components/RouteMap';
import { studyGraph, weatherScenarios } from './data/studyGraph';
import { loadEnvironmentalFeatures } from './data/environment';
import type { EnvironmentalFeatures } from './data/environment';
import type { Place, WeatherScenarioId } from './data/types';
import { isInStudyArea, nearestNode } from './lib/geo';
import { loadRealGraph } from './lib/graphLoader';
import { loadLidarSurface } from './data/lidarSurface';
import { raycastGraphOcclusion } from './lib/lidarRaycast';
import { liveExposureConditions, loadLiveWeather, SANTA_MONICA_CENTER, SANTA_MONICA_TIMEZONE } from './lib/realtime';
import { calculateRoutes } from './lib/routing';
import { solarPosition } from './lib/sun';

const DEFAULT_ORIGIN: Place = { label: 'Ocean Avenue & Broadway', coordinate: [-118.505, 34.021] };
const DEFAULT_DESTINATION: Place = { label: '26th Street & Broadway', coordinate: [-118.457, 34.021] };

function minutes(value: number) {
  return `${Math.round(value)} min`;
}

function localTime(timezone: string) {
  const pieces = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${pieces.hour}:${pieces.minute}`;
}

function localDate(timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function isClockTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

export default function App() {
  const [origin, setOrigin] = useState<Place>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<Place>(DEFAULT_DESTINATION);
  const [time, setTime] = useState(() => localTime(SANTA_MONICA_TIMEZONE));
  const [scenarioId, setScenarioId] = useState<WeatherScenarioId>('clear');
  const [selectedRoute, setSelectedRoute] = useState<'fastest' | 'cooler'>('cooler');
  const [graph, setGraph] = useState(studyGraph);
  const [graphSource, setGraphSource] = useState<'study' | 'public'>('study');
  const [showShadows, setShowShadows] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentalFeatures | null>(null);
  const [lidarSurface, setLidarSurface] = useState<Awaited<ReturnType<typeof loadLidarSurface>> | null>(null);
  const [liveWeather, setLiveWeather] = useState<Awaited<ReturnType<typeof loadLiveWeather>> | null>(null);
  const [liveState, setLiveState] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const scenario = weatherScenarios.find((item) => item.id === scenarioId) ?? weatherScenarios[0];

  useEffect(() => {
    void loadRealGraph().then((realGraph) => {
      if (realGraph) {
        setGraph(realGraph);
        setGraphSource('public');
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    void loadLidarSurface().then(setLidarSurface).catch(() => undefined);
  }, []);

  const refreshLiveWeather = () => {
    setLiveState('loading');
    void loadLiveWeather().then((weather) => {
      setLiveWeather(weather);
      setLiveState('ready');
    }).catch(() => setLiveState('unavailable'));
  };

  useEffect(() => {
    refreshLiveWeather();
    const interval = window.setInterval(refreshLiveWeather, 10 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (showShadows && !environment) void loadEnvironmentalFeatures().then(setEnvironment).catch(() => undefined);
  }, [environment, showShadows]);

  const sun = useMemo(() => solarPosition(liveWeather?.localDate ?? localDate(SANTA_MONICA_TIMEZONE), time, SANTA_MONICA_CENTER, SANTA_MONICA_TIMEZONE), [liveWeather?.localDate, time]);
  const lidarOcclusion = useMemo(() => lidarSurface ? raycastGraphOcclusion(graph, lidarSurface, sun) : undefined, [graph, lidarSurface, sun]);
  const conditions = useMemo(() => ({ ...liveExposureConditions(liveWeather, sun, scenario), lidarOcclusionByEdge: lidarOcclusion }), [lidarOcclusion, liveWeather, scenario, sun]);

  const routeState = useMemo(() => {
    if (!isInStudyArea(origin.coordinate) || !isInStudyArea(destination.coordinate)) return { result: null, message: 'Choose two places inside the Santa Monica research area.' };
    const start = nearestNode(graph.nodes, origin.coordinate);
    const end = nearestNode(graph.nodes, destination.coordinate);
    if (start.id === end.id) return { result: null, message: 'Choose locations farther apart to compare routes.' };
    return { result: calculateRoutes(graph, start.id, end.id, time, conditions), message: null };
  }, [conditions, graph, origin, destination, time]);

  const fastest = routeState.result?.fastest ?? null;
  const cooler = routeState.result?.cooler ?? null;
  const reduction = fastest && cooler && fastest.directSunMinutes > 0
    ? Math.max(0, Math.round((1 - cooler.directSunMinutes / fastest.directSunMinutes) * 100))
    : 0;
  const addedMinutes = fastest && cooler ? Math.max(0, Math.round(cooler.minutes - fastest.minutes)) : 0;

  return (
    <main className="app-shell">
      <section className="map-panel">
        <RouteMap
          graph={graph}
          fastest={fastest}
          cooler={cooler}
          selectedRoute={selectedRoute}
          origin={origin}
          destination={destination}
          time={time}
          conditions={conditions}
          sunPosition={sun}
          lidarSurface={lidarSurface}
          environment={environment}
          showShadows={showShadows}
        />
        <div className="map-caption">Sun {Math.max(0, Math.round(sun.elevationDegrees))}° above horizon · {liveWeather ? `${Math.round(liveWeather.directRadiationWm2)} W/m² live direct radiation` : 'weather fallback'}</div>
      </section>
      <aside className="control-panel">
        <header>
          <p className="eyebrow">Santa Monica research prototype</p>
          <h1>Walk cooler,<br />not merely shorter.</h1>
          <p className="intro">Compare a fastest walk with a route shaped by modeled sun, trees, buildings, and time of day.</p>
          {graphSource === 'public' ? <p className="data-status">{lidarSurface ? 'Public OSM, Santa Monica tree, and LiDAR 3D sun-ray casting data loaded.' : graph.lidar ? 'Public OSM, Santa Monica tree, and LiDAR surface data loading…' : 'Public OSM + Santa Monica tree inventory loaded. Building-shade rasters remain pending LiDAR processing.'}</p> : null}
        </header>

        <div className="search-grid">
          <LocationSearch label="From" value={origin} onSelect={setOrigin} />
          <LocationSearch label="To" value={destination} onSelect={setDestination} />
        </div>

        <section className="live-conditions" aria-live="polite">
          <div>
            <span className="live-label">Live Santa Monica conditions</span>
            {liveState === 'ready' && liveWeather ? <strong>{Math.round(liveWeather.apparentTemperatureC)}°C feels like · {liveWeather.cloudCover}% cloud · {Math.round(liveWeather.directRadiationWm2)} W/m² direct sun</strong> : null}
            {liveState === 'loading' ? <strong>Refreshing local weather and radiation…</strong> : null}
            {liveState === 'unavailable' ? <strong>Live feed unavailable — using the selected research scenario.</strong> : null}
            {liveWeather ? <small>Observed {liveWeather.observedAt.slice(11)} PDT · Sun path recalculates for today’s selected departure time.</small> : null}
          </div>
          <button type="button" onClick={refreshLiveWeather}>Refresh</button>
        </section>

        <div className="controls-row">
          <label>
            <span>Departure today</span>
            <input aria-label="Departure time" type="time" value={time} min="07:00" max="19:00" step="900" onChange={(event) => { if (isClockTime(event.target.value)) setTime(event.target.value); }} />
          </label>
          {liveState === 'unavailable' ? <label>
            <span>Fallback conditions</span>
            <select aria-label="Weather scenario" value={scenarioId} onChange={(event) => setScenarioId(event.target.value as WeatherScenarioId)}>
              {weatherScenarios.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
          </label> : <div className="sun-metrics"><span>Sun bearing</span><strong>{Math.round(sun.azimuthDegrees)}°</strong></div>}
        </div>
        <p className="scenario-description">{liveWeather ? `Live radiation and weather are applied to the route score; sun geometry uses ${liveWeather.localDate} in Santa Monica.` : scenario.description}</p>
        <label className="shadow-toggle"><input type="checkbox" checked={showShadows} onChange={(event) => setShowShadows(event.target.checked)} /> Show LiDAR ray-cast building and canopy shadows</label>

        {routeState.message ? <div className="notice">{routeState.message}</div> : null}
        {fastest && cooler ? (
          <section className="route-options" aria-label="Route comparisons">
            <button type="button" className={`route-card fastest ${selectedRoute === 'fastest' ? 'selected' : ''}`} onClick={() => setSelectedRoute('fastest')}>
              <span className="route-label">Fastest</span>
              <strong>{minutes(fastest.minutes)}</strong>
              <span>{minutes(fastest.directSunMinutes)} in modeled direct sun</span>
              <small>Heat score {fastest.heatScore} · {Math.round(fastest.confidence * 100)}% confidence</small>
            </button>
            <button type="button" className={`route-card cooler ${selectedRoute === 'cooler' ? 'selected' : ''}`} onClick={() => setSelectedRoute('cooler')}>
              <span className="route-label">Cooler</span>
              <strong>{minutes(cooler.minutes)}</strong>
              <span>{minutes(cooler.directSunMinutes)} in modeled direct sun</span>
              <small>Heat score {cooler.heatScore} · {Math.round(cooler.confidence * 100)}% confidence</small>
            </button>
          </section>
        ) : null}

        {fastest && cooler ? (
          <section className="explanation">
            <span className="spark" aria-hidden="true">✦</span>
            <p>{reduction > 0 ? `The cooler option is modeled to spend ${reduction}% less time in direct sun${addedMinutes ? ` for about ${addedMinutes} extra minute${addedMinutes === 1 ? '' : 's'}` : ''}.` : 'At this time and under these conditions, the fastest route is also the best available lower-exposure option.'}</p>
          </section>
        ) : null}

        <footer>
          Research-only exposure model · Not medical guidance · <a href="https://github.com/heat-route/santa-monica-mvp/tree/main/docs" target="_blank" rel="noreferrer">Methodology</a>
        </footer>
      </aside>
    </main>
  );
}
