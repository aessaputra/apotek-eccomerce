import { test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '../../../test-utils/renderWithTheme';
import EmailInput from './EmailInput';

describe('<EmailInput />', () => {
  test('renders correctly with placeholder', async () => {
    render(<EmailInput value="" onChangeText={() => {}} placeholder="Email" />);
    const input = screen.getByPlaceholderText(/Email/i);
    expect(input).not.toBeNull();
  });

  test('displays value correctly', async () => {
    render(<EmailInput value="test@example.com" onChangeText={() => {}} />);
    const input = screen.getByDisplayValue('test@example.com');
    expect(input).not.toBeNull();
  });

  test('calls onChangeText when text changes', async () => {
    const onChangeText = jest.fn();
    render(<EmailInput value="" onChangeText={onChangeText} placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');

    fireEvent.changeText(input, 'test@example.com');
    expect(onChangeText).toHaveBeenCalledWith('test@example.com');
    expect(onChangeText).toHaveBeenCalledTimes(1);
  });

  test('calls onFocus when input is focused', async () => {
    const onFocus = jest.fn();
    render(<EmailInput value="" onChangeText={() => {}} onFocus={onFocus} placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');

    fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  test('calls onBlur when input loses focus', async () => {
    const onBlur = jest.fn();
    render(<EmailInput value="" onChangeText={() => {}} onBlur={onBlur} placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');

    fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  test('shows error state when error prop is true', async () => {
    render(<EmailInput value="" onChangeText={() => {}} error placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input).not.toBeNull();
    // Error state should be visually indicated (border color change)
  });

  test('is disabled when disabled prop is true', async () => {
    render(<EmailInput value="" onChangeText={() => {}} disabled placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.props.editable).toBe(false);
  });

  test('respects editable prop', async () => {
    render(<EmailInput value="" onChangeText={() => {}} editable={false} placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.props.editable).toBe(false);
  });

  test('uses correct keyboardType', async () => {
    render(
      <EmailInput
        value=""
        onChangeText={() => {}}
        keyboardType="email-address"
        placeholder="Email"
      />,
    );
    const input = screen.getByPlaceholderText('Email');
    expect(input.props.keyboardType).toBe('email-address');
  });

  test('has correct accessibility label', async () => {
    render(
      <EmailInput
        value=""
        onChangeText={() => {}}
        accessibilityLabel="Email address"
        placeholder="Email"
      />,
    );
    const input = screen.getByPlaceholderText('Email');
    expect(input.props.accessibilityLabel).toBe('Email address');
  });

  test('uses default accessibility label when not provided', async () => {
    render(<EmailInput value="" onChangeText={() => {}} placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.props.accessibilityLabel).toBe('Email');
  });

  test('respects autoCapitalize prop', async () => {
    render(
      <EmailInput value="" onChangeText={() => {}} autoCapitalize="none" placeholder="Email" />,
    );
    const input = screen.getByPlaceholderText('Email');
    expect(input.props.autoCapitalize).toBe('none');
  });

  test('respects autoCorrect prop', async () => {
    render(<EmailInput value="" onChangeText={() => {}} autoCorrect={false} placeholder="Email" />);
    const input = screen.getByPlaceholderText('Email');
    expect(input.props.autoCorrect).toBe(false);
  });
});
