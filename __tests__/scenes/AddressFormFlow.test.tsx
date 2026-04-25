import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Keyboard, Platform } from 'react-native';
import type { EmitterSubscription, KeyboardEvent } from 'react-native';
import { render } from '@/test-utils/renderWithTheme';
import AddressFormScreen from '@/scenes/profile/AddressForm';

const mockPush = jest.fn();
const mockBack = jest.fn();

const mockConsumePendingAddressSelection = jest.fn<
  () => {
    streetAddress: string;
    city: string;
    province: string;
    postalCode: string;
    latitude: number;
    longitude: number;
  } | null
>();
type PendingAreaSelection = {
  area: {
    id: string;
    name: string;
    administrative_division_level_2_name?: string;
    administrative_division_level_2_type?: string;
    administrative_division_level_3_name?: string;
    administrative_division_level_1_name?: string;
    postal_code?: number;
  };
  provinceName?: string;
  regencyName?: string;
  districtName?: string;
  postalCode?: string;
};

const mockConsumePendingAreaSelection = jest.fn<() => PendingAreaSelection | null>();
type PendingMapPickerResult = {
  latitude: number;
  longitude: number;
  didAdjustPin: boolean;
};

const mockConsumePendingMapPickerResult = jest.fn<() => PendingMapPickerResult | null>();
const mockSetFieldValue = jest.fn();
const mockValidateField = jest.fn();
const mockValidateAll = jest.fn(() => true);
const mockPopulateFromAddress = jest.fn();
const mockSetArea = jest.fn();
const mockClearArea = jest.fn();
const mockSetMapConfirmed = jest.fn();
const mockResetMapConfirmation = jest.fn();
const mockSetGeneralError = jest.fn();

const mockValues = {
  receiverName: '',
  phoneNumber: '',
  streetAddress: '',
  addressNote: '',
  areaId: 'area-1',
  areaName: 'Walantaka',
  city: 'Kota Serang',
  postalCode: '42183',
  province: 'Banten',
  isDefault: false,
  latitude: null as number | null,
  longitude: null as number | null,
};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ push: mockPush, back: mockBack }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('@react-navigation/elements', () => ({
  useHeaderHeight: () => 0,
}));

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = jest.requireActual('react') as typeof import('react');

    useEffect(() => {
      callback();
    }, [callback]);
  },
}));

