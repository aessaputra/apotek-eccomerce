import React from 'react';
import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import TabBarLabel from '@/components/layouts/TabBarLabel';
import {
  TAB_BAR_LABEL_MAX_SIZE,
  TAB_BAR_LABEL_MIN_SIZE,
  TAB_BAR_LABEL_NUMBER_OF_LINES,
  TAB_BAR_LABEL_SIZE,
} from '@/constants/ui';
import { getTabBarLabelFontSize } from '@/utils/tabBarTypography';

jest.mock('@/utils/tabBarTypography', () => ({
  getTabBarLabelFontSize: jest.fn(),
}));

const mockedGetTabBarLabelFontSize = jest.mocked(getTabBarLabelFontSize);

function getExplicitLabelStyle(style: unknown) {
  if (!Array.isArray(style)) {
    return style;
  }

  return [...style]
    .reverse()
    .find(
      entry =>
        typeof entry === 'object' && entry !== null && 'fontSize' in entry && 'color' in entry,
    );
}

describe('<TabBarLabel />', () => {
  beforeEach(() => {
    mockedGetTabBarLabelFontSize.mockReturnValue(TAB_BAR_LABEL_SIZE);
  });

  test('renders children text', () => {
    render(<TabBarLabel color="#000000">Beranda</TabBarLabel>);
    expect(screen.getByText('Beranda')).toBeTruthy();
  });

  test('applies color prop to text style', () => {
    const { getByTestId } = render(<TabBarLabel color="#FF0000">Test</TabBarLabel>);
    const label = getByTestId('tab-bar-label');
    expect(label).toBeTruthy();
  });

  test('uses responsive font sizing without auto-shrinking', () => {
    const { getByTestId } = render(<TabBarLabel color="#000000">Notifikasi</TabBarLabel>);
    const label = getByTestId('tab-bar-label');
    const explicitStyle = getExplicitLabelStyle(label.props.style);

    expect(label.props.adjustsFontSizeToFit).toBeUndefined();
    expect(label.props.minimumFontScale).toBeUndefined();
    expect(label.props.maxFontSizeMultiplier).toBe(1);
    expect(label.props.numberOfLines).toBe(TAB_BAR_LABEL_NUMBER_OF_LINES);
    expect(explicitStyle).toMatchObject({ color: '#000000', fontSize: TAB_BAR_LABEL_SIZE });
  });

  test('uses 10px labels on 320px screens', () => {
    mockedGetTabBarLabelFontSize.mockReturnValue(TAB_BAR_LABEL_MIN_SIZE);

    const { getByTestId } = render(<TabBarLabel color="#000000">Beranda</TabBarLabel>);
    const label = getByTestId('tab-bar-label');
    const explicitStyle = getExplicitLabelStyle(label.props.style);

    expect(explicitStyle).toMatchObject({ color: '#000000', fontSize: TAB_BAR_LABEL_MIN_SIZE });
  });

  test('uses 12px labels on 430px screens', () => {
    mockedGetTabBarLabelFontSize.mockReturnValue(TAB_BAR_LABEL_MAX_SIZE);

    const { getByTestId } = render(<TabBarLabel color="#000000">Notifikasi</TabBarLabel>);
    const label = getByTestId('tab-bar-label');
    const explicitStyle = getExplicitLabelStyle(label.props.style);

    expect(explicitStyle).toMatchObject({ color: '#000000', fontSize: TAB_BAR_LABEL_MAX_SIZE });
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
