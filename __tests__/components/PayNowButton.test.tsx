import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@/test-utils/renderWithTheme';
import { PayNowButton } from '@/components/elements/PayNowButton';

const mockHandlePayNow = jest.fn<() => Promise<void>>();
const mockUsePayNow = jest.fn();

jest.mock('@/hooks/usePayNow', () => ({
  usePayNow: (...args: unknown[]) => mockUsePayNow(...args),
}));

describe('PayNowButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHandlePayNow.mockResolvedValue(undefined);
    mockUsePayNow.mockReturnValue({
      isProcessing: false,
      handlePayNow: mockHandlePayNow,
    });
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
    mockUsePayNow.mockReturnValue({
      isProcessing: true,
      handlePayNow: mockHandlePayNow,
    });

    render(<PayNowButton orderId="order-123" />);

    await waitFor(() => {
      expect(screen.getByText('Memproses...')).toBeTruthy();
    });
  });

  test('delegates pay-now press handling to the hook', async () => {
    render(<PayNowButton orderId="order-123" />);

    fireEvent.press(screen.getByText('Bayar Sekarang'));

    await waitFor(() => {
      expect(mockHandlePayNow).toHaveBeenCalledTimes(1);
    });
  });

  test('passes callbacks and disabled state through the pay-now hook', () => {
    const mockOnPaymentStart = jest.fn();
    const mockOnError = jest.fn();

    render(
      <PayNowButton
        orderId="order-123"
        disabled
        onPaymentStart={mockOnPaymentStart}
        onError={mockOnError}
      />,
    );

    expect(mockUsePayNow).toHaveBeenCalledWith({
      orderId: 'order-123',
      disabled: true,
      onPaymentStart: mockOnPaymentStart,
      onPaymentComplete: undefined,
      onError: mockOnError,
    });
  });

  test('renders disabled copy for expired orders', () => {
    render(<PayNowButton orderId="order-123" disabled />);

    expect(screen.getByText('Kadaluarsa')).toBeTruthy();
  });
});
