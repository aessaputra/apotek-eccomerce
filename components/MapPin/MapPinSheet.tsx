import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Sheet, YStack, XStack, Text } from 'tamagui';
import { MapPin } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Button from '@/components/elements/Button';
import { PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';

let MapView: typeof import('react-native-maps').default | null = null;
let Marker: typeof import('react-native-maps').Marker | null = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
}

type MapPressEvent = import('react-native-maps').MapPressEvent;
type MarkerDragStartEndEvent = import('react-native-maps').MarkerDragStartEndEvent;

export interface MapCoords {
  latitude: number;
  longitude: number;
}

export interface MapPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (coords: MapCoords) => void;
  initialCoords?: MapCoords;
}

const JAKARTA_FALLBACK: MapCoords = { latitude: -6.2088, longitude: 106.8456 };
const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

function MapPinSheet({ isOpen, onClose, onConfirm, initialCoords }: MapPinSheetProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<import('react-native-maps').default | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<MapCoords>(
    initialCoords ?? JAKARTA_FALLBACK,
  );
  const [isLocating, setIsLocating] = useState(false);
  const hasInteracted = useRef(false);
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    if (!isOpen) return;

    hasInteracted.current = false;

    if (initialCoords) {
      setSelectedCoords(initialCoords);
      if (Platform.OS !== 'web') {
        setTimeout(() => {
          if (mapRef.current && !hasInteracted.current) {
            mapRef.current.animateToRegion({ ...initialCoords, ...DEFAULT_DELTA });
          }
        }, 300);
      }
      return;
    }

    setSelectedCoords(JAKARTA_FALLBACK);
    setIsLocating(true);
    Location.requestForegroundPermissionsAsync()
      .then(({ status }) => {
        if (status !== 'granted') {
          setIsLocating(false);
          return;
        }

        return Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
      })
      .then(location => {
        if (location && !hasInteracted.current) {
          const coords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          setSelectedCoords(coords);
          if (mapRef.current) {
            mapRef.current.animateToRegion({
              ...coords,
              ...DEFAULT_DELTA,
            });
          }
        }
        setIsLocating(false);
      })
      .catch(() => {
        setIsLocating(false);
      });
  }, [isOpen, initialCoords]);

  const handleMapPress = useCallback((event: MapPressEvent) => {
    hasInteracted.current = true;
    setSelectedCoords(event.nativeEvent.coordinate);
  }, []);

  const handleMarkerDragEnd = useCallback((event: MarkerDragStartEndEvent) => {
    hasInteracted.current = true;
    setSelectedCoords(event.nativeEvent.coordinate);
  }, []);

  const handleConfirm = useCallback(() => {
    onConfirm(selectedCoords);
    onClose();
  }, [onConfirm, selectedCoords, onClose]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) onClose();
    },
    [onClose],
  );

  const coordLabel = isLocating
    ? 'Mencari lokasi GPS...'
    : `${selectedCoords.latitude.toFixed(6)}, ${selectedCoords.longitude.toFixed(6)}`;

  return (
    <Sheet
      open={isOpen}
      onOpenChange={handleOpenChange}
      modal
      dismissOnOverlayPress
      dismissOnSnapToBottom
      snapPoints={[95]}
      animation="medium">
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="$sheetOverlay"
      />
      <Sheet.Handle />
      <Sheet.Frame backgroundColor="$background" borderTopLeftRadius="$6" borderTopRightRadius="$6">
        <YStack flex={1}>
          <YStack paddingHorizontal="$4" paddingTop="$3" paddingBottom="$2">
            <Text fontSize="$6" fontWeight="700" color="$color">
              Pilih Lokasi di Peta
            </Text>
            <Text fontSize="$3" color="$colorMuted" marginTop="$1">
              Ketuk peta atau seret pin untuk menentukan lokasi
            </Text>
          </YStack>

          <YStack flex={1} overflow="hidden">
            {MapView && Marker ? (
              <MapView
                ref={mapRef}
                style={{ flex: 1 }}
                initialRegion={{
                  ...selectedCoords,
                  ...DEFAULT_DELTA,
                }}
                onPress={handleMapPress}
                showsUserLocation
                showsMyLocationButton>
                <Marker coordinate={selectedCoords} draggable onDragEnd={handleMarkerDragEnd} />
              </MapView>
            ) : (
              <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
                <Text fontSize="$5" color="$colorMuted" textAlign="center">
                  Peta tidak tersedia di web.
                </Text>
                <Text fontSize="$3" color="$colorMuted" marginTop="$2" textAlign="center">
                  Silakan gunakan aplikasi mobile untuk memilih lokasi di peta.
                </Text>
              </YStack>
            )}
          </YStack>

          <YStack
            paddingHorizontal="$4"
            paddingTop="$3"
            paddingBottom={Math.max(insets.bottom, 16)}
            gap="$2"
            backgroundColor="$background"
            borderTopWidth={1}
            borderTopColor="$surfaceBorder">
            <XStack gap="$2" alignItems="center">
              <MapPin size={16} color="$primary" />
              <Text fontSize="$3" color="$colorMuted" flex={1} numberOfLines={1}>
                {coordLabel}
              </Text>
            </XStack>

            <Button
              title={isWeb ? 'Peta tidak tersedia di web' : 'Konfirmasi Lokasi'}
              backgroundColor="$primary"
              borderRadius="$4"
              minHeight={56}
              onPress={handleConfirm}
              disabled={isLocating || isWeb}
              isLoading={isLocating}
              titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
            />
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

export default MapPinSheet;
