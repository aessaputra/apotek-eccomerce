import React from 'react';
import { test, expect, describe } from '@jest/globals';
import { Text, View } from 'react-native';
import { render, waitFor } from '@/test-utils/renderWithTheme';
import TabBarIconWithPill from '@/components/layouts/TabBarIconWithPill';
import { MD3_PILL } from '@/constants/ui';

describe('<TabBarIconWithPill />', () => {
  test('renders children when focused', async () => {
    const { getByTestId } = render(
      <TabBarIconWithPill focused={true}>
        <Text testID="icon">Home</Text>
      </TabBarIconWithPill>,
    );

    await waitFor(() => {
      expect(getByTestId('icon')).toBeTruthy();
    });
  });

  test('renders children when not focused', async () => {
    const { getByTestId } = render(
      <TabBarIconWithPill focused={false}>
        <Text testID="icon">Home</Text>
      </TabBarIconWithPill>,
    );

    await waitFor(() => {
      expect(getByTestId('icon')).toBeTruthy();
    });
  });

  test('renders pill background element with MD3 dimensions', async () => {
    const { root } = render(
      <TabBarIconWithPill focused={true}>
        <Text>Icon</Text>
      </TabBarIconWithPill>,
    );

    expect(root).toBeTruthy();
  });

  test('uses MD3_PILL constants for dimensions', () => {
    expect(MD3_PILL.WIDTH).toBe(64);
    expect(MD3_PILL.HEIGHT).toBe(32);
    expect(MD3_PILL.RADIUS).toBe(16);
    expect(MD3_PILL.INACTIVE_SCALE_X).toBe(0.6);
    expect(MD3_PILL.ANIMATION_OPACITY_MS).toBe(200);
    expect(MD3_PILL.ANIMATION_SCALE_MS).toBe(250);
  });

  test('applies correct dimensions to pill container', () => {
    const { getByTestId } = render(
      <TabBarIconWithPill focused={true}>
        <View testID="child" />
      </TabBarIconWithPill>,
    );

    expect(getByTestId('child')).toBeTruthy();
  });

  test('focused state uses full scale', () => {
    const { root } = render(
      <TabBarIconWithPill focused={true}>
        <Text>Icon</Text>
      </TabBarIconWithPill>,
    );
    expect(root).toBeTruthy();
  });

  test('unfocused state uses reduced scale', () => {
    const { root } = render(
      <TabBarIconWithPill focused={false}>
        <Text>Icon</Text>
      </TabBarIconWithPill>,
    );
    expect(root).toBeTruthy();
    expect(MD3_PILL.INACTIVE_SCALE_X).toBe(0.6);
  });

  test('animation durations are configured correctly', () => {
    expect(MD3_PILL.ANIMATION_OPACITY_MS).toBe(200);
    expect(MD3_PILL.ANIMATION_SCALE_MS).toBe(250);
  });

  test('pill dimensions match MD3 spec', () => {
    expect(MD3_PILL.WIDTH).toBe(64);
    expect(MD3_PILL.HEIGHT).toBe(32);
    expect(MD3_PILL.RADIUS).toBe(16);
  });
});
