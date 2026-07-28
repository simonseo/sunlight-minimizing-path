import type { Coordinate, SolarPosition } from '../data/types';

function degrees(value: number) {
  return (value * 180) / Math.PI;
}

function radians(value: number) {
  return (value * Math.PI) / 180;
}

function timeZoneOffsetHours(date: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => ({ ...result, [part.type]: part.value }), {});
  const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second));
  return (localAsUtc - date.getTime()) / 3_600_000;
}

function zonedTimeToUtc(date: string, time: string, timezone: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  const localAsUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const offset = timeZoneOffsetHours(localAsUtc, timezone);
  return new Date(localAsUtc.getTime() - offset * 3_600_000);
}

/** NOAA solar-position equations, calculated for the chosen local date, time, and coordinate. */
export function solarPosition(date: string, time: string, coordinate: Coordinate, timezone: string): SolarPosition {
  const instant = zonedTimeToUtc(date, time, timezone);
  const julianDay = instant.getTime() / 86_400_000 + 2_440_587.5;
  const century = (julianDay - 2_451_545) / 36_525;
  const meanLongitude = (280.46646 + century * (36_000.76983 + century * 0.0003032)) % 360;
  const meanAnomaly = 357.52911 + century * (35_999.05029 - 0.0001537 * century);
  const eccentricity = 0.016708634 - century * (0.000042037 + 0.0000001267 * century);
  const equationCenter = Math.sin(radians(meanAnomaly)) * (1.914602 - century * (0.004817 + 0.000014 * century))
    + Math.sin(radians(2 * meanAnomaly)) * (0.019993 - 0.000101 * century)
    + Math.sin(radians(3 * meanAnomaly)) * 0.000289;
  const trueLongitude = meanLongitude + equationCenter;
  const omega = 125.04 - 1934.136 * century;
  const apparentLongitude = trueLongitude - 0.00569 - 0.00478 * Math.sin(radians(omega));
  const meanObliquity = 23 + (26 + ((21.448 - century * (46.815 + century * (0.00059 - century * 0.001813))) / 60)) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(radians(omega));
  const declination = degrees(Math.asin(Math.sin(radians(obliquity)) * Math.sin(radians(apparentLongitude))));
  const y = Math.tan(radians(obliquity / 2)) ** 2;
  const equationOfTime = 4 * degrees(
    y * Math.sin(2 * radians(meanLongitude))
    - 2 * eccentricity * Math.sin(radians(meanAnomaly))
    + 4 * eccentricity * y * Math.sin(radians(meanAnomaly)) * Math.cos(2 * radians(meanLongitude))
    - 0.5 * y * y * Math.sin(4 * radians(meanLongitude))
    - 1.25 * eccentricity * eccentricity * Math.sin(2 * radians(meanAnomaly)),
  );
  const offsetHours = timeZoneOffsetHours(instant, timezone);
  const localMinutes = Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
  const trueSolarMinutes = ((localMinutes + equationOfTime + 4 * coordinate[0] - 60 * offsetHours) % 1440 + 1440) % 1440;
  const hourAngle = trueSolarMinutes / 4 - 180;
  const latitude = radians(coordinate[1]);
  const declinationRadians = radians(declination);
  const zenith = degrees(Math.acos(
    Math.min(1, Math.max(-1, Math.sin(latitude) * Math.sin(declinationRadians)
      + Math.cos(latitude) * Math.cos(declinationRadians) * Math.cos(radians(hourAngle)))),
  ));
  const elevationDegrees = 90 - zenith;
  const azimuthDenominator = Math.cos(latitude) * Math.sin(radians(zenith));
  const azimuthArgument = Math.min(1, Math.max(-1, (Math.sin(latitude) * Math.cos(radians(zenith)) - Math.sin(declinationRadians)) / Math.max(azimuthDenominator, 1e-8)));
  const azimuthDegrees = hourAngle > 0 ? (degrees(Math.acos(azimuthArgument)) + 180) % 360 : (540 - degrees(Math.acos(azimuthArgument))) % 360;
  return { azimuthDegrees, elevationDegrees };
}
