import { describe, expect, test } from '@jest/globals';
import {
  buildSelectedAddressSummary,
  parseAddressMapInitialCoords,
  parseAddressSearchInitialLocation,
  shouldShowInitialAddressRecommendations,
} from '@/scenes/profile/addressRouteParams';

describe('addressRouteParams', () => {
  test('parses valid search route coordinates', () => {
    expect(parseAddressSearchInitialLocation({ latitude: '-6.2', longitude: '106.8' })).toEqual({
      latitude: -6.2,
      longitude: 106.8,
    });
  });

  test('returns nullish coordinate outputs for invalid route coordinates', () => {
    expect(
      parseAddressSearchInitialLocation({ latitude: 'invalid', longitude: '106.8' }),
    ).toBeNull();
    expect(
      parseAddressMapInitialCoords({ latitude: 'invalid', longitude: '106.8' }),
    ).toBeUndefined();
  });

  test('builds selected address summary with sanitized address segments', () => {
    expect(
      buildSelectedAddressSummary({
        streetAddress: '8FVC9G8F+5W',
        areaName: '  Walantaka  ',
        city: ' Kota Serang ',
        province: ' Banten ',
        postalCode: ' 42183 ',
      }),
    ).toBe('Walantaka, Kota Serang, Banten, 42183');
  });

  test('treats queries shorter than two characters as initial recommendation mode', () => {
    expect(shouldShowInitialAddressRecommendations('')).toBe(true);
    expect(shouldShowInitialAddressRecommendations(' a ')).toBe(true);
    expect(shouldShowInitialAddressRecommendations('ab')).toBe(false);
  });
});
