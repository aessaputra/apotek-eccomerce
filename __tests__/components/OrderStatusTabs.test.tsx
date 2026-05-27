import { describe, expect, jest, test } from '@jest/globals';
import { ScrollView, StyleSheet } from 'react-native';
import type { ReactTestInstance } from 'react-test-renderer';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import {
  OrderStatusTabs,
  getOrderStatusTabWidth,
  type OrderTab,
} from '@/components/elements/OrderStatusTabs';

const counts = {
  unpaid: 2,
  packing: 0,
  shipped: 101,
  completed: 1,
  cancelled: 3,
};

function flattenStyle(node: ReactTestInstance) {
  return (StyleSheet.flatten(node.props.style) ?? {}) as Record<string, unknown>;
}

function findAncestorWithStyle(
  node: ReactTestInstance,
  matcher: (style: Record<string, unknown>) => boolean,
) {
  let current = node.parent;

  while (current) {
    const style = flattenStyle(current);

    if (matcher(style)) {
      return current;
    }

    current = current.parent;
  }

  throw new Error('Expected ancestor style was not found');
}

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

  test('sizes tabs so exactly four statuses fit before horizontal swipe', () => {
    const screenWidth = 390;
    const horizontalPadding = 12 * 2;
    const tabGap = 6;
    const tabWidth = getOrderStatusTabWidth(screenWidth);
    const firstFourTabsWidth = horizontalPadding + tabWidth * 4 + tabGap * 3;
    const firstFiveTabsWidth = horizontalPadding + tabWidth * 5 + tabGap * 4;

    expect(tabWidth).toBe(87);
    expect(firstFourTabsWidth).toBe(screenWidth);
    expect(firstFiveTabsWidth).toBeGreaterThan(screenWidth);
  });

  test('reserves consistent icon and two-line label slots for every tab', () => {
    render(<OrderStatusTabs activeTab="all" counts={counts} onTabChange={() => {}} />);

    const labels = screen.getAllByText(
      /Semua pesanan|Belum Bayar|Dikemas|Dikirim|Selesai|Dibatalkan/,
    );

    labels.forEach(label => {
      const labelStyle = flattenStyle(label);
      const tabButton = findAncestorWithStyle(label, style => style.height === 76);
      const tabButtonStyle = flattenStyle(tabButton);

      expect(label.props.numberOfLines).toBe(2);
      expect(labelStyle.height).toBe(28);
      expect(labelStyle.lineHeight).toBe(14);
      expect(tabButtonStyle.height).toBe(76);
      expect(tabButtonStyle.minHeight).toBe(76);
      expect(tabButtonStyle.justifyContent).toBe('flex-start');
      expect(tabButtonStyle.gap).toBe(4);
    });
  });
});
