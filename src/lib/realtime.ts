import type { ExposureConditions, LiveWeather, SolarPosition } from '../data/types';

export const SANTA_MONICA_CENTER = [-118.4912, 34.0195] as const;
export const SANTA_MONICA_TIMEZONE = 'America/Los_Angeles';

interface OpenMeteoResponse {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    cloud_cover: number;
    wind_speed_10m: number;
    direct_radiation: number;
    diffuse_radiation: number;
    shortwave_radiation: number;
  };
  daily: { sunrise: string[]; sunset: string[] };
}

export async function loadLiveWeather(signal?: AbortSignal): Promise<LiveWeather> {
  const params = new URLSearchParams({
    latitude: String(SANTA_MONICA_CENTER[1]),
    longitude: String(SANTA_MONICA_CENTER[0]),
    current: 'temperature_2m,apparent_temperature,relative_humidity_2m,cloud_cover,wind_speed_10m,shortwave_radiation,direct_radiation,diffuse_radiation,is_day',
    daily: 'sunrise,sunset',
    timezone: SANTA_MONICA_TIMEZONE,
    forecast_days: '1',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { signal });
  if (!response.ok) throw new Error(`Live weather request failed (${response.status})`);
  const data = await response.json() as OpenMeteoResponse;
  const current = data.current;
  return {
    observedAt: current.time,
    localDate: current.time.slice(0, 10),
    timezone: data.timezone,
    temperatureC: current.temperature_2m,
    apparentTemperatureC: current.apparent_temperature,
    relativeHumidity: current.relative_humidity_2m,
    cloudCover: current.cloud_cover,
    windSpeedKph: current.wind_speed_10m,
    directRadiationWm2: current.direct_radiation,
    diffuseRadiationWm2: current.diffuse_radiation,
    shortwaveRadiationWm2: current.shortwave_radiation,
    sunrise: data.daily.sunrise[0],
    sunset: data.daily.sunset[0],
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function liveExposureConditions(weather: LiveWeather | null, sun: SolarPosition, fallback: ExposureConditions): ExposureConditions {
  if (!weather) return { ...fallback, solarElevationDegrees: sun.elevationDegrees };
  const clearSkyDirect = Math.max(90, 950 * Math.max(0.1, Math.sin((Math.max(0, sun.elevationDegrees) * Math.PI) / 180)));
  const radiationMultiplier = clamp((weather.directRadiationWm2 + weather.diffuseRadiationWm2 * 0.12) / clearSkyDirect, 0.08, 1.15);
  const heatMultiplier = clamp(
    0.78 + (weather.apparentTemperatureC - 18) * 0.028 + (weather.relativeHumidity - 50) * 0.0015 - weather.windSpeedKph * 0.006,
    0.65,
    1.45,
  );
  return { radiationMultiplier, heatMultiplier, solarElevationDegrees: sun.elevationDegrees };
}
