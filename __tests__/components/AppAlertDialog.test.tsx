import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import AppAlertDialog from '@/components/elements/AppAlertDialog/AppAlertDialog';

describe('<AppAlertDialog />', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    title: 'Test Title',
    description: 'Test Description',
  };

  test('renders title and description when open', async () => {
    render(<AppAlertDialog {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test Description')).toBeTruthy();
  });

  test('does not render content when closed', async () => {
    render(<AppAlertDialog {...defaultProps} open={false} />);

    expect(screen.queryByText('Test Title')).toBeNull();
    expect(screen.queryByText('Test Description')).toBeNull();
  });

  test('uses default "OK" text for confirm button', async () => {
    render(<AppAlertDialog {...defaultProps} />);

    expect(screen.getByText('OK')).toBeTruthy();
  });

  test('calls onOpenChange(false) and onConfirm when confirm button pressed', async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();
    render(<AppAlertDialog {...defaultProps} onConfirm={onConfirm} onOpenChange={onOpenChange} />);

    fireEvent.press(screen.getByText('OK'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('shows cancel button when cancelText provided', async () => {
    render(<AppAlertDialog {...defaultProps} cancelText="Batal" />);

    expect(screen.getByText('Batal')).toBeTruthy();
  });

  test('does not show cancel button when cancelText not provided', async () => {
    render(<AppAlertDialog {...defaultProps} />);

    // We expect only one button (OK)
    expect(screen.queryByText('Batal')).toBeNull();
  });

  test('calls onOpenChange(false) when cancel pressed', async () => {
    const onOpenChange = jest.fn();
    render(<AppAlertDialog {...defaultProps} cancelText="Batal" onOpenChange={onOpenChange} />);

    fireEvent.press(screen.getByText('Batal'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test('renders correctly in dark theme', async () => {
    renderWithDarkTheme(<AppAlertDialog {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test Description')).toBeTruthy();
    expect(screen.getByText('OK')).toBeTruthy();
  });

  test('renders with custom colors in dark theme', async () => {
    renderWithDarkTheme(
      <AppAlertDialog {...defaultProps} confirmColor="$danger" confirmTextColor="$onPrimary" />,
    );

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('OK')).toBeTruthy();
  });
});
