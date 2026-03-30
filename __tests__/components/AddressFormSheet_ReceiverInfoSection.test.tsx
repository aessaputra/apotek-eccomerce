import { createRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { test, expect, jest } from '@jest/globals';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import ReceiverInfoSection from '@/components/AddressFormSheet/ReceiverInfoSection';

function createProps(overrides: Partial<React.ComponentProps<typeof ReceiverInfoSection>> = {}) {
  return {
    receiverName: 'John Doe',
    phoneNumber: '081234567890',
    receiverNameError: null,
    phoneNumberError: null,
    isSaving: false,
    onReceiverNameChange: jest.fn(),
    onPhoneNumberChange: jest.fn(),
    onReceiverNameBlur: jest.fn(),
    onPhoneNumberBlur: jest.fn(),
    receiverNameRef: createRef<RNTextInput>(),
    phoneNumberRef: createRef<RNTextInput>(),
    onFocusStreetAddress: jest.fn(),
    ...overrides,
  };
}

describe('<ReceiverInfoSection />', () => {
  test('renders receiver fields in light and dark themes', async () => {
    const props = createProps();
    render(<ReceiverInfoSection {...props} />);

    expect(screen.getByText('Informasi Penerima')).not.toBeNull();
    expect(screen.getByLabelText('Nama penerima')).not.toBeNull();
    expect(screen.getByLabelText('Nomor telepon')).not.toBeNull();

    renderWithDarkTheme(<ReceiverInfoSection {...props} />);
    expect(screen.getAllByText('Informasi Penerima').length).toBeGreaterThan(0);
  });

  test('forwards change and blur handlers', async () => {
    const props = createProps();
    render(<ReceiverInfoSection {...props} />);

    fireEvent.changeText(screen.getByLabelText('Nama penerima'), 'Jane Doe');
    fireEvent.changeText(screen.getByLabelText('Nomor telepon'), '089999999999');

    expect(props.onReceiverNameChange).toHaveBeenCalledWith('Jane Doe');
    expect(props.onPhoneNumberChange).toHaveBeenCalledWith('089999999999');

    fireEvent(screen.getByLabelText('Nama penerima'), 'blur');
    fireEvent(screen.getByLabelText('Nomor telepon'), 'blur');

    expect(props.onReceiverNameBlur).toHaveBeenCalledTimes(1);
    expect(props.onPhoneNumberBlur).toHaveBeenCalledTimes(1);
  });

  test('submits receiver name and disables inputs while saving', async () => {
    const props = createProps();
    const view = render(<ReceiverInfoSection {...props} />);

    fireEvent(screen.getByLabelText('Nama penerima'), 'submitEditing');
    expect(props.onFocusStreetAddress).toHaveBeenCalledTimes(1);

    view.rerender(<ReceiverInfoSection {...createProps({ isSaving: true })} />);

    expect(screen.getByLabelText('Nama penerima').props.editable).toBe(false);
    expect(screen.getByLabelText('Nomor telepon').props.editable).toBe(false);
  });
});
