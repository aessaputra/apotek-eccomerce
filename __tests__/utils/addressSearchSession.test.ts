import { afterEach, describe, expect, test } from '@jest/globals';
import {
  consumePendingAddressSelection,
  setPendingAddressSelection,
} from '@/utils/addressSearchSession';

describe('addressSearchSession', () => {
  afterEach(() => {
    consumePendingAddressSelection();
  });

  test('consumePendingAddressSelection returns the stored selection once', () => {
    const selection = {
      id: 'addr-1',
      placeId: 'place-1',
      fullAddress: 'Jl. Sudirman No. 1, Jakarta Selatan',
      streetAddress: 'Jl. Sudirman No. 1',
      city: 'Jakarta Selatan',
      district: 'Kebayoran Baru',
      province: 'DKI Jakarta',
      postalCode: '12190',
      countryCode: 'ID',
      latitude: -6.2,
      longitude: 106.8,
      accuracy: null,
    };

    setPendingAddressSelection(selection);

    expect(consumePendingAddressSelection()).toEqual(selection);
    expect(consumePendingAddressSelection()).toBeNull();
  });

  test('setPendingAddressSelection overwrites any previous selection', () => {
    setPendingAddressSelection({
      id: 'old',
      placeId: 'old-place',
      fullAddress: 'Alamat Lama',
      streetAddress: 'Alamat Lama',
      city: 'Bandung',
      district: 'Coblong',
      province: 'Jawa Barat',
      postalCode: '40132',
      countryCode: 'ID',
      latitude: -6.9,
      longitude: 107.6,
      accuracy: null,
    });

    const nextSelection = {
      id: 'new',
      placeId: 'new-place',
      fullAddress: 'Alamat Baru',
      streetAddress: 'Alamat Baru',
      city: 'Jakarta Selatan',
      district: 'Setiabudi',
      province: 'DKI Jakarta',
      postalCode: '12910',
      countryCode: 'ID',
      latitude: -6.21,
      longitude: 106.82,
      accuracy: null,
    };

    setPendingAddressSelection(nextSelection);

    expect(consumePendingAddressSelection()).toEqual(nextSelection);
  });
});
