import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent } from '@testing-library/react-native';
import { render, screen } from '@/test-utils/renderWithTheme';
import { OrderCard } from '@/components/elements/OrderCard';
import type { OrderListItem } from '@/services';

const mockPress = jest.fn();

const order: OrderListItem = {
  id: 'abcd1234efgh',
  created_at: '2026-01-05T08:15:00Z',
  expired_at: null,
  midtrans_order_id: 'MID-123',
  gross_amount: 55000,
  total_amount: 55000,
  courier_code: null,
  courier_service: null,
  payment_status: 'settlement',
  status: 'delivered',
  customer_completion_stage: 'completed',
  customer_order_bucket: 'completed',
  order_items: [
    {
      id: 'item-1',
      order_id: 'abcd1234efgh',
      product_id: 'product-1',
      quantity: 2,
      price_at_purchase: 27500,
      products: {
        id: 'product-1',
        name: 'Paracetamol',
        slug: 'paracetamol',
      },
    },
  ],
};

describe('<OrderCard />', () => {
  test('shows the visible order summary and handles presses', () => {
    render(<OrderCard order={order} onPress={mockPress} />);

    expect(screen.getByText('APT-ABCD1234')).toBeTruthy();
    expect(screen.getByText('Paracetamol')).toBeTruthy();
    expect(screen.getByText('Rp 55.000')).toBeTruthy();

    fireEvent.press(screen.getByText('Paracetamol'));

    expect(mockPress).toHaveBeenCalledTimes(1);
  });
});
