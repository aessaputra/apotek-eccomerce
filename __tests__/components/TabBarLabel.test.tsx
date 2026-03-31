import React from 'react';
import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import TabBarLabel from '@/components/layouts/TabBarLabel';
import { TAB_BAR_LABEL_NUMBER_OF_LINES, TAB_BAR_LABEL_SIZE } from '@/constants/ui';

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

  test('keeps fixed typography without font auto-shrinking', () => {
    const { getByTestId } = render(<TabBarLabel color="#000000">Notifikasi</TabBarLabel>);
    const label = getByTestId('tab-bar-label');
    const flattenedStyle = Array.isArray(label.props.style)
      ? Object.assign({}, ...label.props.style)
      : label.props.style;

    expect(label.props.adjustsFontSizeToFit).not.toBe(true);
    expect(label.props.minimumFontScale).toBeUndefined();
    expect(label.props.numberOfLines).toBe(TAB_BAR_LABEL_NUMBER_OF_LINES);
    expect(flattenedStyle.fontSize).toBe(TAB_BAR_LABEL_SIZE);
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
