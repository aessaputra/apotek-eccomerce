import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  getPostalCodesByDistrict,
  getRegionalDistrictsByRegency,
  getRegionalProvinces,
  getRegionalRegenciesByProvince,
} from '@/services/regional.service';

const mockFetch = jest.fn<typeof fetch>();

describe('regional.service', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch as typeof fetch;
  });

  test('parses wilayah.id envelope for provinces', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ code: '36', name: 'Banten' }],
        meta: { administrative_area_level: 1 },
      }),
    } as Response);

    const { data, error } = await getRegionalProvinces();

    expect(error).toBeNull();
    expect(data).toEqual([{ code: '36', name: 'Banten' }]);
  });

  test('loads regencies by province code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ code: '36.73', name: 'Kota Serang' }],
      }),
    } as Response);

    const { data, error } = await getRegionalRegenciesByProvince('36');

    expect(error).toBeNull();
    expect(String(mockFetch.mock.calls[0]?.[0])).toContain('/regencies/36.json');
    expect(data).toEqual([{ code: '36.73', name: 'Kota Serang' }]);
  });

  test('loads districts by regency code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [{ code: '36.73.03', name: 'Walantaka' }],
      }),
    } as Response);

    const { data, error } = await getRegionalDistrictsByRegency('36.73');

    expect(error).toBeNull();
    expect(String(mockFetch.mock.calls[0]?.[0])).toContain('/districts/36.73.json');
    expect(data).toEqual([{ code: '36.73.03', name: 'Walantaka' }]);
  });

  test('loads postal codes by district code from postal source', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 3673,
          name: 'SERANG',
          children: [3673010, 3673020],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 3673010,
          name: 'CURUG',
          postal: [42131, 42132],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 3673020,
          name: 'WALANTAKA',
          postal: [42135, 42136, 42183],
        }),
      } as Response);

    const { data, error } = await getPostalCodesByDistrict('36', '36.73', 'Walantaka');

    expect(error).toBeNull();
    expect(String(mockFetch.mock.calls[0]?.[0])).toContain('/62/36/3673/3673.json');
    expect(String(mockFetch.mock.calls[2]?.[0])).toContain('/62/36/3673/3673020/3673020.json');
    expect(data).toEqual(['42135', '42136', '42183']);
  });

  test('returns error when district name is not found in postal source', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 3673,
          name: 'SERANG',
          children: [3673010],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          code: 3673010,
          name: 'CURUG',
          postal: [42131, 42132],
        }),
      } as Response);

    const { data, error } = await getPostalCodesByDistrict('36', '36.73', 'Walantaka');

    expect(data).toEqual([]);
    expect(error?.message).toBe('Kode pos kecamatan tidak ditemukan.');
  });
});
