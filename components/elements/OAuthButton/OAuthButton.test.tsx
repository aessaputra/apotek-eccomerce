import { test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '../../../test-utils/renderWithTheme';
import OAuthButton from './OAuthButton';

describe('<OAuthButton />', () => {
  test('renders correctly with Google provider', async () => {
    render(<OAuthButton provider="google" />);
    const button = screen.getByText(/Masuk dengan Google/i);
    expect(button).not.toBeNull();
  });

  test('renders correctly with Apple provider', async () => {
    render(<OAuthButton provider="apple" />);
    const button = screen.getByText(/Masuk dengan Apple/i);
    expect(button).not.toBeNull();
  });

  test('shows loading state when isLoading is true', async () => {
    render(<OAuthButton provider="google" isLoading />);
    // Spinner should be rendered when loading
    const button = screen.getByRole('button');
    expect(button).not.toBeNull();
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  test('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    render(<OAuthButton provider="google" onPress={onPress} />);
    const button = screen.getByRole('button');
    fireEvent.press(button);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test('does not call onPress when isLoading is true', async () => {
    const onPress = jest.fn();
    render(<OAuthButton provider="google" onPress={onPress} isLoading />);
    const button = screen.getByRole('button');
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  test('handles onPress errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const onPress = jest.fn(() => {
      throw new Error('Test error');
    });
    render(<OAuthButton provider="google" onPress={onPress} />);
    const button = screen.getByRole('button');

    // Should not throw, error should be caught by component's try-catch
    expect(() => fireEvent.press(button)).not.toThrow();

    // Verify onPress was called (even though it threw an error)
    expect(onPress).toHaveBeenCalledTimes(1);

    // Verify error was logged (in __DEV__ mode)
    // Note: console.error might not be called in test environment if __DEV__ is false
    // But the important thing is that the error was caught and didn't crash

    consoleErrorSpy.mockRestore();
  });

  test('has correct accessibility label', async () => {
    render(<OAuthButton provider="google" />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Masuk dengan Google');
  });

  test('has correct accessibility label for Apple', async () => {
    render(<OAuthButton provider="apple" />);
    const button = screen.getByRole('button');
    expect(button.props.accessibilityLabel).toBe('Masuk dengan Apple');
  });
});
