import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, MapPin, Search } from '@tamagui/lucide-icons';
import { Card, Input, ScrollView, Spinner, Text, XStack, YStack, styled } from 'tamagui';
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
import type { PendingAreaSelection } from '@/utils/areaPickerSession';

type SelectionStage = 'province' | 'city' | 'district' | 'postal';

type PostalOption = {
  label: string;
  area?: BiteshipArea;
};

type CurrentLocationAddress = {
  province: string;
  city: string;
  district: string;
  postalCode: string;
};

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

function normalize(text: string | undefined | null): string {
  return (text || '').trim().toUpperCase();
}

export function normalizeAdminName(text: string | undefined | null): string {
  return normalize(text)
    .replace(/^KABUPATEN\s+/, '')
    .replace(/^KOTA\s+/, '')
    .replace(/^KAB\.\s+/, '')
    .replace(/^KAB\s+/, '')
    .replace(/ADM\.?/g, '')
    .replace(/ADMINISTRASI/g, '')
    .replace(/KEPULAUAN/g, 'KEP')
    .replace(/DAERAH ISTIMEWA YOGYAKARTA/g, 'DI YOGYAKARTA')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeExactAdminName(text: string | undefined | null): string {
  return normalize(text).replace(/\s+/g, ' ').trim();
}

type AdminAreaType = 'kabupaten' | 'kota' | 'unknown';

function getAdminAreaType(text: string | undefined | null): AdminAreaType {
  const normalized = normalizeExactAdminName(text);

  if (/^(KABUPATEN|KAB\.?)/.test(normalized)) {
    return 'kabupaten';
  }

  if (/^KOTA\s+/.test(normalized)) {
    return 'kota';
  }

  return 'unknown';
}

export function adminNamesMatch(
  candidate: string | undefined | null,
  target: string | undefined | null,
): boolean {
  const normalizedCandidate = normalizeExactAdminName(candidate);
  const normalizedTarget = normalizeExactAdminName(target);
  const candidateType = getAdminAreaType(candidate);
  const targetType = getAdminAreaType(target);

  if (normalizedCandidate && normalizedTarget && normalizedCandidate === normalizedTarget) {
    return true;
  }

  if (candidateType !== 'unknown' && targetType !== 'unknown' && candidateType !== targetType) {
    return false;
  }

  return normalizeAdminName(candidate) === normalizeAdminName(target);
}

function buildPostalOptions(postalCodes: string[]): PostalOption[] {
  return [...new Set(postalCodes)]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, 'id'))
    .map(label => ({ label }));
}

function normalizeCurrentLocationAddress(
  address: Partial<CurrentLocationAddress>,
): CurrentLocationAddress | null {
  if (!address.province || !address.city) {
    return null;
  }

  return {
    province: address.province,
    city: address.city,
    district: address.district || address.city,
    postalCode: address.postalCode || '',
  };
}

