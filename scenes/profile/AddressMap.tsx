import { useCallback, useMemo } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { styled } from 'tamagui';
import { MapPicker } from '@/components/MapPin';
import type { MapCoords, MapPickerResult } from '@/components/MapPin';
import type { RouteParams } from '@/types/routes.types';
import { setPendingMapPickerResult } from '@/utils/mapPickerSession';
import { buildSelectedAddressSummary, parseAddressMapInitialCoords } from './addressRouteParams';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

export default function AddressMapScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams<'profile/address-map'>>();

  const initialCoords = useMemo<MapCoords | undefined>(() => {
    return parseAddressMapInitialCoords(params);
  }, [params]);

  const selectedAddressSummary = useMemo(() => {
    return buildSelectedAddressSummary(params);
  }, [params]);

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
