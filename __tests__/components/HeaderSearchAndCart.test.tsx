import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import HeaderSearchAndCart from '@/components/layouts/HeaderSearchAndCart/HeaderSearchAndCart';

jest.mock('@/components/layouts/HeaderCartIcon', () => ({
  __esModule: true,
  default: () => {
    const { Text } = jest.requireActual('react-native') as typeof import('react-native');
    return <Text>Cart Icon</Text>;
  },
}));

describe('<HeaderSearchAndCart />', () => {
  test('renders search affordance and forwards press', async () => {
    const onSearchPress = jest.fn();
    render(<HeaderSearchAndCart onSearchPress={onSearchPress} />);

    expect(screen.getByText('Cari produk...')).not.toBeNull();
    expect(screen.getByText('Cart Icon')).not.toBeNull();

    fireEvent.press(screen.getByLabelText('Cari produk'));
    expect(onSearchPress).toHaveBeenCalledTimes(1);
  });

  test('renders in dark theme', async () => {
    renderWithDarkTheme(<HeaderSearchAndCart />);
    expect(screen.getByText('Cari produk...')).not.toBeNull();
  });
});
