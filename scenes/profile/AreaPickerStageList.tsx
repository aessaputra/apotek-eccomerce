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

type OptionCardProps = {
  label: string;
  onPress: () => void;
  selected?: boolean;
};

function OptionCard({ label, onPress, selected = false }: OptionCardProps) {
  return (
    <Card
      borderRadius="$0"
      borderWidth={0}
      borderBottomWidth={1}
      borderColor="$surfaceBorder"
      backgroundColor="$background"
      paddingVertical="$4"
      paddingHorizontal="$1"
      onPress={onPress}>
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
    return provinceOptions.map(option => (
      <OptionCard
        key={option.code}
        label={option.name.toUpperCase()}
        onPress={() => void onProvinceSelect(option)}
      />
    ));
  }

  if (stage === 'city') {
    return cityOptions.map(option => (
      <OptionCard
        key={option.code}
        label={option.name.toUpperCase()}
        onPress={() => void onCitySelect(option)}
      />
    ));
  }

  if (stage === 'district') {
    return districtOptions.map(option => (
      <OptionCard
        key={option.code}
        label={option.name.toUpperCase()}
        onPress={() => void onDistrictSelect(option)}
      />
    ));
  }

  return postalOptions.map(option => (
    <OptionCard
      key={option.label}
      label={option.label}
      selected={option.label === selectedPostalLabel}
      onPress={() => void onPostalSelect(option)}
    />
  ));
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

  // Blocking error: show error only, no options
  if (stageStatus.kind === 'error') {
    return <StageStatusBanner stageStatus={stageStatus} />;
  }

  // Guidance or idle: show banner (if guidance) + option list
  return (
    <>
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
    </>
  );
}
