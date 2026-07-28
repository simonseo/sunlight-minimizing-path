import { useEffect, useMemo, useState } from 'react';
import { LocationSearch } from './components/LocationSearch';
import { RouteMap } from './components/RouteMap';
import { studyGraph, weatherScenarios } from './data/studyGraph';
import { loadEnvironmentalFeatures } from './data/environment';
import type { EnvironmentalFeatures } from './data/environment';
import type { Place, WeatherScenarioId } from './data/types';
import { isInStudyArea, nearestNode } from './lib/geo';
import { loadRealGraph } from './lib/graphLoader';
import { calculateRoutes } from './lib/routing';

const DEFAULT_ORIGIN: Place = { label: 'Ocean Avenue & Broadway', coordinate: [-118.505, 34.021] };
const DEFAULT_DESTINATION: Place = { label: '26th Street & Broadway', coordinate: [-118.457, 34.021] };

function minutes(value: number) {
  return `${Math.round(value)} min`;
}

export default function App() {
  const [origin, setOrigin] = useState<Place>(DEFAULT_ORIGIN);
  const [destination, setDestination] = useState<Place>(DEFAULT_DESTINATION);
  const [time, setTime] = useState('13:30');
  const [scenarioId, setScenarioId] = useState<WeatherScenarioId>('clear');
  const [selectedRoute, setSelectedRoute] = useState<'fastest' | 'cooler'>('cooler');
  const [graph, setGraph] = useState(studyGraph);
  const [graphSource, setGraphSource] = useState<'study' | 'public'>('study');
  const [showShadows, setShowShadows] = useState(false);
  const [environment, setEnvironment] = useState<EnvironmentalFeatures | null>(null);
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
    if (showShadows && !environment) void loadEnvironmentalFeatures().then(setEnvironment).catch(() => undefined);
  }, [environment, showShadows]);

  const routeState = useMemo(() => {
    if (!isInStudyArea(origin.coordinate) || !isInStudyArea(destination.coordinate)) return { result: null, message: 'Choose two places inside the Santa Monica research area.' };
    const start = nearestNode(graph.nodes, origin.coordinate);
    const end = nearestNode(graph.nodes, destination.coordinate);
    if (start.id === end.id) return { result: null, message: 'Choose locations farther apart to compare routes.' };
    return { result: calculateRoutes(graph, start.id, end.id, time, scenario), message: null };
  }, [graph, origin, destination, scenario, time]);

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
          scenario={scenario}
          environment={environment}
          showShadows={showShadows}
        />
        <div className="map-caption">Modeled direct-sun exposure · {graphSource === 'public' ? 'public-source graph' : '15-minute study mesh'}</div>
      </section>
      <aside className="control-panel">
        <header>
          <p className="eyebrow">Santa Monica research prototype</p>
          <h1>Walk cooler,<br />not merely shorter.</h1>
          <p className="intro">Compare a fastest walk with a route shaped by modeled sun, trees, buildings, and time of day.</p>
          {graphSource === 'public' ? <p className="data-status">{graph.lidar ? 'Public OSM, Santa Monica tree, and LiDAR obstruction data loaded.' : 'Public OSM + Santa Monica tree inventory loaded. Building-shade rasters remain pending LiDAR processing.'}</p> : null}
        </header>

        <div className="search-grid">
          <LocationSearch label="From" value={origin} onSelect={setOrigin} />
          <LocationSearch label="To" value={destination} onSelect={setDestination} />
        </div>

        <div className="controls-row">
          <label>
            <span>Departure</span>
            <input aria-label="Departure time" type="time" value={time} min="07:00" max="19:00" step="900" onChange={(event) => setTime(event.target.value)} />
          </label>
          <label>
            <span>Conditions</span>
            <select aria-label="Weather scenario" value={scenarioId} onChange={(event) => setScenarioId(event.target.value as WeatherScenarioId)}>
              {weatherScenarios.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}
            </select>
          </label>
        </div>
        <p className="scenario-description">{scenario.description}</p>
        <label className="shadow-toggle"><input type="checkbox" checked={showShadows} onChange={(event) => setShowShadows(event.target.checked)} /> Show modeled tree and building shadows</label>

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
