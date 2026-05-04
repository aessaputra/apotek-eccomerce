import { act, renderHook, waitFor } from '@testing-library/react-native';
import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { render, screen } from '@/test-utils/renderWithTheme';
import {
  getPostalCodesByDistrict,
  getRegionalDistrictsByRegency,
  getRegionalProvinces,
  getRegionalRegenciesByProvince,
  searchBiteshipArea,
} from '@/services';
import AreaPickerScreen from '@/scenes/profile/AreaPicker';
import { useAreaPickerFlow } from '@/scenes/profile/useAreaPickerFlow';
import { setPendingAreaSelection } from '@/utils/areaPickerSession';
import {
  adminNamesMatch,
  normalizeAdminName,
  normalizeExactAdminName,
} from '@/utils/areaNormalization';
import {
  buildPendingAreaSelection,
  findDistrictCandidateByPostalCode,
} from '@/scenes/profile/areaPickerHelpers';
import type { RegionalDistrict, RegionalProvince, RegionalRegency } from '@/types/regional';
import type { BiteshipArea } from '@/types/shipping';

jest.mock('@/services', () => ({
  getPostalCodesByDistrict: jest.fn(),
  getRegionalDistrictsByRegency: jest.fn(),
  getRegionalProvinces: jest.fn(),
  getRegionalRegenciesByProvince: jest.fn(),
  reverseGeocodeCoordinates: jest.fn(),
  searchBiteshipArea: jest.fn(),
}));

jest.mock('@/utils/areaPickerSession', () => ({
  setPendingAreaSelection: jest.fn(),
}));

const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({}),
}));

const mockGetRegionalProvinces = getRegionalProvinces as jest.MockedFunction<
  typeof getRegionalProvinces
>;
const mockGetRegionalRegenciesByProvince = getRegionalRegenciesByProvince as jest.MockedFunction<
  typeof getRegionalRegenciesByProvince
>;
const mockGetRegionalDistrictsByRegency = getRegionalDistrictsByRegency as jest.MockedFunction<
  typeof getRegionalDistrictsByRegency
>;
const mockGetPostalCodesByDistrict = getPostalCodesByDistrict as jest.MockedFunction<
  typeof getPostalCodesByDistrict
>;
const mockSearchBiteshipArea = searchBiteshipArea as jest.MockedFunction<typeof searchBiteshipArea>;
const mockSetPendingAreaSelection = setPendingAreaSelection as jest.MockedFunction<
  typeof setPendingAreaSelection
>;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

const bantenProvince: RegionalProvince = { code: '36', name: 'Banten' };
const jakartaProvince: RegionalProvince = { code: '31', name: 'DKI Jakarta' };
const serangCity: RegionalRegency = { code: '36.73', name: 'Kota Serang' };
const tangerangCity: RegionalRegency = { code: '36.71', name: 'Kota Tangerang' };
const serangDistrict: RegionalDistrict = { code: '36.73.01', name: 'Serang' };
const walantakaDistrict: RegionalDistrict = { code: '36.73.03', name: 'Walantaka' };

function mockProvinceBootstrap(provinces: RegionalProvince[] = [bantenProvince, jakartaProvince]) {
  mockGetRegionalProvinces.mockResolvedValue({ data: provinces, error: null });
}

async function renderAreaPickerFlow(onComplete = jest.fn()) {
  const hook = renderHook(() => useAreaPickerFlow({ onComplete }));

  await waitFor(() => {
    expect(hook.result.current.filteredProvinces.length).toBeGreaterThan(0);
  });

  return hook;
}

afterEach(() => {
  jest.clearAllMocks();
});

describe('<AreaPickerScreen />', () => {
  test('passes a resolved native placeholder color to the search input', async () => {
    mockProvinceBootstrap();

    render(<AreaPickerScreen />);

    const searchInput = screen.getByPlaceholderText('Cari kota, kecamatan, atau kode pos...');

    expect(typeof searchInput.props.placeholderTextColor).toBe('string');
    expect(searchInput.props.placeholderTextColor).not.toBe('$placeholderColor');
    await waitFor(() => {
      expect(screen.getByText('BANTEN')).toBeTruthy();
    });
  });
});

