import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';

vi.mock('./components/RouteMap', () => ({
  RouteMap: () => <div aria-label="Santa Monica heat-route map">Map ready</div>,
}));

describe('research prototype controls', () => {
  it('renders the core route-comparison flow accessibly', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /walk cooler/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'From' })).toHaveValue('Ocean Avenue & Broadway');
    expect(screen.getByRole('textbox', { name: 'To' })).toHaveValue('26th Street & Broadway');
    expect(screen.getByRole('button', { name: /fastest/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cooler/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Departure time')).toBeInTheDocument();
    expect(screen.getByLabelText('Weather scenario')).toBeInTheDocument();
  });

  it('updates the selectable weather scenario and route selection', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.selectOptions(screen.getByLabelText('Weather scenario'), 'marine');
    expect(screen.getByText(/cloud-filtered direct sun/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /fastest/i }));
    expect(screen.getByRole('button', { name: /fastest/i })).toHaveClass('selected');
  });
});
