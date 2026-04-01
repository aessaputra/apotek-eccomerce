import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon/HeaderCartIcon';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe('<HeaderCartIcon />', () => {
  test('navigates to cart when pressed', async () => {
    render(<HeaderCartIcon />);

    fireEvent.press(screen.getByLabelText('Keranjang'));
    expect(mockPush).toHaveBeenCalledWith('/cart');
  });

  test('renders in dark theme and header-right mode', async () => {
    renderWithDarkTheme(<HeaderCartIcon forHeaderRight />);
    expect(screen.getByLabelText('Keranjang')).not.toBeNull();
  });
});
