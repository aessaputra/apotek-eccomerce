import { describe, expect, jest, test } from '@jest/globals';
import { ScrollView } from 'react-native';
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
  test('renders tab labels in order and non-zero status badge counts', () => {
    render(<OrderStatusTabs activeTab="shipped" counts={counts} onTabChange={() => {}} />);

    const labels = screen
      .getAllByText(/Semua pesanan|Belum Bayar|Dikemas|Dikirim|Selesai|Dibatalkan/)
      .map(label => label.props.children);

    expect(labels).toEqual([
      'Semua pesanan',
      'Belum Bayar',
      'Dikemas',
      'Dikirim',
      'Selesai',
      'Dibatalkan',
    ]);
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('99+')).toBeTruthy();
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.queryByText('0')).toBeNull();
  });

  test('marks all tab active and calls onTabChange when pressed', () => {
    const onTabChange = jest.fn<(tab: OrderTab) => void>();

    render(<OrderStatusTabs activeTab="all" counts={counts} onTabChange={onTabChange} />);

    const allTab = screen.getByLabelText('Semua pesanan, tab pesanan aktif');

    expect(allTab.props.accessibilityRole).toBe('tab');
    expect(allTab.props.accessibilityState).toEqual({ selected: true });

    fireEvent.press(screen.getByText('Semua pesanan'));

    expect(onTabChange).toHaveBeenCalledWith('all');
  });

  test('calls onTabChange with the pressed status tab key', () => {
    const onTabChange = jest.fn<(tab: OrderTab) => void>();

    render(<OrderStatusTabs counts={counts} onTabChange={onTabChange} />);

    fireEvent.press(screen.getByText('Dibatalkan'));

    expect(onTabChange).toHaveBeenCalledWith('cancelled');
  });

  test('never renders a badge for all orders even if an extra all count is provided', () => {
    const countsWithAll = {
      ...counts,
      all: 107,
    };

    render(<OrderStatusTabs activeTab="all" counts={countsWithAll} onTabChange={() => {}} />);

    expect(screen.queryByText('107')).toBeNull();
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText('99+')).toBeTruthy();
  });

  test('keeps tabs in a horizontal scroll row', () => {
    const { UNSAFE_getByType } = render(
      <OrderStatusTabs activeTab="all" counts={counts} onTabChange={() => {}} />,
    );

    const scrollView = UNSAFE_getByType(ScrollView);

    expect(scrollView.props.horizontal).toBe(true);
    expect(scrollView.props.showsHorizontalScrollIndicator).toBe(false);
    expect(scrollView.props.contentContainerStyle).toEqual({
      paddingHorizontal: 12,
      gap: 6,
    });
  });
});
