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
});
