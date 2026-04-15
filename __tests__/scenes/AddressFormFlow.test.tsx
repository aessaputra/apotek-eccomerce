import { beforeEach, describe, expect, it, jest } from '@jest/globals';
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
const mockConsumePendingAreaSelection = jest.fn(() => null);
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
    values: {
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
      latitude: null,
      longitude: null,
    },
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
  resolveAreaNames: jest.fn(),
  buildAreaDisplayName: jest.fn(() => ''),
}));

describe('<AddressFormScreen /> address flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsumePendingAddressSelection.mockReturnValue(null);
    mockConsumePendingMapPickerResult.mockReturnValue(null);
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
});
