import { useState, useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { YStack, XStack, Text } from 'tamagui';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  useReducedMotion,
} from 'react-native-reanimated';
import { MapPin, X } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import Button from '@/components/elements/Button';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import { PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';

let MapView: typeof import('react-native-maps').default | null = null;

if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Maps = require('react-native-maps');
  MapView = Maps.default;
}

type MapPressEvent = import('react-native-maps').MapPressEvent;

export interface MapCoords {
  latitude: number;
  longitude: number;
}

export interface MapPickerResult extends MapCoords {
  didAdjustPin: boolean;
}

export interface MapPickerProps {
  initialCoords?: MapCoords;
  selectedAddressSummary?: string;
  onConfirm: (result: MapPickerResult) => void;
  onDismiss: () => void;
  onEditAddressPress?: () => void;
}

const JAKARTA_FALLBACK: MapCoords = { latitude: -6.2088, longitude: 106.8456 };
const DEFAULT_DELTA = { latitudeDelta: 0.01, longitudeDelta: 0.01 };

function BouncingMapPin({ isDraggingMap }: { isDraggingMap: boolean }) {
  const reducedMotion = useReducedMotion();
  const bounceY = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;

    bounceY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 500, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 500, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      true,
    );
  }, [reducedMotion, bounceY]);

  const bounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  return (
    <YStack
      position="absolute"
      top={0}
      bottom={0}
      left={0}
      right={0}
      alignItems="center"
      justifyContent="center"
      pointerEvents="none">
      <YStack alignItems="center" marginTop={-44}>
        <YStack opacity={isDraggingMap ? 0.6 : 1} animation="quick" alignItems="center">
          <Animated.View style={bounceStyle}>
            <YStack alignItems="center">
              <YStack
                backgroundColor="$danger"
                paddingHorizontal="$3"
                paddingVertical="$1.5"
                borderRadius="$4">
                <Text color="white" fontSize="$2" fontWeight="600">
                  Alamatmu di sini
                </Text>
              </YStack>
              <YStack
                width={10}
                height={10}
                backgroundColor="$danger"
                rotate="45deg"
                marginTop={-5}
                marginBottom={4}
                zIndex={-1}
              />
              <YStack
                width={36}
                height={36}
                backgroundColor="$danger"
                borderRadius={18}
                borderBottomRightRadius={2}
                rotate="-45deg"
                alignItems="center"
                justifyContent="center"
                shadowColor="$danger"
                shadowOffset={{ width: 2, height: 4 }}
                shadowOpacity={0.3}
                shadowRadius={6}
                elevation={5}
                borderWidth={3}
                borderColor="white">
                <YStack width={12} height={12} borderRadius={6} backgroundColor="white" />
              </YStack>
            </YStack>
          </Animated.View>
        </YStack>
        <YStack
          width={12}
          height={4}
          borderRadius={6}
          backgroundColor="rgba(0,0,0,0.15)"
          marginTop={4}
          scale={isDraggingMap ? 0.8 : 1}
          animation="quick"
        />
      </YStack>
    </YStack>
  );
}

