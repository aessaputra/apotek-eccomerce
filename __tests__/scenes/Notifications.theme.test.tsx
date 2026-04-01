import React from 'react';
import { describe, test, expect } from '@jest/globals';
import { render, renderWithDarkTheme, screen } from '@/test-utils/renderWithTheme';
import Notifications from '@/scenes/notifications/Notifications';

describe('<Notifications /> Theme', () => {
  test('renders in light theme', () => {
    render(<Notifications />);
    expect(screen.getByText('Notifikasi')).toBeTruthy();
    expect(screen.getByText('Segera Hadir')).toBeTruthy();
  });

  test('renders in dark theme', () => {
    renderWithDarkTheme(<Notifications />);
    expect(screen.getByText('Notifikasi')).toBeTruthy();
    expect(screen.getByText('Segera Hadir')).toBeTruthy();
  });

  test('under maintenance text is in English', () => {
    render(<Notifications />);
    expect(screen.getByText('Under Maintenance')).toBeTruthy();
  });

  test('all text elements are present', () => {
    render(<Notifications />);
    expect(screen.getByText('Notifikasi')).toBeTruthy();
    expect(
      screen.getByText('Fitur notifikasi sedang dalam pengembangan. Nantikan update selanjutnya!'),
    ).toBeTruthy();
    expect(screen.getByText('Segera Hadir')).toBeTruthy();
    expect(screen.getByText('Under Maintenance')).toBeTruthy();
  });
});
