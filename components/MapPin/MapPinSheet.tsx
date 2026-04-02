import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { Sheet, YStack, XStack, Text } from 'tamagui';
import { MapPin, X } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Button from '@/components/elements/Button';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
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
  selectedAddressSummary?: string;
  onEditAddressPress?: () => void;
}

const JAKARTA_FALLBACK: MapCoords = { latitude: -6.2088, longitude: 106.8456 };
const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

function MapPinSheet({
  isOpen,
  onClose,
  onConfirm,
  initialCoords,
  selectedAddressSummary,
  onEditAddressPress,
}: MapPinSheetProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<import('react-native-maps').default | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<MapCoords>(
    initialCoords ?? JAKARTA_FALLBACK,
  );
  const [isLocating, setIsLocating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const hasInteracted = useRef(false);

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

  const handleConfirmRequest = useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmLocation = useCallback(() => {
    onConfirm(selectedCoords);
    setShowConfirmDialog(false);
    onClose();
  }, [onConfirm, selectedCoords, onClose]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

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
      dismissOnSnapToBottom={false}
      disableDrag
      snapPoints={[100]}
      animation="medium">
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="$sheetOverlay"
      />
      <Sheet.Frame backgroundColor="$background" pointerEvents="box-none">
        <YStack flex={1} pointerEvents="box-none">
          <YStack flex={1} overflow="hidden" pointerEvents="auto">
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
              <YStack flex={1} justifyContent="center" alignItems="center" padding="$4" gap="$3">
                <Text fontSize="$5" color="$colorSubtle" textAlign="center" fontWeight="500">
                  Peta Tidak Tersedia
                </Text>
                <Text fontSize="$3" color="$colorMuted" textAlign="center">
                  Konfirmasi lokasi berdasarkan alamat yang dipilih.
                </Text>

                {selectedAddressSummary ? (
                  <YStack
                    width="100%"
                    backgroundColor="$surface"
                    borderRadius="$4"
                    borderWidth={1.5}
                    borderColor="$surfaceBorder"
                    padding="$4"
                    gap="$2">
                    <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                      Alamat Terpilih
                    </Text>
                    <Text fontSize="$4" color="$color" fontWeight="500">
                      {selectedAddressSummary}
                    </Text>
                  </YStack>
                ) : null}

                {selectedCoords ? (
                  <XStack gap="$1.5" alignItems="center">
                    <MapPin size={14} color="$primary" />
                    <Text fontSize="$3" color="$colorSubtle">
                      {selectedCoords.latitude.toFixed(6)}, {selectedCoords.longitude.toFixed(6)}
                    </Text>
                  </XStack>
                ) : null}
              </YStack>
            )}

            <XStack
              position="absolute"
              top={insets.top + 12}
              left={12}
              zIndex={100}
              width={44}
              height={44}
              borderRadius={22}
              backgroundColor="$surfaceElevated"
              alignItems="center"
              justifyContent="center"
              pressStyle={{ opacity: 0.8, scale: 0.95 }}
              animation="quick"
              onPress={onClose}
              pointerEvents="auto">
              <X size={22} color="$color" />
            </XStack>

            {selectedAddressSummary ? (
              <YStack
                position="absolute"
                top={insets.top + 68}
                left={16}
                right={16}
                backgroundColor="$surface"
                borderRadius="$5"
                borderWidth={1.5}
                borderColor="$surfaceBorder"
                padding="$4"
                gap="$2"
                shadowColor="$shadowColor"
                shadowOpacity={0.15}
                shadowRadius={16}
                shadowOffset={{ width: 0, height: 8 }}>
                <Text fontSize="$2" color="$colorMuted" fontWeight="500">
                  Alamat Terpilih
                </Text>
                <XStack justifyContent="space-between" gap="$3" alignItems="center">
                  <Text flex={1} fontSize="$4" color="$color" fontWeight="500" numberOfLines={2}>
                    {selectedAddressSummary}
                  </Text>
                  <Text
                    color="$primary"
                    fontSize="$3"
                    fontWeight="600"
                    pressStyle={{ opacity: 0.8 }}
                    onPress={() => onEditAddressPress?.()}>
                    Ubah
                  </Text>
                </XStack>
              </YStack>
            ) : null}

            <YStack
              position="absolute"
              alignSelf="center"
              top="42%"
              backgroundColor="$primary"
              borderRadius="$6"
              paddingHorizontal="$4"
              paddingVertical="$2.5"
              gap="$1"
              alignItems="center"
              shadowColor="$shadowColor"
              shadowOpacity={0.22}
              shadowRadius={14}
              shadowOffset={{ width: 0, height: 8 }}>
              <Text fontSize="$4" color="$onPrimary" fontWeight="700">
                Alamatmu di sini
              </Text>
              <Text fontSize="$2" color="$onPrimary" textAlign="center">
                Mohon periksa kembali lokasi peta
              </Text>
            </YStack>
          </YStack>

          <YStack
            paddingHorizontal="$4"
            paddingTop="$3"
            paddingBottom={Math.max(insets.bottom, 16)}
            gap="$2"
            backgroundColor="$background"
            borderTopWidth={1}
            borderTopColor="$surfaceBorder"
            pointerEvents="auto">
            <XStack gap="$2" alignItems="center">
              <MapPin size={16} color="$primary" />
              <Text fontSize="$3" color="$colorSubtle" flex={1} numberOfLines={1}>
                {coordLabel}
              </Text>
            </XStack>

            <Button
              title="Konfirmasi"
              backgroundColor="$primary"
              borderRadius="$4"
              minHeight={56}
              onPress={handleConfirmRequest}
              disabled={isLocating || !selectedCoords}
              isLoading={isLocating}
              titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
            />
          </YStack>
        </YStack>
      </Sheet.Frame>

      <AppAlertDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        title="Konfirmasi Lokasi Pengiriman"
        description="Pastikan titik di peta sudah sesuai dengan alamat lengkap. Lokasi yang akurat membantu kurir menemukan alamat Anda."
        confirmText="Ya, Konfirmasi"
        cancelText="Cek Ulang"
        onConfirm={handleConfirmLocation}
        onCancel={handleCancelConfirm}
        confirmColor="$primary"
        confirmTextColor="$onPrimary"
        cancelColor="$background"
        cancelTextColor="$colorSubtle"
      />
    </Sheet>
  );
}

export default MapPinSheet;
