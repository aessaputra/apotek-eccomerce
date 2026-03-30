import { test, expect } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import PasswordInput from '@/components/elements/PasswordInput/PasswordInput';

describe('<PasswordInput />', () => {
  test('renders correctly with placeholder', async () => {
    render(<PasswordInput value="" onChangeText={() => {}} placeholder="Password" />);
    const input = screen.getByPlaceholderText(/Password/i);
    expect(input).not.toBeNull();
  });

  test('renders correctly with placeholder in dark theme', async () => {
    renderWithDarkTheme(<PasswordInput value="" onChangeText={() => {}} placeholder="Password" />);
    const input = screen.getByPlaceholderText(/Password/i);
    expect(input).not.toBeNull();
  });

  test('displays value correctly', async () => {
    render(<PasswordInput value="secret123" onChangeText={() => {}} />);
    const input = screen.getByDisplayValue('secret123');
    expect(input).not.toBeNull();
  });

  test('calls onChangeText when text changes', async () => {
    const onChangeText = jest.fn();
    render(<PasswordInput value="" onChangeText={onChangeText} placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');

    fireEvent.changeText(input, 'newpassword');
    expect(onChangeText).toHaveBeenCalledWith('newpassword');
    expect(onChangeText).toHaveBeenCalledTimes(1);
  });

  test('calls onFocus when input is focused', async () => {
    const onFocus = jest.fn();
    render(
      <PasswordInput value="" onChangeText={() => {}} onFocus={onFocus} placeholder="Password" />,
    );
    const input = screen.getByPlaceholderText('Password');

    fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  test('calls onBlur when input loses focus', async () => {
    const onBlur = jest.fn();
    render(
      <PasswordInput value="" onChangeText={() => {}} onBlur={onBlur} placeholder="Password" />,
    );
    const input = screen.getByPlaceholderText('Password');

    fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  test('hides password by default (secureTextEntry)', async () => {
    render(<PasswordInput value="secret123" onChangeText={() => {}} placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input.props.secureTextEntry).toBe(true);
  });

  test('toggles password visibility when eye icon is pressed', async () => {
    render(<PasswordInput value="secret123" onChangeText={() => {}} placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    const toggleButton = screen.getByLabelText(/Tampilkan password/i);

    // Initially hidden
    expect(input.props.secureTextEntry).toBe(true);

    // Toggle to visible
    fireEvent.press(toggleButton);
    expect(input.props.secureTextEntry).toBe(false);

    // Toggle back to hidden
    fireEvent.press(toggleButton);
    expect(input.props.secureTextEntry).toBe(true);
  });

  test('shows correct accessibility label for visibility toggle', async () => {
    render(<PasswordInput value="secret123" onChangeText={() => {}} placeholder="Password" />);

    // Initially hidden, should show "Tampilkan password"
    let toggleButton = screen.getByLabelText(/Tampilkan password/i);
    expect(toggleButton).not.toBeNull();

    // Toggle to visible
    fireEvent.press(toggleButton);

    // Now should show "Sembunyikan password"
    toggleButton = screen.getByLabelText(/Sembunyikan password/i);
    expect(toggleButton).not.toBeNull();
  });

  test('shows error state when error prop is true', async () => {
    render(<PasswordInput value="" onChangeText={() => {}} error placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input).not.toBeNull();
    // Error state should be visually indicated (border color change)
  });

  test('is disabled when disabled prop is true', async () => {
    render(<PasswordInput value="" onChangeText={() => {}} disabled placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    const toggleButton = screen.getByLabelText(/Tampilkan password/i);

    expect(input.props.editable).toBe(false);
    // Pressable doesn't expose disabled prop directly, but it prevents interaction when disabled
    expect(toggleButton).not.toBeNull();
  });

  test('does not toggle visibility when disabled', async () => {
    render(
      <PasswordInput value="secret123" onChangeText={() => {}} disabled placeholder="Password" />,
    );
    const input = screen.getByPlaceholderText('Password');
    const toggleButton = screen.getByLabelText(/Tampilkan password/i);

    // Initially hidden
    expect(input.props.secureTextEntry).toBe(true);

    // Try to toggle (should not work when disabled)
    fireEvent.press(toggleButton);
    expect(input.props.secureTextEntry).toBe(true); // Still hidden
  });

  test('has correct accessibility label', async () => {
    render(<PasswordInput value="" onChangeText={() => {}} placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input.props['aria-label']).toBe('Password');
  });

  test('uses default accessibility label when placeholder not provided', async () => {
    render(<PasswordInput value="" onChangeText={() => {}} />);
    const input = screen.getByTestId('password-input');
    expect(input.props['aria-label']).toBe('Password');
  });

  test('always uses autoCapitalize="none"', async () => {
    render(<PasswordInput value="" onChangeText={() => {}} placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input.props.autoCapitalize).toBe('none');
  });

  test('always uses autoCorrect={false}', async () => {
    render(<PasswordInput value="" onChangeText={() => {}} placeholder="Password" />);
    const input = screen.getByPlaceholderText('Password');
    expect(input.props.autoCorrect).toBe(false);
  });
});
