import React from 'react';
import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import Notifications from '@/scenes/notifications/Notifications';

describe('<Notifications />', () => {
  test('renders title "Notifikasi"', () => {
    render(<Notifications />);
    expect(screen.getByText('Notifikasi')).toBeTruthy();
  });

  test('renders under maintenance message', () => {
    render(<Notifications />);
    expect(
      screen.getByText('Fitur notifikasi sedang dalam pengembangan. Nantikan update selanjutnya!'),
    ).toBeTruthy();
  });

  test('renders coming soon badge', () => {
    render(<Notifications />);
    expect(screen.getByText('Segera Hadir')).toBeTruthy();
  });

  test('renders under maintenance indicator', () => {
    render(<Notifications />);
    expect(screen.getByText('Under Maintenance')).toBeTruthy();
  });

  test('renders bell icon container', () => {
    const { root } = render(<Notifications />);
    expect(root).toBeTruthy();
  });
});
