import { useCallback } from 'react';
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

  if (stageStatus.kind === 'error') {
    return (
      <YStack alignItems="center" paddingVertical="$8" gap="$2">
        <Text fontSize="$3" color="$danger" textAlign="center">
          {stageStatus.message}
        </Text>
      </YStack>
    );
  }

  return (
    <YStack paddingVertical="$3" paddingHorizontal="$2">
      <Text fontSize="$3" color="$warning" textAlign="center">
        {stageStatus.message}
      </Text>
    </YStack>
  );
}

function StageOptionList({
  stage,
  provinceOptions,
  cityOptions,
  districtOptions,
  postalOptions,
  selectedPostalLabel,
  onProvinceSelect,
  onCitySelect,
  onDistrictSelect,
  onPostalSelect,
}: Omit<AreaPickerStageListProps, 'stageTitle' | 'isLoadingStage' | 'stageStatus'>) {
  if (stage === 'province') {
    return (
      <>
        {provinceOptions.map(option => (
          <OptionCard
            key={option.code}
            label={option.name.toUpperCase()}
            value={option}
            onSelect={onProvinceSelect}
          />
        ))}
      </>
    );
  }

  if (stage === 'city') {
    return (
      <>
        {cityOptions.map(option => (
          <OptionCard
            key={option.code}
            label={option.name.toUpperCase()}
            value={option}
            onSelect={onCitySelect}
          />
        ))}
      </>
    );
  }

  if (stage === 'district') {
    return (
      <>
        {districtOptions.map(option => (
          <OptionCard
            key={option.code}
            label={option.name.toUpperCase()}
            value={option}
            onSelect={onDistrictSelect}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {postalOptions.map(option => (
        <OptionCard
          key={option.label}
          label={option.label}
          value={option}
          selected={selectedPostalLabel === option.label}
          onSelect={onPostalSelect}
        />
      ))}
    </>
  );
}

export default function AreaPickerStageList({
  stage,
  stageTitle,
  isLoadingStage,
  stageStatus,
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

  // Check if we have options to display for the current stage
  const hasOptions =
    (stage === 'province' && provinceOptions.length > 0) ||
    (stage === 'city' && cityOptions.length > 0) ||
    (stage === 'district' && districtOptions.length > 0) ||
    (stage === 'postal' && postalOptions.length > 0);

  // Blocking error: show error only, no options if we truly have no options
  if (stageStatus.kind === 'error' && !hasOptions) {
    return (
      <YStack>
        <StageStatusBanner stageStatus={stageStatus} />
      </YStack>
    );
  }

  // Guidance or idle: show banner (if guidance) + option list
  return (
    <YStack>
      <StageStatusBanner stageStatus={stageStatus} />
      <StageOptionList
        stage={stage}
        provinceOptions={provinceOptions}
        cityOptions={cityOptions}
        districtOptions={districtOptions}
        postalOptions={postalOptions}
        selectedPostalLabel={selectedPostalLabel}
        onProvinceSelect={onProvinceSelect}
        onCitySelect={onCitySelect}
        onDistrictSelect={onDistrictSelect}
        onPostalSelect={onPostalSelect}
      />
    </YStack>
  );
}
