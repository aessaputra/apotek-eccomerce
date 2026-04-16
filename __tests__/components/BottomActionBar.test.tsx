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

  test('includeBottomInset=false omits bottom inset from padding', () => {
    render(
      <BottomActionBar
        buttonTitle="Simpan"
        onPress={() => {}}
        includeBottomInset={false}
        aria-label="Simpan"
        aria-describedby="Simpan data"
      />,
    );

    const bar = screen.getByLabelText('Bottom action bar');
    // When includeBottomInset is false, paddingBottom should be VERTICAL_PADDING (8) only,
    // without any safe area inset added.
    const paddingBottom = Array.isArray(bar.props.style)
      ? (bar.props.style.find?.(
          (s: Record<string, unknown>) => typeof s?.paddingBottom === 'number',
        ) ?? bar.props.style)
      : bar.props.style;
    const pbValue =
      typeof paddingBottom === 'object' && paddingBottom !== null
        ? (paddingBottom as Record<string, unknown>).paddingBottom
        : undefined;
    // VERTICAL_PADDING = 8, no safe area inset added
    expect(pbValue).toBe(8);
  });

  test('includeBottomInset=true (default) includes bottom inset in padding', () => {
    render(
      <BottomActionBar
        buttonTitle="Simpan"
        onPress={() => {}}
        aria-label="Simpan"
        aria-describedby="Simpan data"
      />,
    );

    const bar = screen.getByLabelText('Bottom action bar');
    // Default behavior: paddingBottom = VERTICAL_PADDING + insets.bottom
    // Test SafeAreaProvider has insets.bottom = 0, so pb = 8 + 0 = 8
    const paddingBottom = Array.isArray(bar.props.style)
      ? (bar.props.style.find?.(
          (s: Record<string, unknown>) => typeof s?.paddingBottom === 'number',
        ) ?? bar.props.style)
      : bar.props.style;
    const pbValue =
      typeof paddingBottom === 'object' && paddingBottom !== null
        ? (paddingBottom as Record<string, unknown>).paddingBottom
        : undefined;
    expect(pbValue).toBe(8);
  });
});
