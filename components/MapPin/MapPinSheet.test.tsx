import { test, expect, jest } from '@jest/globals';
import { waitFor } from '@testing-library/react-native';
import { render, renderWithDarkTheme, screen, fireEvent } from '../../test-utils/renderWithTheme';
import MapPinSheet from './MapPinSheet';
import * as Location from 'expo-location';

jest.mock('tamagui', () => {
  const actual = jest.requireActual('tamagui') as typeof import('tamagui');
  const { View } = jest.requireActual('react-native') as typeof import('react-native');

  const Sheet = ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <View>{children}</View> : null;

  Sheet.Overlay = View;
  Sheet.Frame = View;

  return {
    ...actual,
    Sheet,
  };
});

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
  PermissionStatus: {
    GRANTED: 'granted',
  },
  Accuracy: {
    Balanced: 'balanced',
  },
}));

const mockedRequestForegroundPermissionsAsync = jest.mocked(
  Location.requestForegroundPermissionsAsync,
);
const mockedGetCurrentPositionAsync = jest.mocked(Location.getCurrentPositionAsync);

describe('<MapPinSheet />', () => {
  test('renders selected coordinates in light and dark themes', async () => {
    render(
      <MapPinSheet
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
      />,
    );

    expect(screen.getByTestId('map-view')).not.toBeNull();
    expect(screen.getByText('-6.200000, 106.800000')).not.toBeNull();

    renderWithDarkTheme(
      <MapPinSheet
        isOpen
        onClose={jest.fn()}
        onConfirm={jest.fn()}
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
      />,
    );

    expect(screen.getAllByText('Konfirmasi Lokasi').length).toBeGreaterThan(0);
  });

  test('updates coordinates from map press and confirms selection', async () => {
    const onConfirm = jest.fn();
    const onClose = jest.fn();

    render(
      <MapPinSheet
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        initialCoords={{ latitude: -6.2, longitude: 106.8 }}
      />,
    );

    fireEvent.press(screen.getByTestId('map-view'));

    expect(screen.getByText('-6.300000, 106.900000')).not.toBeNull();

    fireEvent.press(screen.getByText('Konfirmasi Lokasi'));

    expect(onConfirm).toHaveBeenCalledWith({ latitude: -6.3, longitude: 106.9 });
    expect(onClose).toHaveBeenCalledTimes(1);
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

    render(<MapPinSheet isOpen onClose={jest.fn()} onConfirm={jest.fn()} />);

    await waitFor(() => {
      expect(mockedRequestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });

    await waitFor(() => {
      expect(screen.getByText('-6.250000, 106.750000')).not.toBeNull();
    });
  });
});