function MapPicker({
  initialCoords,
  selectedAddressSummary,
  onConfirm,
  onDismiss,
  onEditAddressPress,
}: MapPickerProps) {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<import('react-native-maps').default | null>(null);
  const regionAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isCancelledRef = useRef(false);
  const [selectedCoords, setSelectedCoords] = useState<MapCoords>(
    initialCoords ?? JAKARTA_FALLBACK,
  );
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const hasInteracted = useRef(false);

  useEffect(() => {
    return () => {
      isCancelledRef.current = true;
      if (regionAnimationTimeoutRef.current) {
        clearTimeout(regionAnimationTimeoutRef.current);
        regionAnimationTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    isCancelledRef.current = false;
    hasInteracted.current = false;

    const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
      // Prevent unhandled promise rejection if timeout finishes first
      promise.catch(() => {});
      return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error('Location request timeout')), ms),
        ),
      ]);
    };

    const initialiseLocation = async () => {
      if (initialCoords) {
        setSelectedCoords(initialCoords);
        setLocationMessage(null);
        if (Platform.OS !== 'web') {
          if (regionAnimationTimeoutRef.current) {
            clearTimeout(regionAnimationTimeoutRef.current);
          }
          regionAnimationTimeoutRef.current = setTimeout(() => {
            if (mapRef.current && !hasInteracted.current && !isCancelledRef.current) {
              mapRef.current.animateToRegion({ ...initialCoords, ...DEFAULT_DELTA });
            }
            regionAnimationTimeoutRef.current = null;
          }, 300);
        }
        return;
      }

      setSelectedCoords(JAKARTA_FALLBACK);
      setLocationMessage(null);
      setIsLocating(true);

      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.status !== 'granted') {
          if (isCancelledRef.current) {
            return;
          }

          setLocationMessage(
            'Izin lokasi tidak diberikan. Geser pin secara manual atau aktifkan lokasi di Pengaturan perangkat.',
          );
          setIsLocating(false);
          return;
        }

        let location: Location.LocationObject | Location.LocationObjectCoords | null = null;

        try {
          location = await withTimeout(
            Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
              mayShowUserSettingsDialog: true,
            }),
            15000,
          );
        } catch {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 10 * 60 * 1000,
          });
          location = lastKnown;
        }

        if (isCancelledRef.current) {
          return;
        }

        if (!location) {
          setLocationMessage(
            'Lokasi saat ini tidak tersedia. Geser pin secara manual untuk menyesuaikan.',
          );
          setIsLocating(false);
          return;
        }

        if (!hasInteracted.current) {
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
      } catch {
        if (isCancelledRef.current) {
          return;
        }

        setLocationMessage(
          'Lokasi saat ini tidak tersedia. Geser pin secara manual untuk menyesuaikan.',
        );
        setIsLocating(false);
      }
    };

    void initialiseLocation();
  }, [initialCoords]);

  const handleMapPress = useCallback((event: MapPressEvent) => {
    hasInteracted.current = true;
    if (mapRef.current) {
      mapRef.current.animateCamera({ center: event.nativeEvent.coordinate }, { duration: 300 });
    }
  }, []);

  const handleRegionChange = useCallback(() => {
    hasInteracted.current = true;
    setIsDraggingMap(true);
  }, []);

  const handleRegionChangeComplete = useCallback((region: import('react-native-maps').Region) => {
    setIsDraggingMap(false);
    setSelectedCoords({ latitude: region.latitude, longitude: region.longitude });
  }, []);

  const handleConfirmRequest = useCallback(() => {
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmLocation = useCallback(() => {
    onConfirm({
      ...selectedCoords,
      didAdjustPin: hasInteracted.current,
    });
    setShowConfirmDialog(false);
    setShowDiscardDialog(false);
  }, [onConfirm, selectedCoords]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirmDialog(false);
  }, []);

  const handleDismissRequest = useCallback(() => {
    if (hasInteracted.current) {
      setShowDiscardDialog(true);
      return;
    }

    onDismiss();
  }, [onDismiss]);

  const handleDiscardChanges = useCallback(() => {
    setShowDiscardDialog(false);
    onDismiss();
  }, [onDismiss]);

  const coordLabel = isLocating
    ? 'Mencari lokasi GPS...'
    : `${selectedCoords.latitude.toFixed(6)}, ${selectedCoords.longitude.toFixed(6)}`;

  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack flex={1} overflow="hidden">
        {MapView ? (
          <YStack flex={1}>
            <MapView
              ref={mapRef}
              style={{ flex: 1 }}
              initialRegion={{
                ...selectedCoords,
                ...DEFAULT_DELTA,
              }}
              onRegionChange={handleRegionChange}
              onRegionChangeComplete={handleRegionChangeComplete}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton
            />
            <BouncingMapPin isDraggingMap={isDraggingMap} />
          </YStack>
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
          onPress={handleDismissRequest}
          accessibilityRole="button"
          accessibilityLabel="Tutup peta"
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
        <YStack
          backgroundColor="$surface"
          borderRadius="$4"
          paddingHorizontal="$3"
          paddingVertical="$2"
          gap="$1"
          alignItems="center">
          <Text fontSize="$3" color="$color" fontWeight="600" textAlign="center">
            Lokasi Peta
          </Text>
          <Text fontSize="$2" color="$colorSubtle" textAlign="center">
            Mohon periksa kembali lokasi peta
          </Text>
        </YStack>

        <XStack gap="$2" alignItems="center">
          <MapPin size={16} color="$primary" />
          <Text fontSize="$3" color="$colorSubtle" flex={1} numberOfLines={1}>
            {coordLabel}
          </Text>
        </XStack>

        {locationMessage ? (
          <Text fontSize="$2" color="$colorMuted">
            {locationMessage}
          </Text>
        ) : null}

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

      <AppAlertDialog
        open={showDiscardDialog}
        onOpenChange={setShowDiscardDialog}
        title="Batalkan Penyesuaian Pin?"
        description="Perubahan titik lokasi belum disimpan. Jika ditutup sekarang, posisi pin yang baru akan hilang."
        confirmText="Tutup"
        cancelText="Lanjut Edit"
        onConfirm={handleDiscardChanges}
        onCancel={() => setShowDiscardDialog(false)}
        confirmColor="$background"
        confirmTextColor="$color"
        cancelColor="$primary"
        cancelTextColor="$onPrimary"
      />
    </YStack>
  );
}

export default MapPicker;
