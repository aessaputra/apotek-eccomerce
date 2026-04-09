import { test, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@/test-utils/renderWithTheme';
import OrderSuccess from '@/scenes/orders/OrderSuccess';

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('@/hooks/useOrderDetail', () => ({
  useOrderDetail: () => ({
    order: {
      id: 'ORDER-123',
      created_at: '2026-01-01T00:00:00Z',
      payment_status: 'settlement',
      total_amount: 10000,
      order_items: [],
    },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    push: mockPush,
  }),
  useLocalSearchParams: () => ({
    orderId: 'ORDER-123',
  }),
  useFocusEffect: (callback: () => void) => callback(),
}));

describe('<OrderSuccess />', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  test('navigates to /(tabs)/home when the user presses back to home', async () => {
    render(<OrderSuccess />);

    fireEvent.press(screen.getByText('Kembali ke Beranda'));

    expect(mockNavigate).toHaveBeenCalledWith('/(tabs)/home');
  });

  test('renders the order id summary', async () => {
    render(<OrderSuccess />);

    expect(screen.getAllByText('Pembayaran Berhasil').length).toBeGreaterThan(0);
    expect(screen.getByText('APT-ORDER-12')).not.toBeNull();
  });
});
