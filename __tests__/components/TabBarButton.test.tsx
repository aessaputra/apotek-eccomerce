import React from 'react';
import { Text } from 'react-native';
import { describe, test, expect } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import TabBarButton from '@/components/layouts/TabBarButton';

describe('<TabBarButton />', () => {
  test('renders children', () => {
    render(
      <TabBarButton onPress={() => {}} accessibilityLabel="Test" accessibilityHint="Test hint">
        <Text testID="child">Child Content</Text>
      </TabBarButton>,
    );
    expect(screen.getByTestId('child')).toBeTruthy();
  });

  test('applies accessibility props', () => {
    const { getByRole } = render(
      <TabBarButton
        onPress={() => {}}
        accessibilityLabel="Beranda tab"
        accessibilityHint="Buka halaman beranda"
        accessibilityState={{ selected: true }}>
        <Text>Icon</Text>
      </TabBarButton>,
    );
    const button = getByRole('tab');
    expect(button).toBeTruthy();
    expect(button.props.accessibilityLabel).toBe('Beranda tab');
    expect(button.props.accessibilityHint).toBe('Buka halaman beranda');
  });

  test('renders with Indonesian accessibility hints', () => {
    const hints = [
      { label: 'Navigasi ke Beranda', hint: 'Buka halaman beranda' },
      { label: 'Navigasi ke Pesanan', hint: 'Buka halaman pesanan' },
      { label: 'Navigasi ke Notifikasi', hint: 'Buka halaman notifikasi' },
      { label: 'Navigasi ke Akun', hint: 'Buka halaman akun' },
    ];

    hints.forEach(({ label, hint }) => {
      const { unmount, getByRole } = render(
        <TabBarButton onPress={() => {}} accessibilityLabel={label} accessibilityHint={hint}>
          <Text>Icon</Text>
        </TabBarButton>,
      );
      const button = getByRole('tab');
      expect(button.props.accessibilityLabel).toBe(label);
      expect(button.props.accessibilityHint).toBe(hint);
      unmount();
    });
  });

  test('merges incoming pressable styles with layout defaults', () => {
    const { getByRole } = render(
      <TabBarButton onPress={() => {}} accessibilityLabel="Test" style={{ opacity: 1 }}>
        <Text>Icon</Text>
      </TabBarButton>,
    );

    const button = getByRole('tab');

    expect(button.props.style).toEqual(
      expect.objectContaining({
        flex: 1,
        minWidth: 0,
        opacity: 1,
      }),
    );
  });
});