jest.mock('expo-haptics', () => ({
  __esModule: true,
  notificationAsync: jest.fn(),
  impactAsync: jest.fn(),
  NotificationFeedbackType: { Error: 'error', Warning: 'warning' },
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

jest.mock('@/slices', () => ({
  useAppSlice: () => ({ user: { id: 'user-1' } }),
}));

jest.mock('@/hooks/useAddressForm', () => ({
  useAddressForm: () => ({
    values: mockValues,
    errors: {
      receiverName: null,
      phoneNumber: null,
      streetAddress: null,
      areaId: null,
      city: null,
      postalCode: null,
    },
    generalError: null,
    setGeneralError: mockSetGeneralError,
    setFieldValue: mockSetFieldValue,
    validateField: mockValidateField,
    validateAll: mockValidateAll,
    populateFromAddress: mockPopulateFromAddress,
    setArea: mockSetArea,
    clearArea: mockClearArea,
    refs: {
      receiverNameRef: { current: null },
      phoneNumberRef: { current: null },
      streetAddressRef: { current: null },
      addressNoteRef: { current: null },
      cityRef: { current: null },
      postalCodeRef: { current: null },
      provinceRef: { current: null },
    },
    mapConfirmed: false,
    setMapConfirmed: mockSetMapConfirmed,
    resetMapConfirmation: mockResetMapConfirmation,
  }),
}));

jest.mock('@/hooks/useAddressData', () => ({
  useAddressData: () => ({
    isLoading: false,
    isSaving: false,
    error: null,
    loadAddress: jest.fn(),
    saveAddress: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('@/services/address.service', () => ({
  buildAddressPayload: jest.fn(),
}));

jest.mock('@/components/AddressForm/AddressForm', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  function MockAddressForm() {
    return <View />;
  }

  return MockAddressForm;
});

jest.mock('@/components/AddressForm/DefaultAddressToggle', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  function MockDefaultAddressToggle() {
    return <View />;
  }

  return MockDefaultAddressToggle;
});

jest.mock('@/components/elements/AppAlertDialog', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  function MockAppAlertDialog() {
    return <View />;
  }

  return MockAppAlertDialog;
});

jest.mock('@/components/elements/ErrorMessage', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  function MockErrorMessage() {
    return <View />;
  }

  return MockErrorMessage;
});

jest.mock('@/components/layouts/BottomActionBar', () => {
  const { View } = jest.requireActual('react-native') as typeof import('react-native');
  function MockBottomActionBar() {
    return <View />;
  }

  return MockBottomActionBar;
});

jest.mock('@/services/googlePlaces.service', () => ({
  sanitizeAddressCandidate: (value: string) => value.trim(),
}));

jest.mock('@/utils/addressSearchSession', () => ({
  consumePendingAddressSelection: () => mockConsumePendingAddressSelection(),
}));

jest.mock('@/utils/areaPickerSession', () => ({
  consumePendingAreaSelection: () => mockConsumePendingAreaSelection(),
}));

jest.mock('@/utils/mapPickerSession', () => ({
  consumePendingMapPickerResult: () => mockConsumePendingMapPickerResult(),
}));

jest.mock('@/utils/areaFormatters', () => ({
  formatLevel2Display: (value: string) => value,
  resolveAreaNames: (selectedArea: {
    area: {
      administrative_division_level_2_name?: string;
      administrative_division_level_1_name?: string;
      postal_code?: number;
      name: string;
    };
    districtName?: string;
    regencyName?: string;
    provinceName?: string;
    postalCode?: string;
  }) => ({
    district: selectedArea.districtName || selectedArea.area.name,
    regency:
      selectedArea.regencyName || selectedArea.area.administrative_division_level_2_name || '',
    province:
      selectedArea.provinceName || selectedArea.area.administrative_division_level_1_name || '',
    postalCode: selectedArea.postalCode || String(selectedArea.area.postal_code ?? ''),
  }),
  buildAreaDisplayName: ({
    district,
    regency,
    province,
    postalCode,
  }: {
    district: string;
    regency: string;
    province: string;
    postalCode: string;
  }) => [district, regency, province, postalCode].filter(Boolean).join(', '),
}));

describe('<AddressFormScreen /> address flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockValues.receiverName = '';
    mockValues.phoneNumber = '';
    mockValues.streetAddress = '';
    mockValues.addressNote = '';
    mockValues.areaId = 'area-1';
    mockValues.areaName = 'Walantaka';
    mockValues.city = 'Kota Serang';
    mockValues.postalCode = '42183';
    mockValues.province = 'Banten';
    mockValues.isDefault = false;
    mockValues.latitude = null;
    mockValues.longitude = null;
    mockConsumePendingAddressSelection.mockReturnValue(null);
    mockConsumePendingAreaSelection.mockReturnValue(null);
    mockConsumePendingMapPickerResult.mockReturnValue(null);

    mockSetFieldValue.mockImplementation((...args: unknown[]) => {
      const [field, value] = args as [keyof typeof mockValues, unknown];
      (mockValues as Record<string, unknown>)[field] = value;
    });
    mockSetArea.mockImplementation((...args: unknown[]) => {
      const [area] = args as [
        { id: string; name: string; city: string; province: string; postalCode: string },
      ];
      mockValues.areaId = area.id;
      mockValues.areaName = area.name;
      mockValues.city = area.city;
      mockValues.province = area.province;
      mockValues.postalCode = area.postalCode;
    });
    mockSetMapConfirmed.mockImplementation((...args: unknown[]) => {
      const [confirmed] = args as [boolean];
      (mockValues as Record<string, unknown>).mapConfirmed = confirmed;
    });
  });

  it('opens the map route automatically after consuming a selected address', () => {
    mockConsumePendingAddressSelection.mockReturnValueOnce({
      streetAddress: 'Jl. Sudirman No. 1',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12345',
      latitude: -6.2,
      longitude: 106.8,
    });

    render(<AddressFormScreen />);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/address-map',
      params: {
        areaName: 'Walantaka',
        city: 'Kota Serang',
        latitude: '-6.2',
        longitude: '106.8',
        postalCode: '42183',
        province: 'Banten',
        streetAddress: 'Jl. Sudirman No. 1',
      },
    });
    expect(mockSetMapConfirmed).toHaveBeenCalledWith(false);
  });

  it('preserves selected area when map confirmation did not adjust the pin', async () => {
    mockConsumePendingMapPickerResult.mockReturnValueOnce({
      latitude: -6.2,
      longitude: 106.8,
      didAdjustPin: false,
    });

    render(<AddressFormScreen />);

    expect(mockClearArea).not.toHaveBeenCalled();
    expect(mockSetFieldValue).not.toHaveBeenCalledWith('city', 'Kota Bandung');
    expect(mockSetFieldValue).not.toHaveBeenCalledWith('province', 'Jawa Barat');
    expect(mockSetFieldValue).not.toHaveBeenCalledWith('postalCode', '40111');
    expect(mockSetGeneralError).not.toHaveBeenCalled();
  });

  it('preserves selected area even when map pin was adjusted', () => {
    mockConsumePendingMapPickerResult.mockReturnValueOnce({
      latitude: -6.2,
      longitude: 106.8,
      didAdjustPin: true,
    });

    render(<AddressFormScreen />);

    expect(mockClearArea).not.toHaveBeenCalled();
    expect(mockSetGeneralError).not.toHaveBeenCalled();
  });

  it('registers and removes Android keyboard show/hide listeners', () => {
    const originalPlatform = Platform.OS;
    const removeShow = jest.fn();
    const removeHide = jest.fn();
    const keyboardEvent: KeyboardEvent = {
      duration: 0,
      easing: 'keyboard',
      endCoordinates: { height: 240, screenX: 0, screenY: 0, width: 320 },
      startCoordinates: { height: 0, screenX: 0, screenY: 0, width: 320 },
    };
    const addListenerSpy = jest
      .spyOn(Keyboard, 'addListener')
      .mockImplementation((eventName, listener) => {
        if (eventName === 'keyboardDidShow') {
          listener(keyboardEvent);
          return { remove: removeShow } as unknown as EmitterSubscription;
        }

        listener(keyboardEvent);
        return { remove: removeHide } as unknown as EmitterSubscription;
      });

    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const { unmount } = render(<AddressFormScreen />);

    expect(addListenerSpy).toHaveBeenCalledWith('keyboardDidShow', expect.any(Function));
    expect(addListenerSpy).toHaveBeenCalledWith('keyboardDidHide', expect.any(Function));

    unmount();

    expect(removeShow).toHaveBeenCalled();
    expect(removeHide).toHaveBeenCalled();

    addListenerSpy.mockRestore();
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatform });
  });

  it('applies mixed pending sources in area → address → map precedence order', () => {
    mockConsumePendingAreaSelection.mockReturnValueOnce({
      area: {
        id: 'area-2',
        name: 'Ciruas',
        administrative_division_level_2_name: 'Kabupaten Serang',
        administrative_division_level_2_type: 'regency',
        administrative_division_level_3_name: 'Ciruas',
        administrative_division_level_1_name: 'Banten',
        postal_code: 42182,
      },
    });
    mockConsumePendingAddressSelection.mockReturnValueOnce({
      streetAddress: 'Jl. Raya Baru',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12345',
      latitude: -6.21,
      longitude: 106.81,
    });
    mockConsumePendingMapPickerResult.mockReturnValueOnce({
      latitude: -6.22,
      longitude: 106.82,
      didAdjustPin: true,
    });

    render(<AddressFormScreen />);

    expect(mockValues.areaId).toBe('area-2');
    expect(mockValues.areaName).toContain('Ciruas');
    expect(mockValues.streetAddress).toBe('Jl. Raya Baru');
    expect(mockValues.latitude).toBe(-6.22);
    expect(mockValues.longitude).toBe(106.82);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/profile/address-map',
      params: {
        areaName: expect.stringContaining('Ciruas'),
        city: 'Kabupaten Serang',
        latitude: '-6.21',
        longitude: '106.81',
        postalCode: '42182',
        province: 'Banten',
        streetAddress: 'Jl. Raya Baru',
      },
    });
  });
});
