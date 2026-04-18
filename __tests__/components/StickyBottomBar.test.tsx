import { test, expect } from '@jest/globals';
import { render, renderWithDarkTheme, screen } from '@/test-utils/renderWithTheme';
import { StickyBottomBar } from '@/components/elements/StickyBottomBar/StickyBottomBar';

describe('<StickyBottomBar />', () => {
  test('renders correctly with grand total', async () => {
    render(<StickyBottomBar grandTotal={100000} onConfirm={() => {}} />);

    expect(screen.getByText('Konfirmasi')).toBeTruthy();
    expect(screen.getByText('Rp 100.000')).toBeTruthy();
  });

  test('renders correctly in dark theme', async () => {
    renderWithDarkTheme(<StickyBottomBar grandTotal={50000} onConfirm={() => {}} />);

    expect(screen.getByText('Konfirmasi')).toBeTruthy();
  });

  test('shows loading state', async () => {
    render(<StickyBottomBar grandTotal={100000} isLoading={true} onConfirm={() => {}} />);

    expect(screen.getByText('Konfirmasi')).toBeTruthy();
  });

  test('shows disabled state', async () => {
    render(<StickyBottomBar grandTotal={100000} disabled={true} onConfirm={() => {}} />);

    expect(screen.getByText('Konfirmasi')).toBeTruthy();
  });

  test('uses custom confirm text', async () => {
    render(<StickyBottomBar grandTotal={100000} confirmText="Bayar" onConfirm={() => {}} />);

    expect(screen.getByText('Bayar')).toBeTruthy();
  });

  test('hides total when hideTotal is true', async () => {
    render(<StickyBottomBar grandTotal={100000} hideTotal onConfirm={() => {}} />);

    expect(screen.queryByText('Total')).toBeNull();
    expect(screen.queryByText('Rp 100.000')).toBeNull();
    expect(screen.getByText('Konfirmasi')).toBeTruthy();
  });

  test('shows total by default when hideTotal is not passed', async () => {
    render(<StickyBottomBar grandTotal={75000} onConfirm={() => {}} />);

    expect(screen.getByText('Total')).toBeTruthy();
    expect(screen.getByText('Rp 75.000')).toBeTruthy();
  });
});
