import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render } from '@testing-library/react-native';

type ScreenProps = {
  name: string;
  options?: Record<string, unknown>;
};

const recordedScreens: ScreenProps[] = [];

const MockStack = Object.assign(({ children }: { children: React.ReactNode }) => <>{children}</>, {
  Screen: ({ name, options }: ScreenProps) => {
    recordedScreens.push({ name, options });
    return null;
  },
});

jest.mock('expo-router', () => ({
  Stack: MockStack,
}));

jest.mock('tamagui', () => ({
  useTheme: () => ({}),
}));

jest.mock('@/utils/theme', () => ({
  getStackHeaderOptions: () => ({
    headerTintColor: '#123456',
  }),
}));

jest.mock('@/hooks/withAuthGuard', () => ({
  withAuthGuard: <T extends React.ComponentType>(Component: T) => Component,
}));

describe('app/cart/_layout', () => {
  it('renders the cart index screen with a stable visible header', () => {
    recordedScreens.length = 0;

    const CartLayout = require('@/app/cart/_layout').default as React.ComponentType;
    render(<CartLayout />);

    const indexScreen = recordedScreens.find(screen => screen.name === 'index');

    expect(indexScreen).toBeDefined();
    expect(indexScreen?.options).toMatchObject({
      headerShown: true,
      title: 'Keranjang Saya',
      headerTitleAlign: 'center',
      headerTintColor: '#123456',
    });
  });
});
