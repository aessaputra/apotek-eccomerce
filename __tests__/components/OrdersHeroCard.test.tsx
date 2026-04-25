import { describe, expect, test } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import { OrdersHeroCard } from '@/components/elements/OrdersHeroCard';

describe('<OrdersHeroCard />', () => {
  test('renders the orders hero copy', () => {
    render(<OrdersHeroCard />);

    expect(screen.getByText('Dari Apotek Langsung ke Tangan Anda')).toBeTruthy();
    expect(
      screen.getByText(
        'Tak perlu repot menebak kapan obat tiba. Pantau setiap tahap penyiapan pesanan hingga pengantaran di sini.',
      ),
    ).toBeTruthy();
  });
});
