import { test, expect, jest } from '@jest/globals';
import { Alert } from 'react-native';
import {
  render,
  renderWithDarkTheme,
  screen,
  fireEvent,
  waitFor,
} from '@/test-utils/renderWithTheme';
import AppAlertDialog from '@/components/elements/AppAlertDialog/AppAlertDialog';
import { CheckCircleIcon } from '@/components/icons';

describe('<AppAlertDialog />', () => {
  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    title: 'Test Title',
    description: 'Test Description',
  };

  test('renders title and description when open', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<AppAlertDialog {...defaultProps} />);

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test Description')).toBeTruthy();
    expect(alertSpy).not.toHaveBeenCalled();

    alertSpy.mockRestore();
  });

  test('renders a branded Tamagui dialog by default', async () => {
    render(<AppAlertDialog {...defaultProps} cancelText="Batal" />);

    expect(screen.getByTestId('app-alert-dialog-content')).toBeTruthy();
    expect(screen.getByTestId('app-alert-dialog-confirm-button')).toBeTruthy();
    expect(screen.getByTestId('app-alert-dialog-cancel-button')).toBeTruthy();
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

  test('renders icon when provided', async () => {
    render(
      <AppAlertDialog {...defaultProps} icon={<CheckCircleIcon size={48} color="$success" />} />,
    );

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test Description')).toBeTruthy();
  });

  test('hides title visually but keeps it accessible when hideTitle is true', async () => {
    render(<AppAlertDialog {...defaultProps} hideTitle />);

    const hiddenTitle = screen.getByText('Test Title');
    expect(hiddenTitle).toBeTruthy();
    expect(hiddenTitle.props.opacity).toBeUndefined();
    expect(screen.getByText('Test Description')).toBeTruthy();
  });

  test('centers description text when icon is provided', async () => {
    render(
      <AppAlertDialog {...defaultProps} icon={<CheckCircleIcon size={48} color="$success" />} />,
    );

    expect(screen.getByText('Test Description')).toBeTruthy();
  });

  test('renders icon with hideTitle for success dialog pattern', async () => {
    render(
      <AppAlertDialog
        {...defaultProps}
        hideTitle
        icon={<CheckCircleIcon size={48} color="$success" />}
      />,
    );

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test Description')).toBeTruthy();
  });

  test('renders content when native is explicitly false', async () => {
    render(<AppAlertDialog {...defaultProps} native={false} />);

    expect(screen.getByText('Test Title')).toBeTruthy();
    expect(screen.getByText('Test Description')).toBeTruthy();
  });

  test('calls Alert.alert when native is true and open', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(
      <AppAlertDialog
        {...defaultProps}
        native={true}
        cancelText="Batal"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Test Title',
        'Test Description',
        [
          { text: 'Batal', onPress: expect.any(Function), style: 'cancel' },
          { text: 'OK', onPress: expect.any(Function), style: 'default' },
        ],
        { cancelable: false },
      );
    });

    alertSpy.mockRestore();
  });

  test('does not render DOM when native is true', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    render(<AppAlertDialog {...defaultProps} native={true} />);

    expect(screen.queryByText('Test Title')).toBeNull();
    expect(screen.queryByText('Test Description')).toBeNull();

    alertSpy.mockRestore();
  });

  test('fires onConfirm and onOpenChange(false) via native alert confirm', async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation((_title, _message, buttons) => {
      const confirmButton = buttons?.find(b => b.style === 'default');
      confirmButton?.onPress?.();
    });

    render(
      <AppAlertDialog
        {...defaultProps}
        native={true}
        onConfirm={onConfirm}
        onOpenChange={onOpenChange}
      />,
    );

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    alertSpy.mockRestore();
  });
});