export function buildPendingAreaSelection(
  area: BiteshipArea,
  fallbackHierarchy: {
    provinceName?: string;
    regencyName?: string;
    districtName?: string;
    postalCode?: string;
  },
  hierarchy?: {
    provinceName?: string;
    regencyName?: string;
    districtName?: string;
    postalCode?: string;
  },
): PendingAreaSelection {
  return {
    area,
    provinceName: hierarchy?.provinceName ?? fallbackHierarchy.provinceName,
    regencyName: hierarchy?.regencyName ?? fallbackHierarchy.regencyName,
    districtName: hierarchy?.districtName ?? fallbackHierarchy.districtName,
    postalCode:
      hierarchy?.postalCode ?? fallbackHierarchy.postalCode ?? String(area.postal_code ?? ''),
  };
}

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

  const filteredProvinces = useMemo(() => {
    const trimmed = normalize(query);
    return provinceOptions.filter(option => !trimmed || normalize(option.name).includes(trimmed));
  }, [provinceOptions, query]);

  const filteredCities = useMemo(() => {
    const trimmed = normalize(query);
    return cityOptions.filter(option => !trimmed || normalize(option.name).includes(trimmed));
  }, [cityOptions, query]);

  const filteredDistricts = useMemo(() => {
    const trimmed = normalize(query);
    return districtOptions.filter(option => !trimmed || normalize(option.name).includes(trimmed));
  }, [districtOptions, query]);

  const filteredPostalOptions = useMemo(() => {
    const trimmed = normalize(query);
    return postalOptions.filter(option => !trimmed || normalize(option.label).includes(trimmed));
  }, [postalOptions, query]);

  const selectedPostalOption = useMemo(() => {
    return postalOptions.find(option => option.label === selectedPostalLabel) ?? null;
  }, [postalOptions, selectedPostalLabel]);

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
            String(area.postal_code ?? '') === postalCode &&
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

  const handleUseCurrentLocation = useCallback(async () => {
    setIsLoadingStage(true);
    setStageError(null);
    try {
      const availableProvinces =
        provinceOptions.length > 0 ? provinceOptions : (await getRegionalProvinces()).data;

      if (availableProvinces.length === 0) {
        setStageError('Daftar provinsi belum siap. Silakan coba lagi.');
        return;
      }

      if (provinceOptions.length === 0) {
        setProvinceOptions(availableProvinces);
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setStageError('Izin lokasi diperlukan untuk menggunakan lokasi saat ini.');
        return;
      }

      const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('Location request timeout')), ms),
          ),
        ]);
      };

      let current: Location.LocationObject | null = null;

      try {
        current = await withTimeout(
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
            mayShowUserSettingsDialog: true,
          }),
          15000,
        );
      } catch (locationError) {
        if (__DEV__) {
          console.log(
            'Real-time location failed, falling back to last known position:',
            locationError,
          );
        }
      }

      if (!current) {
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({
            maxAge: 10 * 60 * 1000,
          });
          if (lastKnown) {
            current = lastKnown;
          }
        } catch (lastKnownError) {
          if (__DEV__) {
            console.warn('[AreaPicker] lastKnownPosition failed:', lastKnownError);
          }
        }
      }

      if (!current) {
        setStageError(
          'Lokasi saat ini tidak tersedia. Pastikan GPS aktif lalu coba lagi, atau pilih manual.',
        );
        return;
      }

      const { data: reversed, error: reverseError } = await reverseGeocodeCoordinates({
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      });

      const expoReverse =
        reverseError || !reversed
          ? await Location.reverseGeocodeAsync({
              latitude: current.coords.latitude,
              longitude: current.coords.longitude,
            })
          : [];

      const rawResolvedAddress = reversed
        ? {
            province: reversed.province,
            city: reversed.city,
            district: reversed.district,
            postalCode: reversed.postalCode,
          }
        : expoReverse[0]
          ? {
              province: expoReverse[0].region ?? '',
              city: expoReverse[0].city ?? expoReverse[0].subregion ?? '',
              district:
                expoReverse[0].district ?? expoReverse[0].subregion ?? expoReverse[0].city ?? '',
              postalCode: expoReverse[0].postalCode ?? '',
            }
          : undefined;

      const resolvedAddress = rawResolvedAddress
        ? normalizeCurrentLocationAddress(rawResolvedAddress)
        : null;

      if (!resolvedAddress) {
        setStageError(
          'Alamat dari lokasi saat ini tidak dapat dikenali. Silakan pilih area secara manual.',
        );
        return;
      }

      const matchedProvince = availableProvinces.find(option => {
        return normalizeAdminName(option.name) === normalizeAdminName(resolvedAddress.province);
      });

      if (!matchedProvince) {
        setStageError('Provinsi dari lokasi saat ini tidak ditemukan. Silakan pilih manual.');
        return;
      }

      const { data: regencies, error: regencyError } = await getRegionalRegenciesByProvince(
        matchedProvince.code,
      );

      if (regencyError || regencies.length === 0) {
        setStageError('Kota atau kabupaten dari lokasi saat ini tidak ditemukan.');
        return;
      }

      const districtSearchResults = await Promise.all(
        regencies.map(async regency => {
          const { data: districts } = await getRegionalDistrictsByRegency(regency.code);
          return {
            regency,
            districts: districts || [],
          };
        }),
      );

      const exactMatchedRegency = regencies.find(option => {
        return (
          normalizeExactAdminName(option.name) === normalizeExactAdminName(resolvedAddress.city)
        );
      });

      const fuzzyMatchedRegencies = regencies.filter(option =>
        adminNamesMatch(option.name, resolvedAddress.city),
      );

      let finalMatchedRegency = exactMatchedRegency;

      if (!finalMatchedRegency && fuzzyMatchedRegencies.length === 1) {
        finalMatchedRegency = fuzzyMatchedRegencies[0];
      }

      if (!finalMatchedRegency && fuzzyMatchedRegencies.length > 1) {
        const disambiguatedRegency = districtSearchResults.find(({ regency, districts }) => {
          return (
            fuzzyMatchedRegencies.some(match => match.code === regency.code) &&
            districts.some(d => adminNamesMatch(d.name, resolvedAddress.district))
          );
        });

        if (disambiguatedRegency) {
          finalMatchedRegency = disambiguatedRegency.regency;
        }
      }

      if (!finalMatchedRegency) {
        const foundDistrict = districtSearchResults.find(({ districts }) =>
          districts.some(d => adminNamesMatch(d.name, resolvedAddress.city)),
        );

        if (foundDistrict) {
          finalMatchedRegency = foundDistrict.regency;
        }
      }

      if (!finalMatchedRegency) {
        setSelectedProvince(matchedProvince);
        setCityOptions(regencies);
        setStage('city');
        setStageError('Kota atau kabupaten tidak cocok otomatis. Silakan pilih manual.');
        return;
      }

      const { data: districts, error: districtError } = await getRegionalDistrictsByRegency(
        finalMatchedRegency.code,
      );

      if (districtError || districts.length === 0) {
        setStageError('Kecamatan dari lokasi saat ini tidak ditemukan.');
        return;
      }

      const matchedDistrict = districts.find(option => {
        return normalizeAdminName(option.name) === normalizeAdminName(resolvedAddress.district);
      });

      const districtCandidate =
        matchedDistrict ||
        districts.find(option =>
          normalizeAdminName(
            reversed?.fullAddress ??
              `${resolvedAddress.district}, ${resolvedAddress.city}, ${resolvedAddress.province}`,
          ).includes(normalizeAdminName(option.name)),
        );

      if (!districtCandidate) {
        setSelectedProvince(matchedProvince);
        setSelectedCity(finalMatchedRegency);
        setDistrictOptions(districts);
        setStage('district');
        setStageError('Kecamatan tidak cocok otomatis. Silakan pilih manual.');
        return;
      }

      setSelectedProvince(matchedProvince);
      setSelectedCity(finalMatchedRegency);
      setSelectedDistrict(districtCandidate);
      const options = await resolvePostalOptions(
        matchedProvince,
        finalMatchedRegency,
        districtCandidate,
      );

      setPostalOptions(options);
      setStage('postal');
      setQuery('');

      if (options.length === 0) {
        setStageError('Kode pos untuk lokasi saat ini belum ditemukan. Silakan pilih manual.');
        return;
      }

      const exactPostal = options.find(option => option.label === resolvedAddress.postalCode);
      const fallbackPostal = options.length === 1 ? options[0] : null;

      if (exactPostal || fallbackPostal) {
        const selectedOption = exactPostal ?? fallbackPostal;
        if (selectedOption) {
          const resolvedArea = await resolveAreaByPostal(
            matchedProvince,
            finalMatchedRegency,
            districtCandidate,
            selectedOption.label,
          );

          if (resolvedArea) {
            handleAreaSelection(resolvedArea, {
              provinceName: matchedProvince.name,
              regencyName: finalMatchedRegency.name,
              districtName: districtCandidate.name,
              postalCode: selectedOption.label,
            });
            return;
          }
        }
      }

      setStageError('Pilih kode pos yang paling sesuai dengan lokasi saat ini.');
    } catch (error) {
      if (__DEV__) {
        console.error('handleUseCurrentLocation error:', error);
      }
      setStageError('Gagal mendapatkan lokasi saat ini. Silakan coba lagi.');
    } finally {
      setIsLoadingStage(false);
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

  const stageTitle =
    stage === 'province'
      ? 'Provinsi'
      : stage === 'city'
        ? 'Kota / Kabupaten'
        : stage === 'district'
          ? 'Kecamatan'
          : 'Kode Pos';

  const renderContent = () => {
    if (isLoadingStage) {
      return (
        <YStack alignItems="center" paddingVertical="$8" gap="$3">
          <Spinner size="large" color="$primary" />
          <Text fontSize="$3" color="$colorMuted">
            Memuat {stageTitle.toLowerCase()}...
          </Text>
        </YStack>
      );
    }

    if (stageError) {
      return (
        <YStack alignItems="center" paddingVertical="$8" gap="$2">
          <Text fontSize="$3" color="$danger" textAlign="center">
            {stageError}
          </Text>
        </YStack>
      );
    }

    if (stage === 'province') {
      return filteredProvinces.map(option => (
        <Card
          key={option.code}
          borderRadius="$0"
          borderWidth={0}
          borderBottomWidth={1}
          borderColor="$surfaceBorder"
          backgroundColor="$background"
          paddingVertical="$4"
          paddingHorizontal="$1"
          onPress={() => void handleProvinceSelect(option)}>
          <Text fontSize="$5" color="$color">
            {option.name.toUpperCase()}
          </Text>
        </Card>
      ));
    }

    if (stage === 'city') {
      return filteredCities.map(option => (
        <Card
          key={option.code}
          borderRadius="$0"
          borderWidth={0}
          borderBottomWidth={1}
          borderColor="$surfaceBorder"
          backgroundColor="$background"
          paddingVertical="$4"
          paddingHorizontal="$1"
          onPress={() => void handleCitySelect(option)}>
          <Text fontSize="$5" color="$color">
            {option.name.toUpperCase()}
          </Text>
        </Card>
      ));
    }

    if (stage === 'district') {
      return filteredDistricts.map(option => (
        <Card
          key={option.code}
          borderRadius="$0"
          borderWidth={0}
          borderBottomWidth={1}
          borderColor="$surfaceBorder"
          backgroundColor="$background"
          paddingVertical="$4"
          paddingHorizontal="$1"
          onPress={() => void handleDistrictSelect(option)}>
          <Text fontSize="$5" color="$color">
            {option.name.toUpperCase()}
          </Text>
        </Card>
      ));
    }

    return filteredPostalOptions.map(option => {
      const isSelected = option.label === selectedPostalLabel;
      return (
        <Card
          key={option.label}
          borderRadius="$0"
          borderWidth={0}
          borderBottomWidth={1}
          borderColor="$surfaceBorder"
          backgroundColor="$background"
          paddingVertical="$4"
          paddingHorizontal="$1"
          onPress={async () => {
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
          }}>
          <XStack justifyContent="space-between" alignItems="center">
            <Text fontSize="$5" color={isSelected ? '$primary' : '$color'}>
              {option.label}
            </Text>
            {isSelected ? <Check size={18} color="$primary" /> : null}
          </XStack>
        </Card>
      );
    });
  };

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

          <XStack
            alignItems="center"
            justifyContent="center"
            gap="$2"
            paddingVertical="$2"
            pressStyle={{ opacity: 0.7 }}
            onPress={() => void handleUseCurrentLocation()}>
            <MapPin size={16} color="$primary" />
            <Text fontSize="$3" color="$primary" fontWeight="500">
              Gunakan lokasi saat ini
            </Text>
          </XStack>

          <YStack gap="$4" paddingVertical="$2">
            <XStack justifyContent="space-between" alignItems="center">
              <Text fontSize="$4" fontWeight="600" color="$color">
                Progress
              </Text>
              {(selectedProvince || selectedCity || selectedDistrict) && (
                <Text
                  fontSize="$3"
                  color="$primary"
                  fontWeight="500"
                  pressStyle={{ opacity: 0.7 }}
                  onPress={resetState}>
                  Atur Ulang
                </Text>
              )}
            </XStack>

            <YStack gap="$0" paddingLeft="$1">
              <XStack
                alignItems="center"
                gap="$3"
                minHeight={48}
                role="button"
                aria-label={
                  selectedProvince ? `Ubah provinsi ${selectedProvince.name}` : 'Pilih provinsi'
                }
                onPress={() => selectedProvince && navigateToStage('province')}>
                <YStack
                  width={28}
                  height={28}
                  borderRadius={14}
                  backgroundColor={
                    stage === 'province'
                      ? '$primary'
                      : selectedProvince
                        ? '$surface'
                        : '$surfaceBorder'
                  }
                  borderWidth={2}
                  borderColor={
                    stage === 'province' || selectedProvince ? '$primary' : '$surfaceBorder'
                  }
                  alignItems="center"
                  justifyContent="center">
                  <Text
                    fontSize="$2"
                    fontWeight="700"
                    color={stage === 'province' || selectedProvince ? '$onPrimary' : '$colorMuted'}>
                    1
                  </Text>
                </YStack>
                <Text
                  flex={1}
                  fontSize="$4"
                  color={selectedProvince ? '$color' : '$colorMuted'}
                  fontWeight={stage === 'province' ? '600' : '400'}>
                  {selectedProvince?.name.toUpperCase() || 'Pilih Provinsi'}
                </Text>
                {selectedProvince && <Check size={16} color="$primary" />}
              </XStack>

              {(selectedProvince || stage !== 'province') && (
                <YStack
                  width={2}
                  height={24}
                  backgroundColor={selectedProvince ? '$primary' : '$surfaceBorder'}
                  marginLeft="$3"
                />
              )}

              {(selectedProvince || stage !== 'province') && (
                <>
                  <XStack
                    alignItems="center"
                    gap="$3"
                    minHeight={48}
                    role="button"
                    aria-label={
                      selectedCity ? `Ubah kota ${selectedCity.name}` : 'Pilih kota atau kabupaten'
                    }
                    onPress={() => selectedCity && navigateToStage('city')}>
                    <YStack
                      width={28}
                      height={28}
                      borderRadius={14}
                      backgroundColor={
                        stage === 'city' ? '$primary' : selectedCity ? '$surface' : '$surfaceBorder'
                      }
                      borderWidth={2}
                      borderColor={stage === 'city' || selectedCity ? '$primary' : '$surfaceBorder'}
                      alignItems="center"
                      justifyContent="center">
                      <Text
                        fontSize="$2"
                        fontWeight="700"
                        color={stage === 'city' || selectedCity ? '$onPrimary' : '$colorMuted'}>
                        2
                      </Text>
                    </YStack>
                    <Text
                      flex={1}
                      fontSize="$4"
                      color={selectedCity ? '$color' : '$colorMuted'}
                      fontWeight={stage === 'city' ? '600' : '400'}>
                      {selectedCity?.name.toUpperCase() || 'Pilih Kota/Kabupaten'}
                    </Text>
                    {selectedCity && <Check size={16} color="$primary" />}
                  </XStack>

                  {(selectedCity || stage === 'district' || stage === 'postal') && (
                    <YStack
                      width={2}
                      height={24}
                      backgroundColor={selectedCity ? '$primary' : '$surfaceBorder'}
                      marginLeft="$3"
                    />
                  )}
                </>
              )}

              {(selectedCity || stage === 'district' || stage === 'postal') && (
                <>
                  <XStack
                    alignItems="center"
                    gap="$3"
                    minHeight={48}
                    role="button"
                    aria-label={
                      selectedDistrict
                        ? `Ubah kecamatan ${selectedDistrict.name}`
                        : 'Pilih kecamatan'
                    }
                    onPress={() => selectedDistrict && navigateToStage('district')}>
                    <YStack
                      width={28}
                      height={28}
                      borderRadius={14}
                      backgroundColor={
                        stage === 'district'
                          ? '$primary'
                          : selectedDistrict
                            ? '$surface'
                            : '$surfaceBorder'
                      }
                      borderWidth={2}
                      borderColor={
                        stage === 'district' || selectedDistrict ? '$primary' : '$surfaceBorder'
                      }
                      alignItems="center"
                      justifyContent="center">
                      <Text
                        fontSize="$2"
                        fontWeight="700"
                        color={
                          stage === 'district' || selectedDistrict ? '$onPrimary' : '$colorMuted'
                        }>
                        3
                      </Text>
                    </YStack>
                    <Text
                      flex={1}
                      fontSize="$4"
                      color={selectedDistrict ? '$color' : '$colorMuted'}
                      fontWeight={stage === 'district' ? '600' : '400'}>
                      {selectedDistrict?.name.toUpperCase() || 'Pilih Kecamatan'}
                    </Text>
                    {selectedDistrict && <Check size={16} color="$primary" />}
                  </XStack>

                  {(selectedDistrict || stage === 'postal') && (
                    <YStack
                      width={2}
                      height={24}
                      backgroundColor={selectedDistrict ? '$primary' : '$surfaceBorder'}
                      marginLeft="$3"
                    />
                  )}
                </>
              )}

              {(selectedDistrict || stage === 'postal') && (
                <XStack alignItems="center" gap="$3" minHeight={48}>
                  <YStack
                    width={28}
                    height={28}
                    borderRadius={14}
                    backgroundColor={
                      stage === 'postal'
                        ? '$primary'
                        : selectedPostalOption
                          ? '$surface'
                          : '$surfaceBorder'
                    }
                    borderWidth={2}
                    borderColor={
                      stage === 'postal' || selectedPostalOption ? '$primary' : '$surfaceBorder'
                    }
                    alignItems="center"
                    justifyContent="center">
                    <Text
                      fontSize="$2"
                      fontWeight="700"
                      color={
                        stage === 'postal' || selectedPostalOption ? '$onPrimary' : '$colorMuted'
                      }>
                      4
                    </Text>
                  </YStack>
                  {selectedPostalOption ? (
                    <XStack flex={1} alignItems="center" gap="$2">
                      <Text fontSize="$4" color="$primary" fontWeight="600">
                        {selectedPostalOption.label}
                      </Text>
                      <Check size={16} color="$primary" />
                    </XStack>
                  ) : (
                    <Text
                      fontSize="$4"
                      color="$colorMuted"
                      fontWeight={stage === 'postal' ? '600' : '400'}>
                      {stage === 'postal' ? 'Pilih Kode Pos' : 'Kode Pos'}
                    </Text>
                  )}
                </XStack>
              )}
            </YStack>
          </YStack>

          <ScrollView flex={1} keyboardShouldPersistTaps="handled">
            <YStack>{renderContent()}</YStack>
          </ScrollView>
        </YStack>
      </YStack>
    </SafeAreaView>
  );
}
