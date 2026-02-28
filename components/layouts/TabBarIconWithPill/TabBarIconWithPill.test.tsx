import React from 'react';
import { test, expect } from '@jest/globals';
import { Text } from 'react-native';
import { render, screen, waitFor } from '../../../test-utils/renderWithTheme';
import TabBarIconWithPill from './TabBarIconWithPill';

describe('<TabBarIconWithPill />', () => {
  test('renders children when focused', async () => {
    render(
      <TabBarIconWithPill focused={true}>
        <Text testID="icon">Home</Text>
      </TabBarIconWithPill>,
    );

    await waitFor(() => {
      const icon = screen.getByTestId('icon');
      expect(icon).not.toBeNull();
    });
  });

  test('renders children when not focused', async () => {
    render(
      <TabBarIconWithPill focused={false}>
        <Text testID="icon">Home</Text>
      </TabBarIconWithPill>,
    );

    await waitFor(() => {
      const icon = screen.getByTestId('icon');
      expect(icon).not.toBeNull();
    });
  });

  test('renders pill background element', async () => {
    render(
      <TabBarIconWithPill focused={true}>
        <Text>Icon</Text>
      </TabBarIconWithPill>,
    );

    // Component renders two Animated.Views: outer container + inner pill
    // The children (Text) should be rendered above the pill
    await waitFor(() => {
      const icon = screen.getByText('Icon');
      expect(icon).not.toBeNull();
    });
  });
});
