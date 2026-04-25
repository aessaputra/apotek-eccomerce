import { useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Search } from '@tamagui/lucide-icons';
import { Input, ScrollView, Text, XStack, YStack, styled, useTheme } from 'tamagui';
import Button from '@/components/elements/Button';
import { THEME_FALLBACKS } from '@/constants/ui';
import type { RouteParams } from '@/types/routes.types';
import { getThemeColor } from '@/utils/theme';
import AreaPickerSelectionSummary from './AreaPickerSelectionSummary';
import AreaPickerStageList from './AreaPickerStageList';
import { getStageTitle } from './areaPickerState';
import { useAreaPickerFlow } from './useAreaPickerFlow';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

export default function AreaPickerScreen() {
  const router = useRouter();
  const theme = useTheme();
  useLocalSearchParams<RouteParams<'profile/area-picker'>>();
  const handleComplete = useCallback(() => {
    router.back();
  }, [router]);

  const {
    stage,
    query,
    setQuery,
    isLoadingStage,
    stageError,
    selectedProvince,
    selectedCity,
    selectedDistrict,
    selectedPostalLabel,
    selectedPostalOption,
    filteredProvinces,
    filteredCities,
    filteredDistricts,
    filteredPostalOptions,
    resetState,
    navigateToStage,
    handleBack,
    handleProvinceSelect,
    handleCitySelect,
    handleDistrictSelect,
    handlePostalSelect,
    handleUseCurrentLocation,
  } = useAreaPickerFlow({ onComplete: handleComplete });

  const stageTitle = getStageTitle(stage);
  // placeholderTextColor is a native TextInput prop and requires a resolved color string.
  const placeholderColor = getThemeColor(
    theme,
    'searchPlaceholderColor',
    THEME_FALLBACKS.searchPlaceholderColor ?? THEME_FALLBACKS.placeholderColor,
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
            <ArrowLeft size={22} color="$color" />
          </XStack>

          <Text flex={1} fontSize="$7" fontWeight="700" color="$color">
            Pilih Area
          </Text>
        </XStack>

        <YStack flex={1} paddingHorizontal="$4" paddingTop="$4" gap="$4">
          <YStack
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            borderRadius="$6"
            minHeight={52}
            justifyContent="center"
            paddingHorizontal="$4"
            elevation={1}
            shadowColor="$shadowColor"
            shadowOffset={{ width: 0, height: 2 }}
            shadowOpacity={0.1}
            shadowRadius={4}>
            <XStack alignItems="center" gap="$3">
              <Search size={20} color="$primary" />
              <Input
                flex={1}
                backgroundColor="$colorTransparent"
                borderWidth={0}
                padding={0}
                fontSize="$4"
                color="$color"
                placeholder="Cari kota, kecamatan, atau kode pos..."
                placeholderTextColor={placeholderColor}
                value={query}
                onChangeText={setQuery}
              />
            </XStack>
          </YStack>

          <Button
            title="Gunakan Lokasi Saat Ini"
            backgroundColor="$surface"
            borderRadius="$4"
            borderWidth={1}
            borderColor="$surfaceBorder"
            minHeight={56}
            gap="$2"
            onPress={() => void handleUseCurrentLocation()}
            titleStyle={{ color: '$color', fontSize: '$4', fontWeight: '500' }}>
            <MapPin size={16} color="$primary" />
          </Button>

          <AreaPickerSelectionSummary
            stage={stage}
            selectedProvince={selectedProvince}
            selectedCity={selectedCity}
            selectedDistrict={selectedDistrict}
            selectedPostalOption={selectedPostalOption}
            onReset={resetState}
            onNavigateToStage={navigateToStage}
          />

          <ScrollView flex={1} keyboardShouldPersistTaps="handled">
            <YStack>
              <AreaPickerStageList
                stage={stage}
                stageTitle={stageTitle}
                isLoadingStage={isLoadingStage}
                stageError={stageError}
                provinceOptions={filteredProvinces}
                cityOptions={filteredCities}
                districtOptions={filteredDistricts}
                postalOptions={filteredPostalOptions}
                selectedPostalLabel={selectedPostalLabel}
                onProvinceSelect={handleProvinceSelect}
                onCitySelect={handleCitySelect}
                onDistrictSelect={handleDistrictSelect}
                onPostalSelect={handlePostalSelect}
              />
            </YStack>
          </ScrollView>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
