import { test, expect, jest } from '@jest/globals';
import {
  render,
  renderWithDarkTheme,
  screen,
  fireEvent,
} from '../../../test-utils/renderWithTheme';
import { EmptyCartState } from './EmptyCartState';

describe('<EmptyCartState />', () => {
  test('renders correctly with empty cart message', async () => {
    render(<EmptyCartState onBrowse={() => {}} />);

    expect(screen.getByText('Keranjang Kosong')).toBeTruthy();
    expect(screen.getByText('Belum ada produk di keranjang Anda')).toBeTruthy();
    expect(screen.getByText('Belanja Sekarang')).toBeTruthy();
  });

  test('renders correctly in dark theme', async () => {
    renderWithDarkTheme(<EmptyCartState onBrowse={() => {}} />);

    expect(screen.getByText('Keranjang Kosong')).toBeTruthy();
    expect(screen.getByText('Belanja Sekarang')).toBeTruthy();
  });

  test('calls onBrowse when button pressed', async () => {
    const onBrowse = jest.fn();
    render(<EmptyCartState onBrowse={onBrowse} />);

    fireEvent.press(screen.getByText('Belanja Sekarang'));

    expect(onBrowse).toHaveBeenCalledTimes(1);
  });
});
