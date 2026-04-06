import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@/test-utils/renderWithTheme';
import { PayNowButton } from '@/components/elements/PayNowButton';

const mockPush = jest.fn();
const mockCreateSnapToken = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/services/checkout.service', () => ({
  createSnapToken: (...args: unknown[]) => mockCreateSnapToken(...args),
}));

describe('PayNowButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders with default text', () => {
    render(<PayNowButton orderId="order-123" />);

    expect(screen.getByText('Bayar Sekarang')).toBeTruthy();
  });

  test('renders with order number', () => {
    render(<PayNowButton orderId="order-123" orderNumber="ORDER-001" />);

    expect(screen.getByLabelText('Bayar pesanan ORDER-001')).toBeTruthy();
  });

  test('shows loading state when processing', async () => {
    (mockCreateSnapToken as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<PayNowButton orderId="order-123" />);

    fireEvent.press(screen.getByText('Bayar Sekarang'));

    await waitFor(() => {
      expect(screen.getByText('Memproses...')).toBeTruthy();
    });
  });

  test('navigates to payment on success', async () => {
    (mockCreateSnapToken as jest.Mock).mockReturnValue(
      Promise.resolve({
        data: {
          snapToken: 'abc123',
          redirectUrl: 'https://app.midtrans.com/snap/v1/abc123',
        },
        error: null,
      }),
    );

    render(<PayNowButton orderId="order-123" />);

    fireEvent.press(screen.getByText('Bayar Sekarang'));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/cart/payment',
        params: {
          paymentUrl: 'https://app.midtrans.com/snap/v1/abc123',
          orderId: 'order-123',
        },
      });
    });
  });

  test('calls onError callback on failure', async () => {
    const mockOnError = jest.fn();
    (mockCreateSnapToken as jest.Mock).mockReturnValue(
      Promise.resolve({
        data: null,
        error: new Error('Network error'),
      }),
    );

    render(<PayNowButton orderId="order-123" onError={mockOnError} />);

    fireEvent.press(screen.getByText('Bayar Sekarang'));

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalled();
    });
  });

  test('calls onPaymentStart callback when clicked', async () => {
    const mockOnPaymentStart = jest.fn();
    (mockCreateSnapToken as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<PayNowButton orderId="order-123" onPaymentStart={mockOnPaymentStart} />);

    fireEvent.press(screen.getByText('Bayar Sekarang'));

    await waitFor(() => {
      expect(mockOnPaymentStart).toHaveBeenCalled();
    });
  });

  test('prevents double submission', async () => {
    (mockCreateSnapToken as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<PayNowButton orderId="order-123" />);

    const button = screen.getByText('Bayar Sekarang');
    fireEvent.press(button);
    fireEvent.press(button);

    await waitFor(() => {
      expect(mockCreateSnapToken).toHaveBeenCalledTimes(1);
    });
  });
});
