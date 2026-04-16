import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, Search } from '@tamagui/lucide-icons';
import { Input, ScrollView, Text, XStack, YStack, styled } from 'tamagui';
import Button from '@/components/elements/Button';
import type { RouteParams } from '@/types/routes.types';
import type { RegionalDistrict, RegionalProvince, RegionalRegency } from '@/types/regional';
import type { BiteshipArea } from '@/types/shipping';
import {
  getPostalCodesByDistrict,
  getRegionalDistrictsByRegency,
  getRegionalProvinces,
  getRegionalRegenciesByProvince,
  reverseGeocodeCoordinates,
  searchBiteshipArea,
} from '@/services';
import { setPendingAreaSelection } from '@/utils/areaPickerSession';
import { adminNamesMatch } from '@/utils/areaNormalization';
import { normalizePostalCode } from '@/utils/postalCode';
import {
  buildPendingAreaSelection,
  buildPostalOptions,
  type PostalOption,
} from './areaPickerHelpers';
import { resolveCurrentLocationSelection } from './areaPickerCurrentLocation';
import AreaPickerSelectionSummary from './AreaPickerSelectionSummary';
import AreaPickerStageList from './AreaPickerStageList';
import {
  filterNamedOptions,
  filterPostalOptions,
  findSelectedPostalOption,
  getStageTitle,
  type SelectionStage,
} from './areaPickerState';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

