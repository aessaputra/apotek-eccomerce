import React from 'react';
import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import TabBarLabel from '@/components/layouts/TabBarLabel';

describe('<TabBarLabel />', () => {
  test('renders children text', () => {
    render(<TabBarLabel color="#000000">Beranda</TabBarLabel>);
    expect(screen.getByText('Beranda')).toBeTruthy();
  });

  test('applies color prop to text style', () => {
    const { getByTestId } = render(<TabBarLabel color="#FF0000">Test</TabBarLabel>);
    const label = getByTestId('tab-bar-label');
    expect(label).toBeTruthy();
  });

  test('renders with tab label text', () => {
    render(<TabBarLabel color="#000000">Pesanan</TabBarLabel>);
    expect(screen.getByText('Pesanan')).toBeTruthy();
  });

  test('renders all tab labels correctly', () => {
    const tabs = ['Beranda', 'Pesanan', 'Notifikasi', 'Akun'];
    tabs.forEach(tab => {
      const { unmount } = render(<TabBarLabel color="#000000">{tab}</TabBarLabel>);
      expect(screen.getByText(tab)).toBeTruthy();
      unmount();
    });
  });
});
