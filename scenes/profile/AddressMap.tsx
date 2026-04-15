import { useCallback, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'tamagui';
import { MapPicker } from '@/components/MapPin';
import type { MapCoords, MapPickerResult } from '@/components/MapPin';
import type { RouteParams } from '@/types/routes.types';
import { setPendingMapPickerResult } from '@/utils/mapPickerSession';
import { sanitizeAddressCandidate } from '@/services/googlePlaces.service';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

export default function AddressMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams<'profile/address-map'>>();

  const initialCoords = useMemo<MapCoords | undefined>(() => {
    const lat = typeof params.latitude === 'string' ? Number(params.latitude) : NaN;
    const lng = typeof params.longitude === 'string' ? Number(params.longitude) : NaN;

    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }

    return undefined;
  }, [params.latitude, params.longitude]);

  const selectedAddressSummary = useMemo(() => {
    const parts = [
      params.streetAddress ? sanitizeAddressCandidate(params.streetAddress) : '',
      params.areaName,
      params.city,
      params.province,
      params.postalCode,
    ].filter(Boolean);

    return parts.join(', ') || undefined;
  }, [params.streetAddress, params.areaName, params.city, params.province, params.postalCode]);

  const handleConfirm = useCallback(
    (result: MapPickerResult) => {
      setPendingMapPickerResult(result);
      router.back();
    },
    [router],
  );

  const handleDismiss = useCallback(() => {
    router.back();
  }, [router]);

  const handleEditAddressPress = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <SafeAreaView edges={['top', 'bottom']}>
      <MapPicker
        initialCoords={initialCoords}
        selectedAddressSummary={selectedAddressSummary}
        onConfirm={handleConfirm}
        onDismiss={handleDismiss}
        onEditAddressPress={handleEditAddressPress}
      />
    </SafeAreaView>
  );
}
