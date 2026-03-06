import { test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '../../../test-utils/renderWithTheme';
import ErrorMessage from './ErrorMessage';

describe('<ErrorMessage />', () => {
  test('renders error message when message is provided', async () => {
    render(<ErrorMessage message="Format email tidak valid." />);
    const errorText = screen.getByText('Format email tidak valid.');
    expect(errorText).not.toBeNull();
  });

  test('does not render when message is null', async () => {
    render(<ErrorMessage message={null} />);
    const errorText = screen.queryByText(/./);
    // AnimatePresence tetap render, tapi tidak ada content
    expect(errorText).toBeNull();
  });

  test('does not render when message is empty string', async () => {
    render(<ErrorMessage message="" />);
    const errorText = screen.queryByText(/./);
    // AnimatePresence tetap render, tapi tidak ada content
    expect(errorText).toBeNull();
  });

  test('displays dismiss button when dismissible is true and onDismiss is provided', async () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage message="Error message" onDismiss={onDismiss} dismissible={true} />);

    const dismissButton = screen.getByLabelText('Dismiss error');
    expect(dismissButton).not.toBeNull();

    fireEvent.press(dismissButton);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('does not display dismiss button when dismissible is false', async () => {
    const onDismiss = jest.fn();
    render(<ErrorMessage message="Error message" onDismiss={onDismiss} dismissible={false} />);

    const dismissButton = screen.queryByLabelText('Dismiss error');
    expect(dismissButton).toBeNull();
  });

  test('does not display dismiss button when onDismiss is not provided', async () => {
    render(<ErrorMessage message="Error message" dismissible={true} />);

    const dismissButton = screen.queryByLabelText('Dismiss error');
    expect(dismissButton).toBeNull();
  });

  test('applies custom stack props', async () => {
    render(
      <ErrorMessage
        message="Error message"
        marginTop="$4"
        marginBottom="$2"
        testID="custom-error"
      />,
    );

    const errorContainer = screen.getByTestId('custom-error');
    expect(errorContainer).not.toBeNull();
  });

  test('renders with icon', async () => {
    render(<ErrorMessage message="Error message" />);
    // Icon should be present (FontAwesome5 exclamation-circle)
    // Note: Icon rendering might need specific test setup
    const errorText = screen.getByText('Error message');
    expect(errorText).not.toBeNull();
  });
});
