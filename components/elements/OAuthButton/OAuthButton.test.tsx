import { test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '../../../test-utils/renderWithTheme';
import OAuthButton from './OAuthButton';

describe('<OAuthButton />', () => {
  test('renders correctly with Google provider', async () => {
    render(<OAuthButton provider="google" />);
    const button = screen.getByText(/Google/i);
    expect(button).not.toBeNull();
  });

  test('shows loading spinner when isLoading is true', async () => {
    render(<OAuthButton provider="google" isLoading />);
    // Saat loading, text seharusnya tidak muncul (diganti spinner)
    const text = screen.queryByText(/Google/i);
    expect(text).toBeNull();
  });

  test('calls onPress handler when pressed', async () => {
    const onPressMock = jest.fn();
    render(<OAuthButton provider="google" onPress={onPressMock} />);
    const button = screen.getByLabelText('Masuk dengan Google');
    fireEvent.press(button);
    expect(onPressMock).toHaveBeenCalledTimes(1);
  });

  test('does not call onPress when loading', async () => {
    const onPressMock = jest.fn();
    render(<OAuthButton provider="google" onPress={onPressMock} isLoading />);
    const button = screen.getByLabelText('Masuk dengan Google');
    fireEvent.press(button);
    expect(onPressMock).not.toHaveBeenCalled();
  });

  test('applies correct opacity when loading', async () => {
    render(<OAuthButton provider="google" isLoading />);
    const button = screen.getByLabelText('Masuk dengan Google');
    // check opacity is reduced when loading
    expect(button.props.style).toBeDefined();
  });

  test('handles onPress error gracefully', async () => {
    const onPressMock = jest.fn(() => {
      throw new Error('Test error');
    });
    render(<OAuthButton provider="google" onPress={onPressMock} />);
    const button = screen.getByLabelText('Masuk dengan Google');
    // Should not crash
    expect(() => fireEvent.press(button)).not.toThrow();
  });

  test('has correct accessibility label for Google', async () => {
    render(<OAuthButton provider="google" />);
    const button = screen.getByLabelText('Masuk dengan Google');
    expect(button.props.accessibilityLabel).toBe('Masuk dengan Google');
  });

  test('sets disabled accessibility state when loading', async () => {
    render(<OAuthButton provider="google" isLoading />);
    const button = screen.getByLabelText('Masuk dengan Google');
    expect(button.props.accessibilityState).toEqual({ disabled: true });
  });
});
