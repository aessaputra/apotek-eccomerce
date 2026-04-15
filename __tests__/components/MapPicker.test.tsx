import { test, expect, jest } from '@jest/globals';
import { waitFor } from '@testing-library/react-native';
import { render, renderWithDarkTheme, screen, fireEvent } from '@/test-utils/renderWithTheme';
import MapPicker from '@/components/MapPin/MapPicker';
import * as Location from 'expo-location';

jest.mock('react-native-maps', () => {
  const React = jest.requireActual('react') as typeof import('react');
  const { Pressable } = jest.requireActual('react-native') as typeof import('react-native');

  const MockMapView = React.forwardRef(
    (
      {
        children,
        onPress,
      }: {
        children: React.ReactNode;
        onPress?: (event: {
          nativeEvent: { coordinate: { latitude: number; longitude: number } };
        }) => void;
      },
      ref: React.ForwardedRef<{ animateToRegion: (region: unknown) => void }>,
    ) => {
      React.useImperativeHandle(ref, () => ({
        animateToRegion: () => undefined,
      }));

      return (
        <Pressable
          testID="map-view"
          onPress={() =>
            onPress?.({ nativeEvent: { coordinate: { latitude: -6.3, longitude: 106.9 } } })
          }>
          {children}
        </Pressable>
      );
    },
  );

  MockMapView.displayName = 'MockMapView';

  const MockMarker = ({
    onDragEnd,
  }: {
    onDragEnd?: (event: {
      nativeEvent: { coordinate: { latitude: number; longitude: number } };
    }) => void;
  }) => (
    <Pressable
      testID="map-marker"
      onPress={() =>
        onDragEnd?.({ nativeEvent: { coordinate: { latitude: -6.31, longitude: 106.91 } } })
      }
    />
  );

  return {
    __esModule: true,
    default: MockMapView,
    Marker: MockMarker,
  };
});

jest.mock('expo-location', () => ({
  __esModule: true,
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  getLastKnownPositionAsync: jest.fn(),
  PermissionStatus: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
  Accuracy: {
    Balanced: 'balanced',
  },
}));

const mockedRequestForegroundPermissionsAsync = jest.mocked(
  Location.requestForegroundPermissionsAsync,
);
const mockedGetCurrentPositionAsync = jest.mocked(Location.getCurrentPositionAsync);
const mockedGetLastKnownPositionAsync = jest.mocked(Location.getLastKnownPositionAsync);

describe('<MapPicker />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedGetLastKnownPositionAsync.mockResolvedValue(null);
  });

  test('renders selected coordinates in light and dark themes', async () => {
    render(
      <MapPicker
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getByTestId('map-view')).not.toBeNull();
    expect(screen.getByText('-6.200000, 106.800000')).not.toBeNull();

    renderWithDarkTheme(
      <MapPicker
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
      />,
    );

    expect(screen.getAllByText('Konfirmasi').length).toBeGreaterThan(0);
  });

  test('updates coordinates from map press and confirms selection', async () => {
    const onConfirm = jest.fn();
    const onDismiss = jest.fn();

    render(
      <MapPicker
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
        onConfirm={onConfirm}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(screen.getByTestId('map-view'));

    expect(screen.getByText('-6.300000, 106.900000')).not.toBeNull();

    fireEvent.press(screen.getByText('Konfirmasi'));
    fireEvent.press(screen.getByText('Ya, Konfirmasi'));

    expect(onConfirm).toHaveBeenCalledWith({
      latitude: -6.3,
      longitude: 106.9,
      didAdjustPin: true,
    });
  });

  test('confirms unchanged initial pin with didAdjustPin false', () => {
    const onConfirm = jest.fn();

    render(
      <MapPicker
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
        onConfirm={onConfirm}
        onDismiss={jest.fn()}
      />,
    );

    fireEvent.press(screen.getByText('Konfirmasi'));
    fireEvent.press(screen.getByText('Ya, Konfirmasi'));

    expect(onConfirm).toHaveBeenCalledWith({
      latitude: -6.2,
      longitude: 106.8,
      didAdjustPin: false,
    });
  });

  test('requests current location when opened without initial coordinates', async () => {
    mockedRequestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      canAskAgain: true,
      granted: true,
      expires: 'never',
    });
    mockedGetCurrentPositionAsync.mockResolvedValue({
      coords: {
        latitude: -6.25,
        longitude: 106.75,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });

    render(<MapPicker onConfirm={jest.fn()} onDismiss={jest.fn()} />);

    await waitFor(() => {
      expect(mockedRequestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    expect(mockedGetCurrentPositionAsync).toHaveBeenCalledWith({
      accuracy: Location.Accuracy.Balanced,
      mayShowUserSettingsDialog: true,
    });

    await waitFor(() => {
      expect(screen.getByText('-6.250000, 106.750000')).not.toBeNull();
    });
  });

  test('shows permission guidance when location permission is denied', async () => {
    mockedRequestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.DENIED,
      canAskAgain: true,
      granted: false,
      expires: 'never',
    });

    render(<MapPicker onConfirm={jest.fn()} onDismiss={jest.fn()} />);

    await waitFor(() => {
      expect(
        screen.getByText(
          'Izin lokasi tidak diberikan. Geser pin secara manual atau aktifkan lokasi di Pengaturan perangkat.',
        ),
      ).not.toBeNull();
    });
  });

  test('falls back to last known position when live GPS lookup fails', async () => {
    mockedRequestForegroundPermissionsAsync.mockResolvedValue({
      status: Location.PermissionStatus.GRANTED,
      canAskAgain: true,
      granted: true,
      expires: 'never',
    });
    mockedGetCurrentPositionAsync.mockRejectedValue(new Error('GPS unavailable'));
    mockedGetLastKnownPositionAsync.mockResolvedValue({
      coords: {
        latitude: -6.22,
        longitude: 106.82,
        accuracy: null,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    });

    render(<MapPicker onConfirm={jest.fn()} onDismiss={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('-6.220000, 106.820000')).not.toBeNull();
    });
  });

  test('asks for confirmation before closing after pin changes', async () => {
    const onDismiss = jest.fn();

    render(
      <MapPicker
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
        onConfirm={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(screen.getByTestId('map-view'));

    fireEvent.press(screen.getByLabelText('Tutup peta'));

    expect(screen.getByText('Batalkan Penyesuaian Pin?')).not.toBeNull();
    expect(onDismiss).not.toHaveBeenCalled();

    fireEvent.press(screen.getByText('Tutup'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('calls onDismiss immediately when no pin changes', () => {
    const onDismiss = jest.fn();

    render(
      <MapPicker
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
        onConfirm={jest.fn()}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.press(screen.getByLabelText('Tutup peta'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('calls onEditAddressPress when user taps Ubah', () => {
    const onEditAddressPress = jest.fn();

    render(
      <MapPicker
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
        onConfirm={jest.fn()}
        onDismiss={jest.fn()}
        selectedAddressSummary="Jalan Ciruas Petir, Walantaka, Kota Serang"
        onEditAddressPress={onEditAddressPress}
      />,
    );

    fireEvent.press(screen.getByText('Ubah'));

    expect(onEditAddressPress).toHaveBeenCalledTimes(1);
  });
});