describe('AreaPicker helper behavior', () => {
  test('buildPendingAreaSelection prefers explicit auto-detected hierarchy over stale fallback state', () => {
    const selection = buildPendingAreaSelection(
      {
        id: 'area-1',
        name: 'Serang',
        administrative_division_level_2_name: 'Serang',
        administrative_division_level_2_type: 'city',
        postal_code: 42182,
      },
      {
        provinceName: 'Banten',
        regencyName: 'Kota Serang',
        districtName: 'Taktakan',
      },
      {
        provinceName: 'Banten',
        regencyName: 'Kabupaten Serang',
        districtName: 'Ciruas',
        postalCode: '42182',
      },
    );

    expect(selection.regencyName).toBe('Kabupaten Serang');
    expect(selection.districtName).toBe('Ciruas');
    expect(selection.postalCode).toBe('42182');
  });

  test('findDistrictCandidateByPostalCode prefers a district whose postal options contain the current-location postal code', async () => {
    const province = { code: '36', name: 'Banten' };
    const regency = { code: '36.73', name: 'Kota Serang' };
    const districts = [
      { code: '36.73.01', name: 'Serang' },
      { code: '36.73.03', name: 'Walantaka' },
    ];

    const resolvePostalOptions = async (
      _province: RegionalProvince,
      _regency: RegionalRegency,
      district: RegionalDistrict,
    ) => {
      if (district.code === '36.73.01') {
        return [{ label: '42111' }, { label: '42112' }];
      }

      return [{ label: '42135' }, { label: '42136' }, { label: '42183' }];
    };

    const match = await findDistrictCandidateByPostalCode(
      districts,
      province,
      regency,
      '42183',
      resolvePostalOptions,
    );

    expect(match?.district).toEqual({ code: '36.73.03', name: 'Walantaka' });
    expect(match?.options).toEqual([{ label: '42135' }, { label: '42136' }, { label: '42183' }]);
  });

  test('findDistrictCandidateByPostalCode returns null when multiple districts share the same postal code', async () => {
    const province = { code: '36', name: 'Banten' };
    const regency = { code: '36.73', name: 'Kota Serang' };
    const districts = [
      { code: '36.73.01', name: 'Serang' },
      { code: '36.73.03', name: 'Walantaka' },
    ];

    const resolvePostalOptions = jest.fn(async () => [{ label: '42183' }]);

    const match = await findDistrictCandidateByPostalCode(
      districts,
      province,
      regency,
      '42183',
      resolvePostalOptions,
    );

    expect(match).toBeNull();
  });

  test('canonical normalization helpers still match city and regency names consistently', () => {
    expect(normalizeAdminName('Kabupaten Serang')).toBe('SERANG');
    expect(normalizeExactAdminName('Kota Serang')).toBe('KOTA SERANG');
    expect(adminNamesMatch('Serang', 'Kabupaten Serang')).toBe(true);
  });
});

