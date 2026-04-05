import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen, waitFor } from '@/test-utils/renderWithTheme';
import AddressSearchScreen from '@/scenes/profile/AddressSearch';
import type { AddressSuggestion, SelectedAddressSuggestion } from '@/types/geocoding';
import * as Location from 'expo-location';

const mockBack = jest.fn();
const mockSetPendingAddressSelection = jest.fn();
const mockLoadInitialSuggestions = jest.fn<(...args: unknown[]) => Promise<void>>();
const mockSelectSuggestion =
  jest.fn<(...args: unknown[]) => Promise<SelectedAddressSuggestion | null>>();
const mockSetQuery = jest.fn<(value: string) => void>();

let mockRouteParams: { query?: string; latitude?: string; longitude?: string } = {};
let mockSuggestionState: {
  query: string;
  results: AddressSuggestion[];
  isLoading: boolean;
  isRetrieving: boolean;
  error: string | null;
};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockRouteParams,
}));

jest.mock('expo-location', () => ({
  __esModule: true,
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
  },
  Accuracy: {
    Balanced: 'balanced',
  },
}));

jest.mock('react-native-safe-area-context', () => {
  const actual = jest.requireActual(
    'react-native-safe-area-context',
  ) as typeof import('react-native-safe-area-context');

  return {
    ...actual,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock('@/hooks/useAddressSuggestions', () => ({
  useAddressSuggestions: jest.fn(() => ({
    query: mockSuggestionState.query,
    setQuery: mockSetQuery,
    results: mockSuggestionState.results,
    isLoading: mockSuggestionState.isLoading,
    isRetrieving: mockSuggestionState.isRetrieving,
    error: mockSuggestionState.error,
    loadInitialSuggestions: mockLoadInitialSuggestions,
    selectSuggestion: mockSelectSuggestion,
  })),
}));

jest.mock('@/utils/addressSearchSession', () => ({
  setPendingAddressSelection: (selection: SelectedAddressSuggestion) =>
    mockSetPendingAddressSelection(selection),
}));

const mockedRequestForegroundPermissionsAsync = jest.mocked(
  Location.requestForegroundPermissionsAsync,
);
const mockedGetCurrentPositionAsync = jest.mocked(Location.getCurrentPositionAsync);

describe('<AddressSearchScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
    mockSuggestionState = {
      query: '',
      results: [],
      isLoading: false,
      isRetrieving: false,
      error: null,
    };
    mockLoadInitialSuggestions.mockResolvedValue(undefined);
    mockSelectSuggestion.mockResolvedValue(null);
    mockedRequestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      canAskAgain: true,
      granted: true,
      expires: 'never',
    });
    mockedGetCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: -6.2,
        longitude: 106.8,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });
  });

  it('loads nearby suggestions from route params location on initial open', async () => {
    mockRouteParams = { latitude: '-6.21', longitude: '106.84' };

    render(<AddressSearchScreen />);

    await waitFor(() => {
      expect(mockLoadInitialSuggestions).toHaveBeenCalledWith({
        latitude: -6.21,
        longitude: 106.84,
      });
    });
  });

  it('falls back to GPS when route params location is missing', async () => {
    render(<AddressSearchScreen />);

    await waitFor(() => {
      expect(mockedRequestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(mockLoadInitialSuggestions).toHaveBeenCalledWith({
        latitude: -6.2,
        longitude: 106.8,
      });
    });
  });

  it('forwards typing changes to setQuery and seeds the initial query from params', async () => {
    mockRouteParams = { query: 'Jalan Ciruas' };
    mockSuggestionState.query = 'Jalan Ciruas';

    render(<AddressSearchScreen />);

    await waitFor(() => {
      expect(mockSetQuery).toHaveBeenCalledWith('Jalan Ciruas');
    });

    fireEvent.changeText(screen.getByPlaceholderText('Nama Jalan, Gedung, No. Rumah'), 'Walantaka');

    expect(mockSetQuery).toHaveBeenCalledWith('Walantaka');
  });

  it('stores the selected address and navigates back after choosing a suggestion', async () => {
    const suggestion: AddressSuggestion = {
      id: 'place-1',
      placeId: 'place-1',
      name: 'Jalan Ciruas Petir',
      fullAddress: 'Jalan Ciruas Petir, Walantaka, Kota Serang, Banten 42183',
      primaryText: 'Jalan Ciruas Petir',
      secondaryText: 'Walantaka, Kota Serang, Banten 42183',
    };

    const selectedAddress: SelectedAddressSuggestion = {
      id: 'place-1',
      placeId: 'place-1',
      fullAddress: suggestion.fullAddress,
      streetAddress: 'Jalan Ciruas Petir',
      city: 'Kota Serang',
      district: 'Walantaka',
      province: 'Banten',
      postalCode: '42183',
      countryCode: 'ID',
      latitude: -6.12,
      longitude: 106.17,
      accuracy: null,
    };

    mockSuggestionState.results = [suggestion];
    mockSelectSuggestion.mockResolvedValue(selectedAddress);

    render(<AddressSearchScreen />);

    fireEvent.press(screen.getByText('Jalan Ciruas Petir'));

    await waitFor(() => {
      expect(mockSelectSuggestion).toHaveBeenCalledWith(suggestion);
      expect(mockSetPendingAddressSelection).toHaveBeenCalledWith(selectedAddress);
      expect(mockBack).toHaveBeenCalledTimes(1);
    });
  });

  it('reloads nearby recommendations when the query is cleared', async () => {
    mockSuggestionState.query = 'Jalan Ciruas';

    const { rerender } = render(<AddressSearchScreen />);

    expect(mockLoadInitialSuggestions).not.toHaveBeenCalled();

    mockSuggestionState.query = '';
    rerender(<AddressSearchScreen />);

    await waitFor(() => {
      expect(mockLoadInitialSuggestions).toHaveBeenCalledWith({
        latitude: -6.2,
        longitude: 106.8,
      });
    });
  });
});
