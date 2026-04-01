import { test, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@/test-utils/renderWithTheme';
import OrderSuccess from '@/scenes/orders/OrderSuccess';

const mockNavigate = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    navigate: mockNavigate,
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({
    orderId: 'ORDER-123',
  }),
}));

describe('<OrderSuccess />', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  test('navigates to /home when the user presses back to home', async () => {
    render(<OrderSuccess />);

    fireEvent.press(screen.getByText('Kembali ke Beranda'));

    expect(mockNavigate).toHaveBeenCalledWith('/home');
  });

  test('renders the order id summary', async () => {
    render(<OrderSuccess />);

    expect(screen.getByText('Pembayaran Berhasil')).not.toBeNull();
    expect(screen.getByText('ORDER-123')).not.toBeNull();
  });
});
