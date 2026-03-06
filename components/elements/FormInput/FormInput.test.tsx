import { test, expect } from '@jest/globals';
import { render, screen, fireEvent } from '../../../test-utils/renderWithTheme';
import FormInput from './FormInput';

describe('<FormInput />', () => {
  test('renders with label', async () => {
    render(<FormInput label="Nama Penerima" value="" onChangeText={jest.fn()} />);
    expect(screen.getByText('Nama Penerima')).not.toBeNull();
  });

  test('renders required asterisk when required', async () => {
    render(<FormInput label="Email" required value="" onChangeText={jest.fn()} />);
    expect(screen.getByText(' *')).not.toBeNull();
  });

  test('displays value correctly', async () => {
    render(<FormInput value="Hello World" onChangeText={jest.fn()} />);
    const input = screen.getByDisplayValue('Hello World');
    expect(input).not.toBeNull();
  });

  test('calls onChangeText when text changes', async () => {
    const onChangeText = jest.fn();
    render(<FormInput value="" onChangeText={onChangeText} placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    fireEvent.changeText(input, 'new text');
    expect(onChangeText).toHaveBeenCalledWith('new text');
  });

  test('shows error message when error provided', async () => {
    render(<FormInput value="" onChangeText={jest.fn()} error="Nama wajib diisi" />);
    expect(screen.getByText('Nama wajib diisi')).not.toBeNull();
  });

  test('does not show error when error is null', async () => {
    render(<FormInput value="" onChangeText={jest.fn()} error={null} />);
    expect(screen.queryByText(/wajib/)).toBeNull();
  });

  test('uses placeholder as accessibility label when no label provided', async () => {
    render(<FormInput value="" onChangeText={jest.fn()} placeholder="Enter name" />);
    const input = screen.getByLabelText('Enter name');
    expect(input).not.toBeNull();
  });

  test('uses label as accessibility label', async () => {
    render(<FormInput label="Nama" value="" onChangeText={jest.fn()} />);
    const input = screen.getByLabelText('Nama');
    expect(input).not.toBeNull();
  });

  test('is not editable when disabled', async () => {
    render(<FormInput value="test" onChangeText={jest.fn()} disabled placeholder="Input" />);
    const input = screen.getByPlaceholderText('Input');
    expect(input.props.editable).toBe(false);
  });

  test('calls onFocus and onBlur', async () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    render(
      <FormInput
        value=""
        onChangeText={jest.fn()}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Test"
      />,
    );
    const input = screen.getByPlaceholderText('Test');
    fireEvent(input, 'focus');
    expect(onFocus).toHaveBeenCalledTimes(1);
    fireEvent(input, 'blur');
    expect(onBlur).toHaveBeenCalledTimes(1);
  });
});
