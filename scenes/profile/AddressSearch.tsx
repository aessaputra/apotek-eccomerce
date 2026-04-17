import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  type TextInput as RNTextInput,
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { YStack, XStack, Text, Input, styled, useTheme } from 'tamagui';
import * as Location from 'expo-location';
import { Search, ArrowLeft, X as CloseIcon } from '@tamagui/lucide-icons';
import AddressSuggestionList from '@/components/AddressForm/AddressSuggestionList';
import { useAddressSuggestions } from '@/hooks/useAddressSuggestions';
import { getThemeColor } from '@/utils/theme';
import { THEME_FALLBACKS } from '@/constants/ui';
import type { AddressSuggestion } from '@/types/geocoding';
import type { GeocodingProximity } from '@/types/geocoding';
import type { RouteParams } from '@/types/routes.types';
import { setPendingAddressSelection } from '@/utils/addressSearchSession';
import { ADDRESS_PLACEHOLDER_STREET } from '@/constants/address';
import {
  parseAddressSearchInitialLocation,
  shouldShowInitialAddressRecommendations,
} from './addressRouteParams';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

export default function AddressSearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams<'profile/address-search'>>();
  const theme = useTheme();
  const inputRef = useRef<RNTextInput | null>(null);
  const nearbyLocationRef = useRef<GeocodingProximity | null>(null);

  const initialQuery = typeof params.query === 'string' ? params.query : '';
  const seededInitialQueryPendingRef = useRef(initialQuery.trim().length >= 2);

  const initialLocation = useMemo(() => {
    return parseAddressSearchInitialLocation(params);
  }, [params]);

  const {
    query,
    setQuery,
    results,
    isLoading,
    isRetrieving,
    error,
    loadInitialSuggestions,
    selectSuggestion,
  } = useAddressSuggestions(initialLocation);

  const placeholderColor = getThemeColor(
    theme,
    'searchPlaceholderColor',
    THEME_FALLBACKS.searchPlaceholderColor ?? THEME_FALLBACKS.placeholderColor,
  );

  const iconColor = getThemeColor(theme, 'color', THEME_FALLBACKS.color);
  const gpsDeniedRef = useRef(false);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const loadSuggestionsForCurrentLocation = useCallback(async () => {
    const activeLocation = nearbyLocationRef.current ?? initialLocation;

    if (activeLocation) {
      nearbyLocationRef.current = activeLocation;
      await loadInitialSuggestions(activeLocation);
      return;
    }

    if (gpsDeniedRef.current) {
      return;
    }

    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        gpsDeniedRef.current = true;
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const gpsLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };

      nearbyLocationRef.current = gpsLocation;

      await loadInitialSuggestions(gpsLocation);
    } catch (locationError) {
      if (__DEV__) {
        console.warn('[AddressSearch] failed to load nearby suggestions', locationError);
      }
    }
  }, [initialLocation, loadInitialSuggestions]);

  useEffect(() => {
    if (initialLocation) {
      nearbyLocationRef.current = initialLocation;
    }
  }, [initialLocation]);

  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery, setQuery]);

  useEffect(() => {
    if (query === initialQuery) {
      seededInitialQueryPendingRef.current = false;
    }
  }, [initialQuery, query]);

  useEffect(() => {
    if (seededInitialQueryPendingRef.current) {
      return;
    }

    if (!shouldShowInitialAddressRecommendations(query)) {
      return;
    }

    loadSuggestionsForCurrentLocation();
  }, [loadSuggestionsForCurrentLocation, query]);

  const handleSelectSuggestion = useCallback(
    async (suggestion: AddressSuggestion) => {
      const selectedAddress = await selectSuggestion(suggestion);
      if (!selectedAddress) {
        return;
      }

      setPendingAddressSelection(selectedAddress);
      router.back();
    },
    [router, selectSuggestion],
  );

  return (
    <SafeAreaView edges={['top', 'bottom']}>
      <YStack flex={1}>
        <XStack
          alignItems="center"
          paddingHorizontal="$4"
          paddingVertical="$3"
          gap="$3"
          borderBottomWidth={1}
          borderBottomColor="$surfaceBorder"
          backgroundColor="$background">
          <XStack
            width={40}
            height={40}
            borderRadius={20}
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.8, scale: 0.96 }}
            onPress={handleBack}>
            <ArrowLeft size={22} color={iconColor} />
          </XStack>

          <Text flex={1} fontSize="$7" fontWeight="700" color="$color">
            Alamat Baru
          </Text>
        </XStack>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <YStack flex={1} paddingHorizontal="$4" paddingTop="$3" gap="$3">
            <XStack
              backgroundColor="$surface"
              borderWidth={1.5}
              borderColor="$surfaceBorder"
              borderRadius="$5"
              minHeight={56}
              alignItems="center"
              paddingHorizontal="$3"
              gap="$2">
              <Search size={18} color="$colorMuted" />
              <Input
                ref={inputRef}
                flex={1}
                backgroundColor="$colorTransparent"
                borderWidth={0}
                padding={0}
                fontSize="$4"
                minHeight={56}
                color="$color"
                placeholder={ADDRESS_PLACEHOLDER_STREET}
                placeholderTextColor={placeholderColor}
                value={query}
                autoCorrect={false}
                autoCapitalize="words"
                onChangeText={setQuery}
              />
              {query ? (
                <XStack
                  width={32}
                  height={32}
                  borderRadius={16}
                  alignItems="center"
                  justifyContent="center"
                  pressStyle={{ opacity: 0.8, scale: 0.96 }}
                  onPress={() => setQuery('')}>
                  <CloseIcon size={18} color="$colorMuted" />
                </XStack>
              ) : null}
            </XStack>

            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 24 }}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}>
              <AddressSuggestionList
                query={query}
                results={results}
                isLoading={isLoading}
                isSelecting={isRetrieving}
                error={error}
                showInitialRecommendations={shouldShowInitialAddressRecommendations(query)}
                onSelect={handleSelectSuggestion}
              />
            </ScrollView>
          </YStack>
        </KeyboardAvoidingView>
      </YStack>
    </SafeAreaView>
  );
}
