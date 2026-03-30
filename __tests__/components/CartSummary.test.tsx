import { test, expect } from '@jest/globals';
import { render, renderWithDarkTheme, screen } from '@/test-utils/renderWithTheme';
import CartSummaryComponent from '@/components/elements/CartSummary/CartSummary';

function formatRupiah(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

describe('<CartSummary />', () => {
  test('renders subtotal, shipping, and total', async () => {
    render(
      <CartSummaryComponent
        subtotal={100000}
        shippingCost={15000}
        shippingName="JNE Regular"
        itemCount={2}
      />,
    );

    expect(screen.getByText('Subtotal (2 items)')).not.toBeNull();
    expect(screen.getByText(formatRupiah(100000))).not.toBeNull();
    expect(screen.getByText(formatRupiah(15000))).not.toBeNull();
    expect(screen.getByText('JNE Regular')).not.toBeNull();
    expect(screen.getByText(formatRupiah(115000))).not.toBeNull();
  });

  test('shows courier prompt when shipping is unavailable', async () => {
    render(<CartSummaryComponent subtotal={100000} shippingCost={null} itemCount={1} />);

    expect(screen.getByText('Pilih kurir')).not.toBeNull();
    expect(screen.getByText('Subtotal (1 item)')).not.toBeNull();
  });

  test('renders in dark theme', async () => {
    renderWithDarkTheme(
      <CartSummaryComponent subtotal={50000} shippingCost={5000} itemCount={1} />,
    );

    expect(screen.getByText(formatRupiah(55000))).not.toBeNull();
  });
});