export default function AreaPickerScreen() {
  const router = useRouter();
  useLocalSearchParams<RouteParams<'profile/area-picker'>>();
  const requestIdRef = useRef(0);

  const [stage, setStage] = useState<SelectionStage>('province');
  const [query, setQuery] = useState('');
  const [isLoadingStage, setIsLoadingStage] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);
  const [provinceOptions, setProvinceOptions] = useState<RegionalProvince[]>([]);
  const [cityOptions, setCityOptions] = useState<RegionalRegency[]>([]);
  const [districtOptions, setDistrictOptions] = useState<RegionalDistrict[]>([]);
  const [postalOptions, setPostalOptions] = useState<PostalOption[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<RegionalProvince | null>(null);
  const [selectedCity, setSelectedCity] = useState<RegionalRegency | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<RegionalDistrict | null>(null);
  const [selectedPostalLabel, setSelectedPostalLabel] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setStage('province');
    setQuery('');
    setStageError(null);
    setCityOptions([]);
    setDistrictOptions([]);
    setPostalOptions([]);
    setSelectedProvince(null);
    setSelectedCity(null);
    setSelectedDistrict(null);
    setSelectedPostalLabel(null);
  }, []);

  useEffect(() => {
    resetState();

    const loadProvinces = async () => {
      setIsLoadingStage(true);
      const { data, error } = await getRegionalProvinces();
      setProvinceOptions(data);
      if (error) {
        setStageError('Gagal memuat daftar provinsi.');
      }
      setIsLoadingStage(false);
    };

    void loadProvinces();
  }, [resetState]);

  const filteredProvinces = useMemo(
    () => filterNamedOptions(provinceOptions, query),
    [provinceOptions, query],
  );

  const filteredCities = useMemo(
    () => filterNamedOptions(cityOptions, query),
    [cityOptions, query],
  );

  const filteredDistricts = useMemo(
    () => filterNamedOptions(districtOptions, query),
    [districtOptions, query],
  );

  const filteredPostalOptions = useMemo(
    () => filterPostalOptions(postalOptions, query),
    [postalOptions, query],
  );

  const selectedPostalOption = useMemo(
    () => findSelectedPostalOption(postalOptions, selectedPostalLabel),
    [postalOptions, selectedPostalLabel],
  );

  const matchesHierarchy = useCallback(
    (area: BiteshipArea, provinceName: string, regencyName: string, districtName: string) => {
      return (
        adminNamesMatch(area.administrative_division_level_1_name, provinceName) &&
        adminNamesMatch(area.administrative_division_level_2_name, regencyName) &&
        adminNamesMatch(area.administrative_division_level_3_name, districtName)
      );
    },
    [],
  );

  const resolvePostalOptions = useCallback(
    async (
      province: RegionalProvince,
      regency: RegionalRegency,
      district: RegionalDistrict,
    ): Promise<PostalOption[]> => {
      const { data, error } = await getPostalCodesByDistrict(
        province.code,
        regency.code,
        district.name,
      );

      if (error || data.length === 0) {
        return [];
      }

      return buildPostalOptions(data);
    },
    [],
  );

  const resolveAreaByPostal = useCallback(
    async (
      province: RegionalProvince,
      regency: RegionalRegency,
      district: RegionalDistrict,
      postalCode: string,
    ): Promise<BiteshipArea | null> => {
      const attempts = [
        `${postalCode}, ${district.name}, ${regency.name}, ${province.name}`,
        `${postalCode}, ${regency.name}, ${province.name}`,
        `${postalCode}, ${district.name}`,
        postalCode,
      ];

      for (const input of attempts) {
        const { data, error } = await searchBiteshipArea(input);
        if (error) continue;

        const exact = data.find(area => {
          return (
            normalizePostalCode(area.postal_code) === normalizePostalCode(postalCode) &&
            matchesHierarchy(area, province.name, regency.name, district.name)
          );
        });

        if (exact) {
          return exact;
        }
      }

      return null;
    },
    [matchesHierarchy],
  );

  const handleAreaSelection = useCallback(
    (
      area: BiteshipArea,
      hierarchy?: {
        provinceName?: string;
        regencyName?: string;
        districtName?: string;
        postalCode?: string;
      },
    ) => {
      setPendingAreaSelection(
        buildPendingAreaSelection(
          area,
          {
            provinceName: selectedProvince?.name,
            regencyName: selectedCity?.name,
            districtName: selectedDistrict?.name,
            postalCode: selectedPostalLabel ?? undefined,
          },
          hierarchy,
        ),
      );
      router.back();
    },
    [
      router,
      selectedCity?.name,
      selectedDistrict?.name,
      selectedPostalLabel,
      selectedProvince?.name,
    ],
  );

  const loadCities = useCallback(async (province: RegionalProvince) => {
    const requestId = ++requestIdRef.current;
    setIsLoadingStage(true);
    setStageError(null);
    const { data, error } = await getRegionalRegenciesByProvince(province.code);
    if (requestId !== requestIdRef.current) return;
    setCityOptions(data);
    if (error || data.length === 0) {
      setStageError('Kota atau kabupaten untuk provinsi ini belum ditemukan.');
    }
    setIsLoadingStage(false);
  }, []);

  const loadDistricts = useCallback(async (regency: RegionalRegency) => {
    const requestId = ++requestIdRef.current;
    setIsLoadingStage(true);
    setStageError(null);
    const { data, error } = await getRegionalDistrictsByRegency(regency.code);
    if (requestId !== requestIdRef.current) return;
    setDistrictOptions(data);
    if (error || data.length === 0) {
      setStageError('Kecamatan untuk kota atau kabupaten ini belum ditemukan.');
    }
    setIsLoadingStage(false);
  }, []);

  const loadPostalCodes = useCallback(
    async (province: RegionalProvince, regency: RegionalRegency, district: RegionalDistrict) => {
      const requestId = ++requestIdRef.current;
      setIsLoadingStage(true);
      setStageError(null);

      const options = await resolvePostalOptions(province, regency, district);

      if (requestId !== requestIdRef.current) return;
      setPostalOptions(options);
      if (options.length === 0) {
        setStageError(
          'Kode pos untuk kecamatan ini belum ditemukan. Silakan pilih kecamatan lain.',
        );
      }
      setIsLoadingStage(false);
    },
    [resolvePostalOptions],
  );

  const handleProvinceSelect = useCallback(
    async (province: RegionalProvince) => {
      setSelectedProvince(province);
      setSelectedCity(null);
      setSelectedDistrict(null);
      setPostalOptions([]);
      setSelectedPostalLabel(null);
      setQuery('');
      setStage('city');
      await loadCities(province);
    },
    [loadCities],
  );

  const handleCitySelect = useCallback(
    async (city: RegionalRegency) => {
      setSelectedCity(city);
      setSelectedDistrict(null);
      setPostalOptions([]);
      setSelectedPostalLabel(null);
      setQuery('');
      setStage('district');
      await loadDistricts(city);
    },
    [loadDistricts],
  );

  const handleDistrictSelect = useCallback(
    async (district: RegionalDistrict) => {
      if (!selectedProvince || !selectedCity) return;
      setSelectedDistrict(district);
      setQuery('');
      setStage('postal');
      await loadPostalCodes(selectedProvince, selectedCity, district);
    },
    [loadPostalCodes, selectedCity, selectedProvince],
  );

  const handlePostalSelect = useCallback(
    async (option: PostalOption) => {
      if (!selectedProvince || !selectedCity || !selectedDistrict) {
        return;
      }

      setIsLoadingStage(true);
      setStageError(null);
      setSelectedPostalLabel(option.label);
      const resolvedArea = await resolveAreaByPostal(
        selectedProvince,
        selectedCity,
        selectedDistrict,
        option.label,
      );
      setIsLoadingStage(false);

      if (!resolvedArea) {
        setStageError(
          'Area pengiriman untuk kode pos ini tidak ditemukan. Silakan pilih kode pos lain.',
        );
        return;
      }

      handleAreaSelection(resolvedArea);
    },
    [handleAreaSelection, resolveAreaByPostal, selectedCity, selectedDistrict, selectedProvince],
  );

  const handleUseCurrentLocation = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setIsLoadingStage(true);
    setStageError(null);

    try {
      const result = await resolveCurrentLocationSelection({
        provinceOptions,
        fetchProvinces: async () => (await getRegionalProvinces()).data,
        fetchRegencies: getRegionalRegenciesByProvince,
        fetchDistricts: getRegionalDistrictsByRegency,
        reverseGeocode: async coords => {
          const { data, error } = await reverseGeocodeCoordinates(coords);
          return {
            data: data
              ? {
                  province: data.province,
                  city: data.city,
                  district: data.district,
                  postalCode: data.postalCode,
                  fullAddress: data.fullAddress,
                }
              : null,
            error,
          };
        },
        resolvePostalOptions,
        resolveAreaByPostal,
      });

      if (requestId !== requestIdRef.current) {
        return;
      }

      if ('provinceOptions' in result && result.provinceOptions && provinceOptions.length === 0) {
        setProvinceOptions(result.provinceOptions);
      }

      if (result.kind === 'error') {
        setStageError(result.errorMessage);
        return;
      }

      if (result.kind === 'manual') {
        setSelectedProvince(result.province ?? null);
        setSelectedCity(result.regency ?? null);
        setSelectedDistrict(result.district ?? null);
        setSelectedPostalLabel(null);
        setQuery('');
        setStage(result.stage);

        if (result.stage === 'city') {
          setDistrictOptions([]);
          setPostalOptions([]);
        }

        if (result.stage === 'district') {
          setPostalOptions([]);
        }

        if (result.cityOptions) {
          setCityOptions(result.cityOptions);
        }

        if (result.districtOptions) {
          setDistrictOptions(result.districtOptions);
        }

        if (result.postalOptions) {
          setPostalOptions(result.postalOptions);
        }

        setStageError(result.errorMessage);
        return;
      }

      setSelectedProvince(result.province);
      setSelectedCity(result.regency);
      setSelectedDistrict(result.district);
      setPostalOptions(result.postalOptions);
      setSelectedPostalLabel(result.selectedPostalLabel);
      setStage('postal');
      setQuery('');
      handleAreaSelection(result.area, result.hierarchy);
    } catch (error) {
      if (__DEV__) {
        console.error('handleUseCurrentLocation error:', error);
      }
      setStageError('Gagal mendapatkan lokasi saat ini. Silakan coba lagi.');
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoadingStage(false);
      }
    }
  }, [handleAreaSelection, provinceOptions, resolveAreaByPostal, resolvePostalOptions]);

  const navigateToStage = useCallback(
    (targetStage: SelectionStage, options?: { clearDescendants?: boolean }) => {
      const { clearDescendants = true } = options ?? {};

      setQuery('');
      setStageError(null);
      setStage(targetStage);

      if (clearDescendants) {
        if (targetStage === 'province') {
          setSelectedCity(null);
          setSelectedDistrict(null);
          setPostalOptions([]);
          setSelectedPostalLabel(null);
        } else if (targetStage === 'city') {
          setSelectedDistrict(null);
          setPostalOptions([]);
          setSelectedPostalLabel(null);
        } else if (targetStage === 'district') {
          setPostalOptions([]);
          setSelectedPostalLabel(null);
        }
      }
    },
    [],
  );

  const handleBack = useCallback(() => {
    if (stage === 'postal') {
      navigateToStage('district');
      return;
    }
    if (stage === 'district') {
      navigateToStage('city');
      return;
    }
    if (stage === 'city') {
      navigateToStage('province');
      return;
    }

    router.back();
  }, [navigateToStage, router, stage]);

  const stageTitle = getStageTitle(stage);

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
                placeholderTextColor="$placeholderColor"
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
