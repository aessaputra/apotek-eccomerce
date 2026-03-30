import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import BottomActionBar from '@/components/layouts/BottomActionBar/BottomActionBar';

describe('<BottomActionBar />', () => {
  test('renders toolbar and primary action', async () => {
    const onPressMock = jest.fn();
    const onPress = () => {
      onPressMock();
    };

    render(
      <BottomActionBar
        buttonTitle="Lanjut Checkout"
        onPress={onPress}
        aria-label="Checkout sekarang"
        aria-describedby="Melanjutkan ke pembayaran"
      />,
    );

    expect(screen.getByLabelText('Bottom action bar')).not.toBeNull();
    expect(screen.getByText('Lanjut Checkout')).not.toBeNull();

    fireEvent.press(screen.getByLabelText('Checkout sekarang'));
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  test('renders in dark theme', async () => {
    const onPressMock = jest.fn();
    const onPress = () => {
      onPressMock();
    };

    renderWithDarkTheme(
      <BottomActionBar
        buttonTitle="Bayar Sekarang"
        onPress={onPress}
        aria-label="Bayar sekarang"
        aria-describedby="Menyelesaikan pesanan"
      />,
    );

    expect(screen.getByText('Bayar Sekarang')).not.toBeNull();
  });
});
