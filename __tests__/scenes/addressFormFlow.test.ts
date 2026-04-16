import { describe, expect, jest, test } from '@jest/globals';
import {
  applyPendingSelections,
  applySelectedAddressSelection,
  applySelectedAreaSelection,
  buildAddressContextFromPendingAreaSelection,
  buildAddressMapRouteParams,
} from '@/scenes/profile/addressFormFlow';

describe('addressFormFlow', () => {
  test('buildAddressMapRouteParams merges overrides over current values', () => {
    expect(
      buildAddressMapRouteParams(
        {
          latitude: null,
          longitude: null,
          streetAddress: '',
          areaName: 'Walantaka',
          areaId: 'area-1',
          city: 'Kota Serang',
          province: 'Banten',
          postalCode: '42183',
        },
        {
          latitude: -6.2,
          longitude: 106.8,
          streetAddress: 'Jl. Sudirman No. 1',
        },
      ),
    ).toEqual({
      latitude: '-6.2',
      longitude: '106.8',
      streetAddress: 'Jl. Sudirman No. 1',
      areaName: 'Walantaka',
      city: 'Kota Serang',
      province: 'Banten',
      postalCode: '42183',
    });
  });

  test('applySelectedAreaSelection clears map coordinates and resets map confirmation', () => {
    const clearTransientErrors = jest.fn();
    const setArea = jest.fn();
    const setAreaProximity = jest.fn();
    const setCoordinateFieldValue = jest.fn();
    const resetMapConfirmation = jest.fn();

    applySelectedAreaSelection(
      {
        area: {
          id: 'area-1',
          name: 'Walantaka',
          administrative_division_level_2_name: 'Kota Serang',
          administrative_division_level_2_type: 'city',
          administrative_division_level_3_name: 'Walantaka',
          administrative_division_level_1_name: 'Banten',
          postal_code: 42183,
        },
      },
      {
        clearTransientErrors,
        setArea,
        setAreaProximity,
        setCoordinateFieldValue,
        resetMapConfirmation,
      },
    );

    expect(setArea).toHaveBeenCalledWith({
      id: 'area-1',
      name: 'Walantaka, Kota Serang, Banten, 42183',
      city: 'Kota Serang',
      province: 'Banten',
      postalCode: '42183',
    });
    expect(setAreaProximity).toHaveBeenCalledWith(null);
    expect(setCoordinateFieldValue).toHaveBeenCalledWith('latitude', null);
    expect(setCoordinateFieldValue).toHaveBeenCalledWith('longitude', null);
    expect(resetMapConfirmation).toHaveBeenCalled();
    expect(clearTransientErrors).toHaveBeenCalled();
  });

  test('applySelectedAddressSelection preserves resolved area hierarchy when areaId already exists', () => {
    const clearTransientErrors = jest.fn();
    const setTextFieldValue = jest.fn();
    const setCoordinateFieldValue = jest.fn();
    const setAreaProximity = jest.fn();
    const setMapConfirmed = jest.fn();
    const handleOpenMap = jest.fn();

    applySelectedAddressSelection(
      {
        id: 'addr-1',
        placeId: 'place-1',
        fullAddress: 'Jl. Sudirman No. 1, Jakarta Selatan',
        streetAddress: '  Jl. Sudirman No. 1  ',
        city: 'Jakarta Selatan',
        district: 'Setiabudi',
        province: 'DKI Jakarta',
        postalCode: '12190',
        countryCode: 'ID',
        latitude: -6.2,
        longitude: 106.8,
        accuracy: null,
      },
      {
        areaId: 'area-1',
        areaName: 'Walantaka',
        city: 'Kota Serang',
        province: 'Banten',
        postalCode: '42183',
      },
      {
        clearTransientErrors,
        setTextFieldValue,
        setCoordinateFieldValue,
        setAreaProximity,
        setMapConfirmed,
        handleOpenMap,
      },
    );

    expect(setTextFieldValue).toHaveBeenCalledWith('streetAddress', 'Jl. Sudirman No. 1');
    expect(setTextFieldValue).not.toHaveBeenCalledWith('city', 'Jakarta Selatan');
    expect(setTextFieldValue).not.toHaveBeenCalledWith('province', 'DKI Jakarta');
    expect(setTextFieldValue).not.toHaveBeenCalledWith('postalCode', '12190');
    expect(setCoordinateFieldValue).toHaveBeenCalledWith('latitude', -6.2);
    expect(setCoordinateFieldValue).toHaveBeenCalledWith('longitude', 106.8);
    expect(handleOpenMap).toHaveBeenCalledWith({
      latitude: -6.2,
      longitude: 106.8,
      streetAddress: 'Jl. Sudirman No. 1',
      areaName: 'Walantaka',
      city: 'Kota Serang',
      province: 'Banten',
      postalCode: '42183',
    });
  });

  test('applyPendingSelections consumes and applies all pending sources in order', () => {
    const applySelectedArea = jest.fn();
    const applySelectedAddress = jest.fn();
    const applyMapPickerResult = jest.fn();

    applyPendingSelections({
      consumePendingAreaSelection: () => ({ area: { id: 'area-1', name: 'Walantaka' } }),
      getCurrentAddressContext: () => ({
        areaId: 'existing-area',
        areaName: 'Existing Area',
        city: 'Existing City',
        province: 'Existing Province',
        postalCode: '00000',
      }),
      consumePendingAddressSelection: () => ({
        id: 'addr-1',
        placeId: 'place-1',
        fullAddress: 'Alamat',
        streetAddress: 'Alamat',
        city: 'Kota Serang',
        district: 'Walantaka',
        province: 'Banten',
        postalCode: '42183',
        countryCode: 'ID',
        latitude: -6.1,
        longitude: 106.1,
        accuracy: null,
      }),
      consumePendingMapPickerResult: () => ({
        latitude: -6.2,
        longitude: 106.8,
        didAdjustPin: true,
      }),
      applySelectedArea,
      applySelectedAddress,
      applyMapPickerResult,
    });

    expect(applySelectedArea).toHaveBeenCalledTimes(1);
    expect(applySelectedAddress).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        areaId: 'area-1',
        areaName: 'Walantaka',
      }),
    );
    expect(applyMapPickerResult).toHaveBeenCalledTimes(1);
  });

  test('buildAddressContextFromPendingAreaSelection derives effective area context before address selection runs', () => {
    expect(
      buildAddressContextFromPendingAreaSelection({
        area: {
          id: 'area-2',
          name: 'Ciruas',
          administrative_division_level_2_name: 'Kabupaten Serang',
          administrative_division_level_2_type: 'regency',
          administrative_division_level_1_name: 'Banten',
          postal_code: 42182,
        },
      }),
    ).toEqual({
      areaId: 'area-2',
      areaName: 'Ciruas, Kab. Serang, Banten, 42182',
      city: 'Kabupaten Serang',
      province: 'Banten',
      postalCode: '42182',
    });
  });
});
