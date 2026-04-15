import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { fireEvent, render, screen } from '@/test-utils/renderWithTheme';
import AddressMapScreen from '@/scenes/profile/AddressMap';

const mockBack = jest.fn();
const mockSetPendingMapPickerResult = jest.fn();

let mockRouteParams: {
  latitude?: string;
  longitude?: string;
  streetAddress?: string;
  areaName?: string;
  city?: string;
  province?: string;
  postalCode?: string;
} = {};

jest.mock('expo-router', () => ({
  __esModule: true,
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => mockRouteParams,
}));

jest.mock('@/utils/mapPickerSession', () => ({
  setPendingMapPickerResult: (coords: { latitude: number; longitude: number }) =>
    mockSetPendingMapPickerResult(coords),
}));

jest.mock('@/components/MapPin', () => ({
  MapPicker: ({
    initialCoords,
    selectedAddressSummary,
    onConfirm,
    onDismiss,
    onEditAddressPress,
  }: {
    initialCoords?: { latitude: number; longitude: number };
    selectedAddressSummary?: string;
    onConfirm: (result: { latitude: number; longitude: number; didAdjustPin: boolean }) => void;
    onDismiss: () => void;
    onEditAddressPress?: () => void;
  }) => {
    const { Pressable, Text, View } = jest.requireActual(
      'react-native',
    ) as typeof import('react-native');

    return (
      <View>
        <Text>{selectedAddressSummary ?? 'no-summary'}</Text>
        <Text>
          {initialCoords ? `${initialCoords.latitude},${initialCoords.longitude}` : 'no-coords'}
        </Text>
        <Pressable
          testID="address-map-confirm"
          onPress={() => onConfirm({ latitude: -6.3, longitude: 106.9, didAdjustPin: true })}
        />
        <Pressable testID="address-map-dismiss" onPress={onDismiss} />
        <Pressable testID="address-map-edit" onPress={() => onEditAddressPress?.()} />
      </View>
    );
  },
}));

describe('<AddressMapScreen />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRouteParams = {};
  });

  it('passes parsed route params into the map picker', () => {
    mockRouteParams = {
      latitude: '-6.2',
      longitude: '106.8',
      streetAddress: 'Jalan Ciruas Petir',
      areaName: 'Walantaka',
      city: 'Kota Serang',
      province: 'Banten',
      postalCode: '42183',
    };

    render(<AddressMapScreen />);

    expect(screen.getByText('-6.2,106.8')).not.toBeNull();
    expect(
      screen.getByText('Jalan Ciruas Petir, Walantaka, Kota Serang, Banten, 42183'),
    ).not.toBeNull();
  });

  it('stores confirmed coordinates and navigates back', () => {
    render(<AddressMapScreen />);

    fireEvent.press(screen.getByTestId('address-map-confirm'));

    expect(mockSetPendingMapPickerResult).toHaveBeenCalledWith({
      latitude: -6.3,
      longitude: 106.9,
      didAdjustPin: true,
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('navigates back when dismissing or editing the address', () => {
    render(<AddressMapScreen />);

    fireEvent.press(screen.getByTestId('address-map-dismiss'));
    fireEvent.press(screen.getByTestId('address-map-edit'));

    expect(mockBack).toHaveBeenCalledTimes(2);
  });
});
