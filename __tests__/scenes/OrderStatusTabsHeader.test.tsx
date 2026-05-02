import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import { OrderStatusTabsHeader } from '@/scenes/orders/OrderStatusTabsHeader';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({
    user: { id: 'user-1' },
  }),
}));

jest.mock('@/hooks/useOrderTabCounts', () => ({
  useOrderTabCounts: () => ({
    counts: {
      unpaid: 0,
      packing: 0,
      shipped: 0,
      completed: 0,
      cancelled: 0,
    },
    isLoading: true,
    error: null,
    refresh: jest.fn(),
  }),
}));

describe('<OrderStatusTabsHeader />', () => {
  test('renders the tab labels without badges while counts are loading', () => {
    render(<OrderStatusTabsHeader activeTab="packing" />);

    expect(screen.getByText('Semua pesanan')).toBeTruthy();
    expect(screen.getByText('Belum Bayar')).toBeTruthy();
    expect(screen.getByText('Dikemas')).toBeTruthy();
    expect(screen.getByText('Dikirim')).toBeTruthy();
    expect(screen.getByText('Selesai')).toBeTruthy();
    expect(screen.getByText('Dibatalkan')).toBeTruthy();
    expect(screen.queryByText('1')).toBeNull();
    expect(screen.queryByText('99+')).toBeNull();
  });

  test('navigates to the matching order route when a tab is selected', () => {
    render(<OrderStatusTabsHeader activeTab="packing" />);

    fireEvent.press(screen.getByText('Semua pesanan'));
    expect(mockPush).toHaveBeenCalledWith('/orders/all');

    fireEvent.press(screen.getByText('Dibatalkan'));
    expect(mockPush).toHaveBeenCalledWith('/orders/cancelled');
  });
});
