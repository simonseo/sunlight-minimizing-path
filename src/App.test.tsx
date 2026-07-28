import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/RouteMap', () => ({
  RouteMap: () => <div aria-label="Santa Monica heat-route map">Map ready</div>,
}));

vi.mock('./lib/realtime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/realtime')>();
  return {
    ...actual,
    loadLiveWeather: vi.fn().mockResolvedValue({
      observedAt: '2026-07-27T13:30', localDate: '2026-07-27', timezone: 'America/Los_Angeles',
      temperatureC: 23, apparentTemperatureC: 22, relativeHumidity: 61, cloudCover: 12, windSpeedKph: 12,
      directRadiationWm2: 720, diffuseRadiationWm2: 110, shortwaveRadiationWm2: 830,
      sunrise: '2026-07-27T06:02', sunset: '2026-07-27T19:58',
    }),
  };
});

describe('research prototype controls', () => {
  it('renders live weather, solar, and route controls accessibly', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /walk cooler/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'From' })).toHaveValue('Ocean Avenue & Broadway');
    expect(screen.getByRole('textbox', { name: 'To' })).toHaveValue('26th Street & Broadway');
    expect(screen.getByRole('button', { name: /fastest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cooler/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Departure time')).toBeInTheDocument();
    expect(screen.getByText('Live Santa Monica conditions')).toBeInTheDocument();
    expect(await screen.findByText(/22°C feels like/i)).toBeInTheDocument();
    expect(screen.getByText('Sun bearing')).toBeInTheDocument();
  });

  it('updates departure time, shadows, and route selection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await screen.findByText(/22°C feels like/i);
    fireEvent.change(screen.getByLabelText('Departure time'), { target: { value: '09:00' } });
    expect(screen.getByLabelText('Departure time')).toHaveValue('09:00');
    await user.click(screen.getByLabelText(/show modeled tree and building shadows/i));
    expect(screen.getByLabelText(/show modeled tree and building shadows/i)).toBeChecked();
    await user.click(screen.getByRole('button', { name: /fastest/i }));
    expect(screen.getByRole('button', { name: /fastest/i })).toHaveClass('selected');
  });
});
