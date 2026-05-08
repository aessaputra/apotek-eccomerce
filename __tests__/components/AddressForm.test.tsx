import { describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import AddressForm from '@/components/AddressForm/AddressForm';
import { initialFormErrors, initialFormValues } from '@/utils/addressValidation';

describe('<AddressForm />', () => {
  it('renders visible labels only for text-entry fields', () => {
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

    expect(screen.getByText('Nama Penerima', { exact: false })).toBeTruthy();
    expect(screen.getByText('Nomor Telepon', { exact: false })).toBeTruthy();
    expect(screen.queryByText('Alamat Jalan')).toBeNull();
    expect(screen.getByText('Detail Lainnya')).toBeTruthy();
  });

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

  it('only describes street address with an error and keeps note helper wiring', () => {
    const view = render(
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

    const streetAddressTrigger = screen.getByLabelText('Nama Jalan, Gedung, No. Rumah');
    const streetAddressText = screen.getByText('Nama Jalan, Gedung, No. Rumah');
    const noteHelper = screen.getByText(
      'Masukkan detail tambahan seperti blok, unit, atau patokan (opsional)',
    );
    const noteInput = screen.getByLabelText('Detail lainnya');

    expect(streetAddressTrigger.props['aria-describedby']).toBeUndefined();
    expect(screen.queryByText('Membuka pencarian alamat pengiriman')).toBeNull();
    expect(streetAddressText.props.numberOfLines).toBeUndefined();
    expect(noteInput.props['aria-describedby']).toBe(noteHelper.props.id);

    view.rerender(
      <AddressForm
        values={initialFormValues}
        errors={{ ...initialFormErrors, streetAddress: 'Alamat wajib dipilih' }}
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

    const erroredStreetAddressTrigger = screen.getByLabelText('Nama Jalan, Gedung, No. Rumah');
    const streetError = screen.getByText('Alamat wajib dipilih');
    expect(erroredStreetAddressTrigger.props['aria-describedby']).toBe(streetError.props.id);
  });

  it('updates and validates receiver fields from the live form', () => {
    const onFieldSave = jest.fn();
    const onFieldValidate = jest.fn();
    const onStreetAddressPress = jest.fn();
    let values = { ...initialFormValues };

    const view = render(
      <AddressForm
        values={values}
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
        onFieldValidate={onFieldValidate}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={onStreetAddressPress}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('Nama Penerima'), '  Jane Doe  ');
    fireEvent.changeText(screen.getByLabelText('Nomor Telepon'), ' 081234567890 ');

    expect(onFieldSave).toHaveBeenCalledWith('receiverName', '  Jane Doe  ');
    expect(onFieldSave).toHaveBeenCalledWith('phoneNumber', ' 081234567890 ');

    values = {
      ...values,
      receiverName: '  Jane Doe  ',
      phoneNumber: ' 081234567890 ',
    };
    view.rerender(
      <AddressForm
        values={values}
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
        onFieldValidate={onFieldValidate}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={onStreetAddressPress}
      />,
    );

    fireEvent(screen.getByLabelText('Nama Penerima'), 'blur');
    values = {
      ...values,
      receiverName: 'Jane Doe',
    };
    view.rerender(
      <AddressForm
        values={values}
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
        onFieldValidate={onFieldValidate}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={onStreetAddressPress}
      />,
    );
    fireEvent(screen.getByLabelText('Nomor Telepon'), 'blur');
    values = {
      ...values,
      phoneNumber: '081234567890',
    };
    view.rerender(
      <AddressForm
        values={values}
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
        onFieldValidate={onFieldValidate}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={onStreetAddressPress}
      />,
    );

    expect(onFieldSave).toHaveBeenCalledWith('receiverName', 'Jane Doe');
    expect(onFieldValidate).toHaveBeenCalledWith('receiverName', 'Jane Doe');
    expect(onFieldSave).toHaveBeenCalledWith('phoneNumber', '081234567890');
    expect(onFieldValidate).toHaveBeenCalledWith('phoneNumber', '081234567890');

    fireEvent(screen.getByLabelText('Nomor Telepon'), 'submitEditing');

    expect(onStreetAddressPress).toHaveBeenCalledTimes(1);

    view.rerender(
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
        onFieldSave={onFieldSave}
        onFieldValidate={onFieldValidate}
        onAreaPickerPress={jest.fn()}
        onStreetAddressPress={onStreetAddressPress}
      />,
    );

    expect(screen.getByLabelText('Nama Penerima').props.editable).toBe(false);
    expect(screen.getByLabelText('Nomor Telepon').props.editable).toBe(false);
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
