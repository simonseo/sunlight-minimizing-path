import { describe, expect, it } from 'vitest';
import { solarPosition } from './sun';

const santaMonica = [-118.4912, 34.0195] as const;

describe('solar position', () => {
  it('places the July midday sun high and generally south of Santa Monica', () => {
    const position = solarPosition('2026-07-27', '12:00', santaMonica, 'America/Los_Angeles');
    expect(position.elevationDegrees).toBeGreaterThan(65);
    expect(position.azimuthDegrees).toBeGreaterThan(130);
    expect(position.azimuthDegrees).toBeLessThan(230);
  });

  it('moves from the eastern morning sky to the western afternoon sky and below the horizon at night', () => {
    const morning = solarPosition('2026-07-27', '09:00', santaMonica, 'America/Los_Angeles');
    const afternoon = solarPosition('2026-07-27', '17:00', santaMonica, 'America/Los_Angeles');
    const night = solarPosition('2026-07-27', '23:00', santaMonica, 'America/Los_Angeles');
    expect(morning.azimuthDegrees).toBeLessThan(180);
    expect(afternoon.azimuthDegrees).toBeGreaterThan(180);
    expect(night.elevationDegrees).toBeLessThan(0);
  });
});
