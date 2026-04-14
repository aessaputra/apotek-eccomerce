import React from 'react';
import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import { render, screen } from '@/test-utils/renderWithTheme';
import Payment from '@/scenes/cart/Payment';

const mockReplace = jest.fn();
const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    replace: mockReplace,
  }),
  useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual('react-native-safe-area-context') as Record<string, unknown>;

  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('react-native-webview', () => ({
  WebView: () => null,
}));

jest.mock('@/hooks/useDataPersist', () => ({
  DataPersistKeys: { CHECKOUT_SESSION: 'CHECKOUT_SESSION' },
  useDataPersist: () => ({
    removePersistData: jest.fn(),
  }),
}));

jest.mock('@/services/checkout.service', () => ({
  pollOrderPaymentStatus: jest.fn(),
}));

jest.mock('@/slices', () => ({
  appActions: {
    invalidateUnpaidOrdersCache: jest.fn(),
    invalidateOrdersByStatusCache: jest.fn(),
  },
  useAppSlice: () => ({
    user: { id: 'user-1' },
    dispatch: jest.fn(),
    markCartCleared: jest.fn(),
  }),
}));

jest.mock('@/components/elements/AppAlertDialog', () => ({
  __esModule: true,
  default: () => null,
}));

describe('<Payment />', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockUseLocalSearchParams.mockReset();
    mockUseLocalSearchParams.mockReturnValue({});
  });

  test('returns users to /orders when the payment URL is missing', () => {
    render(<Payment />);

    fireEvent.press(screen.getByText('Kembali ke Pesanan'));

    expect(mockReplace).toHaveBeenCalledWith('/orders');
  });
});
