import React from 'react';
import { StyleSheet } from 'react-native';
import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import TabBarLabel from '@/components/layouts/TabBarLabel';
import { TAB_BAR_LABEL_NUMBER_OF_LINES, TAB_BAR_LABEL_SIZES } from '@/constants/ui';

describe('<TabBarLabel />', () => {
  test('renders children text', () => {
    render(<TabBarLabel color="#000000">Beranda</TabBarLabel>);
    expect(screen.getByText('Beranda')).toBeTruthy();
  });

  test('accepts a color prop without breaking render', () => {
    render(<TabBarLabel color="#FF0000">Test</TabBarLabel>);
    expect(screen.getByText('Test')).toBeTruthy();
  });

  test('keeps single-line truncation props without auto-shrinking', () => {
    const { getByTestId } = render(<TabBarLabel color="#000000">Notifikasi</TabBarLabel>);
    const label = getByTestId('tab-bar-label');
    const flattenedStyle = StyleSheet.flatten(label.props.style);

    expect(flattenedStyle?.fontFamily).toBe('poppins_semiBold');
    expect(label.props.adjustsFontSizeToFit).toBeUndefined();
    expect(label.props.minimumFontScale).toBeUndefined();
    expect(label.props.maxFontSizeMultiplier).toBe(1);
    expect(label.props.numberOfLines).toBe(TAB_BAR_LABEL_NUMBER_OF_LINES);
  });

  test('uses the larger lg label size baseline', () => {
    expect(TAB_BAR_LABEL_SIZES.lg).toBe(14);
    expect(TAB_BAR_LABEL_SIZES.xs).toBe(11);
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
