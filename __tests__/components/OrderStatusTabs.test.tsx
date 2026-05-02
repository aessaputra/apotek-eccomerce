import { describe, expect, jest, test } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import { OrderStatusTabs, type OrderTab } from '@/components/elements/OrderStatusTabs';

const counts = {
  unpaid: 2,
  packing: 0,
  shipped: 101,
  completed: 1,
  cancelled: 3,
};

describe('<OrderStatusTabs />', () => {
  test('renders tab labels and non-zero badge counts', () => {
    render(<OrderStatusTabs activeTab="shipped" counts={counts} onTabChange={() => {}} />);

    const labels = screen
      .getAllByText(/Belum Bayar|Dikemas|Dikirim|Selesai|Dibatalkan/)
      .map(label => label.props.children);

    expect(labels).toEqual(['Belum Bayar', 'Dikemas', 'Dikirim', 'Selesai', 'Dibatalkan']);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('99+')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  test('calls onTabChange with the pressed tab key', () => {
    const onTabChange = jest.fn<(tab: OrderTab) => void>();

    render(<OrderStatusTabs counts={counts} onTabChange={onTabChange} />);

    fireEvent.press(screen.getByText('Dibatalkan'));

    expect(onTabChange).toHaveBeenCalledWith('cancelled');
  });
});