describe('useAreaPickerFlow orchestration', () => {
  test('prevents an older city load from overwriting the newer province request result', async () => {
    mockProvinceBootstrap();
    const olderCities =
      createDeferred<Awaited<ReturnType<typeof getRegionalRegenciesByProvince>>>();
    const newerCities =
      createDeferred<Awaited<ReturnType<typeof getRegionalRegenciesByProvince>>>();
    mockGetRegionalRegenciesByProvince.mockImplementation(provinceCode => {
      return provinceCode === bantenProvince.code ? olderCities.promise : newerCities.promise;
    });

    const { result } = await renderAreaPickerFlow();

    act(() => {
      void result.current.handleProvinceSelect(bantenProvince);
    });
    await waitFor(() => {
      expect(mockGetRegionalRegenciesByProvince).toHaveBeenCalledWith(bantenProvince.code);
    });

    act(() => {
      void result.current.handleProvinceSelect(jakartaProvince);
    });
    await waitFor(() => {
      expect(mockGetRegionalRegenciesByProvince).toHaveBeenCalledWith(jakartaProvince.code);
    });

    await act(async () => {
      newerCities.resolve({ data: [tangerangCity], error: null });
      await newerCities.promise;
    });

    await waitFor(() => {
      expect(result.current.filteredCities).toEqual([tangerangCity]);
    });

    await act(async () => {
      olderCities.resolve({ data: [serangCity], error: null });
      await olderCities.promise;
    });

    expect(result.current.filteredCities).toEqual([tangerangCity]);
    expect(result.current.stage).toBe('city');
    expect(result.current.selectedProvince).toEqual(jakartaProvince);
  });

  test('prevents an older district load from overwriting the newer city request result', async () => {
    mockProvinceBootstrap([bantenProvince]);
    mockGetRegionalRegenciesByProvince.mockResolvedValue({
      data: [serangCity, tangerangCity],
      error: null,
    });
    const olderDistricts =
      createDeferred<Awaited<ReturnType<typeof getRegionalDistrictsByRegency>>>();
    const newerDistricts =
      createDeferred<Awaited<ReturnType<typeof getRegionalDistrictsByRegency>>>();
    mockGetRegionalDistrictsByRegency.mockImplementation(regencyCode => {
      return regencyCode === serangCity.code ? olderDistricts.promise : newerDistricts.promise;
    });

    const { result } = await renderAreaPickerFlow();

    await act(async () => {
      await result.current.handleProvinceSelect(bantenProvince);
    });

    act(() => {
      void result.current.handleCitySelect(serangCity);
    });
    await waitFor(() => {
      expect(mockGetRegionalDistrictsByRegency).toHaveBeenCalledWith(serangCity.code);
    });

    act(() => {
      void result.current.handleCitySelect(tangerangCity);
    });
    await waitFor(() => {
      expect(mockGetRegionalDistrictsByRegency).toHaveBeenCalledWith(tangerangCity.code);
    });

    await act(async () => {
      newerDistricts.resolve({ data: [walantakaDistrict], error: null });
      await newerDistricts.promise;
    });

    await waitFor(() => {
      expect(result.current.filteredDistricts).toEqual([walantakaDistrict]);
    });

    await act(async () => {
      olderDistricts.resolve({ data: [serangDistrict], error: null });
      await olderDistricts.promise;
    });

    expect(result.current.filteredDistricts).toEqual([walantakaDistrict]);
    expect(result.current.stage).toBe('district');
    expect(result.current.selectedCity).toEqual(tangerangCity);
  });

  test('prevents an older postal load from overwriting the newer district request result', async () => {
    mockProvinceBootstrap([bantenProvince]);
    mockGetRegionalRegenciesByProvince.mockResolvedValue({ data: [serangCity], error: null });
    mockGetRegionalDistrictsByRegency.mockResolvedValue({
      data: [serangDistrict, walantakaDistrict],
      error: null,
    });
    const olderPostalCodes = createDeferred<Awaited<ReturnType<typeof getPostalCodesByDistrict>>>();
    const newerPostalCodes = createDeferred<Awaited<ReturnType<typeof getPostalCodesByDistrict>>>();
    mockGetPostalCodesByDistrict.mockImplementation((_provinceCode, _regencyCode, districtName) => {
      return districtName === serangDistrict.name
        ? olderPostalCodes.promise
        : newerPostalCodes.promise;
    });

    const { result } = await renderAreaPickerFlow();

    await act(async () => {
      await result.current.handleProvinceSelect(bantenProvince);
    });
    await act(async () => {
      await result.current.handleCitySelect(serangCity);
    });

    act(() => {
      void result.current.handleDistrictSelect(serangDistrict);
    });
    await waitFor(() => {
      expect(mockGetPostalCodesByDistrict).toHaveBeenCalledWith(
        bantenProvince.code,
        serangCity.code,
        serangDistrict.name,
      );
    });

    act(() => {
      void result.current.handleDistrictSelect(walantakaDistrict);
    });
    await waitFor(() => {
      expect(mockGetPostalCodesByDistrict).toHaveBeenCalledWith(
        bantenProvince.code,
        serangCity.code,
        walantakaDistrict.name,
      );
    });

    await act(async () => {
      newerPostalCodes.resolve({ data: ['42183'], error: null });
      await newerPostalCodes.promise;
    });

    await waitFor(() => {
      expect(result.current.filteredPostalOptions).toEqual([{ label: '42183' }]);
    });

    await act(async () => {
      olderPostalCodes.resolve({ data: ['42111'], error: null });
      await olderPostalCodes.promise;
    });

    expect(result.current.filteredPostalOptions).toEqual([{ label: '42183' }]);
    expect(result.current.stage).toBe('postal');
    expect(result.current.selectedDistrict).toEqual(walantakaDistrict);
  });

  test('prevents an older final postal success from completing after the latest no-area result', async () => {
    const onComplete = jest.fn();
    const olderArea: BiteshipArea = {
      id: 'area-42183',
      name: 'Walantaka',
      administrative_division_level_1_name: 'Banten',
      administrative_division_level_2_name: 'Kota Serang',
      administrative_division_level_3_name: 'Walantaka',
      postal_code: 42183,
    };
    const olderPostalSearch = createDeferred<Awaited<ReturnType<typeof searchBiteshipArea>>>();
    const newerPostalSearch = createDeferred<Awaited<ReturnType<typeof searchBiteshipArea>>>();

    mockSetPendingAreaSelection.mockImplementation(() => undefined);
    mockProvinceBootstrap([bantenProvince]);
    mockGetRegionalRegenciesByProvince.mockResolvedValue({ data: [serangCity], error: null });
    mockGetRegionalDistrictsByRegency.mockResolvedValue({ data: [walantakaDistrict], error: null });
    mockGetPostalCodesByDistrict.mockResolvedValue({ data: ['42183', '42184'], error: null });
    mockSearchBiteshipArea.mockImplementation(input => {
      if (input.includes('42183')) {
        return olderPostalSearch.promise;
      }

      if (input.includes('42184') && mockSearchBiteshipArea.mock.calls.length === 2) {
        return newerPostalSearch.promise;
      }

      return Promise.resolve({ data: [], error: null });
    });

    const { result } = await renderAreaPickerFlow(onComplete);

    await act(async () => {
      await result.current.handleProvinceSelect(bantenProvince);
    });
    await act(async () => {
      await result.current.handleCitySelect(serangCity);
    });
    await act(async () => {
      await result.current.handleDistrictSelect(walantakaDistrict);
    });

    await waitFor(() => {
      expect(result.current.filteredPostalOptions).toEqual([
        { label: '42183' },
        { label: '42184' },
      ]);
    });

    act(() => {
      void result.current.handlePostalSelect({ label: '42183' });
    });
    await waitFor(() => {
      expect(mockSearchBiteshipArea).toHaveBeenCalledWith('42183, Walantaka, Kota Serang, Banten');
    });

    act(() => {
      void result.current.handlePostalSelect({ label: '42184' });
    });
    await waitFor(() => {
      expect(mockSearchBiteshipArea).toHaveBeenCalledWith('42184, Walantaka, Kota Serang, Banten');
    });

    await act(async () => {
      newerPostalSearch.resolve({ data: [], error: null });
      await newerPostalSearch.promise;
    });

    await waitFor(() => {
      expect(result.current.stageError).toBe(
        'Area pengiriman untuk kode pos ini tidak ditemukan. Silakan pilih kode pos lain.',
      );
    });
    expect(result.current.isLoadingStage).toBe(false);
    expect(result.current.selectedPostalLabel).toBe('42184');

    await act(async () => {
      olderPostalSearch.resolve({ data: [olderArea], error: null });
      await olderPostalSearch.promise;
    });

    expect(mockSetPendingAreaSelection).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    expect(result.current.stageError).toBe(
      'Area pengiriman untuk kode pos ini tidak ditemukan. Silakan pilih kode pos lain.',
    );
    expect(result.current.isLoadingStage).toBe(false);
    expect(result.current.selectedPostalLabel).toBe('42184');
  });

  test('prevents an older final postal no-area result from overwriting the latest success', async () => {
    const onComplete = jest.fn();
    const newerArea: BiteshipArea = {
      id: 'area-42184',
      name: 'Walantaka',
      administrative_division_level_1_name: 'Banten',
      administrative_division_level_2_name: 'Kota Serang',
      administrative_division_level_3_name: 'Walantaka',
      postal_code: 42184,
    };
    const olderPostalSearch = createDeferred<Awaited<ReturnType<typeof searchBiteshipArea>>>();
    const newerPostalSearch = createDeferred<Awaited<ReturnType<typeof searchBiteshipArea>>>();

    mockSetPendingAreaSelection.mockImplementation(() => undefined);
    mockProvinceBootstrap([bantenProvince]);
    mockGetRegionalRegenciesByProvince.mockResolvedValue({ data: [serangCity], error: null });
    mockGetRegionalDistrictsByRegency.mockResolvedValue({ data: [walantakaDistrict], error: null });
    mockGetPostalCodesByDistrict.mockResolvedValue({ data: ['42183', '42184'], error: null });
    mockSearchBiteshipArea.mockImplementation(input => {
      if (input.includes('42183') && mockSearchBiteshipArea.mock.calls.length === 1) {
        return olderPostalSearch.promise;
      }

      if (input.includes('42184')) {
        return newerPostalSearch.promise;
      }

      return Promise.resolve({ data: [], error: null });
    });

    const { result } = await renderAreaPickerFlow(onComplete);

    await act(async () => {
      await result.current.handleProvinceSelect(bantenProvince);
    });
    await act(async () => {
      await result.current.handleCitySelect(serangCity);
    });
    await act(async () => {
      await result.current.handleDistrictSelect(walantakaDistrict);
    });

    await waitFor(() => {
      expect(result.current.filteredPostalOptions).toEqual([
        { label: '42183' },
        { label: '42184' },
      ]);
    });

    act(() => {
      void result.current.handlePostalSelect({ label: '42183' });
    });
    await waitFor(() => {
      expect(mockSearchBiteshipArea).toHaveBeenCalledWith('42183, Walantaka, Kota Serang, Banten');
    });

    act(() => {
      void result.current.handlePostalSelect({ label: '42184' });
    });
    await waitFor(() => {
      expect(mockSearchBiteshipArea).toHaveBeenCalledWith('42184, Walantaka, Kota Serang, Banten');
    });

    await act(async () => {
      newerPostalSearch.resolve({ data: [newerArea], error: null });
      await newerPostalSearch.promise;
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(result.current.stageError).toBeNull();
    expect(result.current.isLoadingStage).toBe(false);
    expect(result.current.selectedPostalLabel).toBe('42184');

    await act(async () => {
      olderPostalSearch.resolve({ data: [], error: null });
      await olderPostalSearch.promise;
    });

    expect(mockSetPendingAreaSelection).toHaveBeenCalledTimes(1);
    expect(mockSetPendingAreaSelection).toHaveBeenCalledWith({
      area: newerArea,
      provinceName: bantenProvince.name,
      regencyName: serangCity.name,
      districtName: walantakaDistrict.name,
      postalCode: '42184',
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.stageError).toBeNull();
    expect(result.current.isLoadingStage).toBe(false);
    expect(result.current.selectedPostalLabel).toBe('42184');
  });

  test('prevents an older rejected final postal request from overwriting the latest success', async () => {
    const onComplete = jest.fn();
    const newerArea: BiteshipArea = {
      id: 'area-42184',
      name: 'Walantaka',
      administrative_division_level_1_name: 'Banten',
      administrative_division_level_2_name: 'Kota Serang',
      administrative_division_level_3_name: 'Walantaka',
      postal_code: 42184,
    };
    const olderPostalSearch = createDeferred<Awaited<ReturnType<typeof searchBiteshipArea>>>();
    const newerPostalSearch = createDeferred<Awaited<ReturnType<typeof searchBiteshipArea>>>();

    mockSetPendingAreaSelection.mockImplementation(() => undefined);
    mockProvinceBootstrap([bantenProvince]);
    mockGetRegionalRegenciesByProvince.mockResolvedValue({ data: [serangCity], error: null });
    mockGetRegionalDistrictsByRegency.mockResolvedValue({ data: [walantakaDistrict], error: null });
    mockGetPostalCodesByDistrict.mockResolvedValue({ data: ['42183', '42184'], error: null });
    mockSearchBiteshipArea.mockImplementation(input => {
      if (input.includes('42183') && mockSearchBiteshipArea.mock.calls.length === 1) {
        return olderPostalSearch.promise;
      }

      if (input.includes('42184')) {
        return newerPostalSearch.promise;
      }

      return Promise.resolve({ data: [], error: null });
    });

    const { result } = await renderAreaPickerFlow(onComplete);

    await act(async () => {
      await result.current.handleProvinceSelect(bantenProvince);
    });
    await act(async () => {
      await result.current.handleCitySelect(serangCity);
    });
    await act(async () => {
      await result.current.handleDistrictSelect(walantakaDistrict);
    });

    await waitFor(() => {
      expect(result.current.filteredPostalOptions).toEqual([
        { label: '42183' },
        { label: '42184' },
      ]);
    });

    let olderPostalRequest: Promise<void> | undefined;
    act(() => {
      olderPostalRequest = result.current.handlePostalSelect({ label: '42183' });
    });
    await waitFor(() => {
      expect(mockSearchBiteshipArea).toHaveBeenCalledWith('42183, Walantaka, Kota Serang, Banten');
    });

    act(() => {
      void result.current.handlePostalSelect({ label: '42184' });
    });
    await waitFor(() => {
      expect(mockSearchBiteshipArea).toHaveBeenCalledWith('42184, Walantaka, Kota Serang, Banten');
    });

    await act(async () => {
      newerPostalSearch.resolve({ data: [newerArea], error: null });
      await newerPostalSearch.promise;
    });

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
    expect(result.current.stageError).toBeNull();
    expect(result.current.isLoadingStage).toBe(false);
    expect(result.current.selectedPostalLabel).toBe('42184');

    await act(async () => {
      olderPostalSearch.reject(new Error('stale postal failure'));
      await expect(olderPostalRequest).resolves.toBeUndefined();
    });

    expect(mockSetPendingAreaSelection).toHaveBeenCalledTimes(1);
    expect(mockSetPendingAreaSelection).toHaveBeenCalledWith({
      area: newerArea,
      provinceName: bantenProvince.name,
      regencyName: serangCity.name,
      districtName: walantakaDistrict.name,
      postalCode: '42184',
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.stageError).toBeNull();
    expect(result.current.isLoadingStage).toBe(false);
    expect(result.current.selectedPostalLabel).toBe('42184');
  });

  test('shows a safe error when pending postal selection write fails', async () => {
    const onComplete = jest.fn();
    const resolvedArea: BiteshipArea = {
      id: 'area-42183',
      name: 'Walantaka',
      administrative_division_level_1_name: 'Banten',
      administrative_division_level_2_name: 'Kota Serang',
      administrative_division_level_3_name: 'Walantaka',
      postal_code: 42183,
    };

    mockProvinceBootstrap([bantenProvince]);
    mockGetRegionalRegenciesByProvince.mockResolvedValue({ data: [serangCity], error: null });
    mockGetRegionalDistrictsByRegency.mockResolvedValue({ data: [walantakaDistrict], error: null });
    mockGetPostalCodesByDistrict.mockResolvedValue({ data: ['42183'], error: null });
    mockSearchBiteshipArea.mockResolvedValue({ data: [resolvedArea], error: null });
    mockSetPendingAreaSelection.mockImplementation(() => {
      throw new Error('pending write failed');
    });

    const { result } = await renderAreaPickerFlow(onComplete);

    await act(async () => {
      await result.current.handleProvinceSelect(bantenProvince);
    });
    await act(async () => {
      await result.current.handleCitySelect(serangCity);
    });
    await act(async () => {
      await result.current.handleDistrictSelect(walantakaDistrict);
    });

    await waitFor(() => {
      expect(result.current.filteredPostalOptions).toEqual([{ label: '42183' }]);
    });

    await act(async () => {
      await result.current.handlePostalSelect({ label: '42183' });
    });

    expect(result.current.stageError).toBe('Gagal menyimpan pilihan area. Silakan coba lagi.');
    expect(onComplete).not.toHaveBeenCalled();
  });

  test('stores pending selection and preserves back navigation after postal selection', async () => {
    const onComplete = jest.fn();
    const resolvedArea: BiteshipArea = {
      id: 'area-42183',
      name: 'Walantaka',
      administrative_division_level_1_name: 'Banten',
      administrative_division_level_2_name: 'Kota Serang',
      administrative_division_level_3_name: 'Walantaka',
      postal_code: 42183,
    };
    mockSetPendingAreaSelection.mockImplementation(() => undefined);
    mockProvinceBootstrap([bantenProvince]);
    mockGetRegionalRegenciesByProvince.mockResolvedValue({ data: [serangCity], error: null });
    mockGetRegionalDistrictsByRegency.mockResolvedValue({ data: [walantakaDistrict], error: null });
    mockGetPostalCodesByDistrict.mockResolvedValue({ data: ['42183'], error: null });
    mockSearchBiteshipArea.mockResolvedValue({ data: [resolvedArea], error: null });

    const { result } = await renderAreaPickerFlow(onComplete);

    await act(async () => {
      await result.current.handleProvinceSelect(bantenProvince);
    });
    await act(async () => {
      await result.current.handleCitySelect(serangCity);
    });
    await act(async () => {
      await result.current.handleDistrictSelect(walantakaDistrict);
    });

    await waitFor(() => {
      expect(result.current.filteredPostalOptions).toEqual([{ label: '42183' }]);
    });

    await act(async () => {
      await result.current.handlePostalSelect({ label: '42183' });
    });

    expect(result.current.stage).toBe('postal');
    expect(result.current.selectedProvince).toEqual(bantenProvince);
    expect(result.current.selectedCity).toEqual(serangCity);
    expect(result.current.selectedDistrict).toEqual(walantakaDistrict);
    expect(result.current.selectedPostalLabel).toBe('42183');
    expect(result.current.selectedPostalOption).toEqual({ label: '42183' });
    expect(mockSetPendingAreaSelection).toHaveBeenCalledWith({
      area: resolvedArea,
      provinceName: bantenProvince.name,
      regencyName: serangCity.name,
      districtName: walantakaDistrict.name,
      postalCode: '42183',
    });
    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    act(() => {
      result.current.handleBack();
    });

    expect(result.current.stage).toBe('district');
    expect(result.current.selectedProvince).toEqual(bantenProvince);
    expect(result.current.selectedCity).toEqual(serangCity);
    expect(result.current.selectedDistrict).toEqual(walantakaDistrict);
    expect(result.current.selectedPostalLabel).toBeNull();
    expect(result.current.filteredPostalOptions).toEqual([]);
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleBack();
    });

    expect(result.current.stage).toBe('city');
    expect(result.current.selectedProvince).toEqual(bantenProvince);
    expect(result.current.selectedCity).toEqual(serangCity);
    expect(result.current.selectedDistrict).toBeNull();
    expect(result.current.filteredPostalOptions).toEqual([]);
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleBack();
    });

    expect(result.current.stage).toBe('province');
    expect(result.current.selectedProvince).toEqual(bantenProvince);
    expect(result.current.selectedCity).toBeNull();
    expect(result.current.selectedDistrict).toBeNull();
    expect(result.current.filteredPostalOptions).toEqual([]);
    expect(onComplete).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.handleBack();
    });

    expect(result.current.stage).toBe('province');
    expect(onComplete).toHaveBeenCalledTimes(2);
  });
});
