import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import AddressForm from '@/components/AddressForm/AddressForm';
import { initialFormErrors, initialFormValues } from '@/utils/addressValidation';

describe('<AddressForm />', () => {
  it('does not render the legacy map trigger row', () => {
    render(
      <AddressForm
        values={initialFormValues}
        errors={initialFormErrors}
        isSaving={false}
        refs={{
          receiverNameRef: { current: null },
          phoneNumberRef: { current: null },
          streetAddressRef: { current: null },
          addressNoteRef: { current: null },
          cityRef: { current: null },
          postalCodeRef: { current: null },
          provinceRef: { current: null },
        }}
        onFieldSave={jest.fn()}
        onFieldValidate={jest.fn()}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={jest.fn()}
      />,
    );

    expect(screen.queryByText('Lokasi di Peta')).toBeNull();
  });

  it('still opens street address search from the address field row', () => {
    const onStreetAddressPress = jest.fn();

    render(
      <AddressForm
        values={initialFormValues}
        errors={initialFormErrors}
        isSaving={false}
        refs={{
          receiverNameRef: { current: null },
          phoneNumberRef: { current: null },
          streetAddressRef: { current: null },
          addressNoteRef: { current: null },
          cityRef: { current: null },
          postalCodeRef: { current: null },
          provinceRef: { current: null },
        }}
        onFieldSave={jest.fn()}
        onFieldValidate={jest.fn()}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={onStreetAddressPress}
      />,
    );

    fireEvent.press(screen.getByText('Nama Jalan, Gedung, No. Rumah'));

    expect(onStreetAddressPress).toHaveBeenCalledTimes(1);
  });

  it('saves and trims the optional address note field', () => {
    const onFieldSave = jest.fn();

    render(
      <AddressForm
        values={{
          ...initialFormValues,
          addressNote: '  Blok A2 dekat gerbang  ',
        }}
        errors={initialFormErrors}
        isSaving={false}
        refs={{
          receiverNameRef: { current: null },
          phoneNumberRef: { current: null },
          streetAddressRef: { current: null },
          addressNoteRef: { current: null },
          cityRef: { current: null },
          postalCodeRef: { current: null },
          provinceRef: { current: null },
        }}
        onFieldSave={onFieldSave}
        onFieldValidate={jest.fn()}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={jest.fn()}
      />,
    );

    fireEvent(screen.getByLabelText('Detail lainnya'), 'blur');

    expect(onFieldSave).toHaveBeenCalledWith('addressNote', 'Blok A2 dekat gerbang');
  });

  it('does not open street address search when isSaving is true', () => {
    const onStreetAddressPress = jest.fn();

    render(
      <AddressForm
        values={initialFormValues}
        errors={initialFormErrors}
        isSaving={true}
        refs={{
          receiverNameRef: { current: null },
          phoneNumberRef: { current: null },
          streetAddressRef: { current: null },
          addressNoteRef: { current: null },
          cityRef: { current: null },
          postalCodeRef: { current: null },
          provinceRef: { current: null },
        }}
        onFieldSave={jest.fn()}
        onFieldValidate={jest.fn()}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={onStreetAddressPress}
      />,
    );

    fireEvent.press(screen.getByText('Nama Jalan, Gedung, No. Rumah'));

    expect(onStreetAddressPress).not.toHaveBeenCalled();
  });

  it('exposes the street address row as a disabled button when saving', () => {
    render(
      <AddressForm
        values={initialFormValues}
        errors={initialFormErrors}
        isSaving={true}
        refs={{
          receiverNameRef: { current: null },
          phoneNumberRef: { current: null },
          streetAddressRef: { current: null },
          addressNoteRef: { current: null },
          cityRef: { current: null },
          postalCodeRef: { current: null },
          provinceRef: { current: null },
        }}
        onFieldSave={jest.fn()}
        onFieldValidate={jest.fn()}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={jest.fn()}
      />,
    );

    const streetAddressTrigger = screen.getByLabelText('Nama Jalan, Gedung, No. Rumah');

    expect(streetAddressTrigger.props.role).toBe('button');
    expect(streetAddressTrigger.props['aria-disabled']).toBe(true);
  });
});
