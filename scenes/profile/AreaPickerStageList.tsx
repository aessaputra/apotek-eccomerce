import { useCallback, useMemo } from 'react';
import { FlatList } from 'react-native';
import { Check } from '@tamagui/lucide-icons';
import { Card, Spinner, Text, XStack, YStack } from 'tamagui';
import type { RegionalDistrict, RegionalProvince, RegionalRegency } from '@/types/regional';
import type { PostalOption } from './areaPickerHelpers';
import type { SelectionStage, StageStatus } from './areaPickerTypes';

type AreaPickerStageListProps = {
  stage: SelectionStage;
  stageTitle: string;
  isLoadingStage: boolean;
  stageStatus: StageStatus;
  currentLocationStatus?: string | null;
  provinceOptions: RegionalProvince[];
  cityOptions: RegionalRegency[];
  districtOptions: RegionalDistrict[];
  postalOptions: PostalOption[];
  selectedPostalLabel: string | null;
  onProvinceSelect: (province: RegionalProvince) => void | Promise<void>;
  onCitySelect: (city: RegionalRegency) => void | Promise<void>;
  onDistrictSelect: (district: RegionalDistrict) => void | Promise<void>;
  onPostalSelect: (option: PostalOption) => void | Promise<void>;
};

type OptionCardProps<T> = {
  label: string;
  value: T;
  onSelect: (value: T) => void | Promise<void>;
  selected?: boolean;
};

function OptionCard<T>({ label, value, onSelect, selected = false }: OptionCardProps<T>) {
  const handlePress = useCallback(() => onSelect(value), [onSelect, value]);
  return (
    <Card
      borderRadius="$0"
      borderWidth={0}
      borderBottomWidth={1}
      borderColor="$surfaceBorder"
      backgroundColor="$background"
      paddingVertical="$4"
      paddingHorizontal="$1"
      onPress={handlePress}>
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$5" color={selected ? '$primary' : '$color'}>
          {label}
        </Text>
        {selected ? <Check size={18} color="$primary" /> : null}
      </XStack>
    </Card>
  );
}

function StageStatusBanner({ stageStatus }: { stageStatus: StageStatus }) {
  if (stageStatus.kind === 'idle') {
    return null;
  }

  return (
    <YStack
      alignItems="center"
      paddingVertical={stageStatus.kind === 'error' ? '$8' : '$3'}
      paddingHorizontal={stageStatus.kind === 'error' ? '$0' : '$2'}
      gap={stageStatus.kind === 'error' ? '$2' : '$0'}>
      <Text
        fontSize="$3"
        color={stageStatus.kind === 'error' ? '$danger' : '$warning'}
        textAlign="center">
        {stageStatus.message}
      </Text>
    </YStack>
  );
}

export default function AreaPickerStageList({
  stage,
  stageTitle,
  isLoadingStage,
  stageStatus,
  currentLocationStatus,
  provinceOptions,
  cityOptions,
  districtOptions,
  postalOptions,
  selectedPostalLabel,
  onProvinceSelect,
  onCitySelect,
  onDistrictSelect,
  onPostalSelect,
}: AreaPickerStageListProps) {
  const listData = useMemo(() => {
    switch (stage) {
      case 'province':
        return provinceOptions;
      case 'city':
        return cityOptions;
      case 'district':
        return districtOptions;
      case 'postal':
        return postalOptions;
      default:
        return [];
    }
  }, [stage, provinceOptions, cityOptions, districtOptions, postalOptions]);

  const renderItem = useCallback(
    ({ item }: { item: any }) => {
      switch (stage) {
        case 'province':
          return (
            <OptionCard label={item.name.toUpperCase()} value={item} onSelect={onProvinceSelect} />
          );
        case 'city':
          return (
            <OptionCard label={item.name.toUpperCase()} value={item} onSelect={onCitySelect} />
          );
        case 'district':
          return (
            <OptionCard label={item.name.toUpperCase()} value={item} onSelect={onDistrictSelect} />
          );
        case 'postal':
          return (
            <OptionCard
              label={item.label}
              value={item}
              selected={selectedPostalLabel === item.label}
              onSelect={onPostalSelect}
            />
          );
        default:
          return null;
      }
    },
    [stage, onProvinceSelect, onCitySelect, onDistrictSelect, onPostalSelect, selectedPostalLabel],
  );

  const keyExtractor = useCallback(
    (item: any) => item.code || item.label || String(Math.random()),
    [],
  );

  if (isLoadingStage) {
    return (
      <YStack alignItems="center" paddingVertical="$8" gap="$3">
        <Spinner size="large" color="$primary" />
        <Text fontSize="$3" color="$colorMuted" textAlign="center">
          {currentLocationStatus ?? `Memuat ${stageTitle.toLowerCase()}...`}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1}>
      <StageStatusBanner stageStatus={stageStatus} />
      {listData.length > 0 && (
        <FlatList
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </YStack>
  );
}
