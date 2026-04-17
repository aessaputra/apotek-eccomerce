import { Card, Text, XStack, YStack } from 'tamagui';
import type { RegionalDistrict, RegionalProvince, RegionalRegency } from '@/types/regional';
import type { PostalOption } from './areaPickerHelpers';
import type { SelectionStage } from './areaPickerState';

type AreaPickerSelectionSummaryProps = {
  stage: SelectionStage;
  selectedProvince: RegionalProvince | null;
  selectedCity: RegionalRegency | null;
  selectedDistrict: RegionalDistrict | null;
  selectedPostalOption: PostalOption | null;
  onReset: () => void;
  onNavigateToStage: (stage: SelectionStage) => void;
};

export default function AreaPickerSelectionSummary({
  stage,
  selectedProvince,
  selectedCity,
  selectedDistrict,
  selectedPostalOption,
  onReset,
  onNavigateToStage,
}: AreaPickerSelectionSummaryProps) {
  return (
    <YStack gap="$3">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$3" color="$colorMuted">
          Lokasi Terpilih
        </Text>
        {(selectedProvince || selectedCity || selectedDistrict) && (
          <Text color="$primary" fontSize="$3" fontWeight="500" onPress={onReset}>
            Atur Ulang
          </Text>
        )}
      </XStack>

      <YStack gap="$1" paddingLeft="$2">
        <XStack
          alignItems="center"
          gap="$2"
          minHeight={44}
          role="button"
          aria-label={
            selectedProvince ? `Ubah provinsi ${selectedProvince.name}` : 'Pilih provinsi'
          }
          onPress={() => selectedProvince && onNavigateToStage('province')}>
          <YStack
            width={2}
            height={stage === 'province' ? 20 : '100%'}
            backgroundColor={stage === 'province' ? '$primary' : '$colorMuted'}
          />
          <Text
            fontSize="$5"
            color={selectedProvince ? '$color' : '$colorMuted'}
            fontWeight={stage === 'province' ? '600' : '400'}>
            {selectedProvince?.name.toUpperCase() || 'Pilih Provinsi'}
          </Text>
        </XStack>

        {(selectedProvince || stage !== 'province') && (
          <XStack
            alignItems="center"
            gap="$2"
            minHeight={44}
            role="button"
            aria-label={
              selectedCity ? `Ubah kota ${selectedCity.name}` : 'Pilih kota atau kabupaten'
            }
            onPress={() => selectedCity && onNavigateToStage('city')}>
            <YStack
              width={2}
              height={stage === 'city' ? 20 : '100%'}
              backgroundColor={
                stage === 'city' ? '$primary' : selectedCity ? '$colorMuted' : '$colorDisabled'
              }
            />
            <Text
              fontSize="$5"
              color={selectedCity ? '$color' : '$colorMuted'}
              fontWeight={stage === 'city' ? '600' : '400'}>
              {selectedCity?.name.toUpperCase() || 'Pilih Kota/Kabupaten'}
            </Text>
          </XStack>
        )}

        {(selectedCity || stage === 'district' || stage === 'postal') && (
          <XStack
            alignItems="center"
            gap="$2"
            minHeight={44}
            role="button"
            aria-label={
              selectedDistrict ? `Ubah kecamatan ${selectedDistrict.name}` : 'Pilih kecamatan'
            }
            onPress={() => selectedDistrict && onNavigateToStage('district')}>
            <YStack
              width={2}
              height={stage === 'district' ? 20 : '100%'}
              backgroundColor={
                stage === 'district'
                  ? '$primary'
                  : selectedDistrict
                    ? '$colorMuted'
                    : '$colorDisabled'
              }
            />
            <Text
              fontSize="$5"
              color={selectedDistrict ? '$color' : '$colorMuted'}
              fontWeight={stage === 'district' ? '600' : '400'}>
              {selectedDistrict?.name.toUpperCase() || 'Pilih Kecamatan'}
            </Text>
          </XStack>
        )}

        {(selectedDistrict || stage === 'postal') && (
          <XStack alignItems="center" gap="$2" minHeight={44}>
            <YStack
              width={2}
              height={20}
              backgroundColor={
                stage === 'postal'
                  ? '$primary'
                  : selectedPostalOption
                    ? '$colorMuted'
                    : '$colorDisabled'
              }
            />
            {selectedPostalOption ? (
              <Card
                borderRadius="$4"
                borderWidth={1.5}
                borderColor="$surfaceBorder"
                padding="$3"
                backgroundColor="$background"
                flex={1}>
                <Text fontSize="$5" color="$primary">
                  {selectedPostalOption.label}
                </Text>
              </Card>
            ) : (
              <Text
                fontSize="$5"
                color="$colorMuted"
                fontWeight={stage === 'postal' ? '600' : '400'}>
                {stage === 'postal' ? 'Pilih Kode Pos' : 'Kode Pos'}
              </Text>
            )}
          </XStack>
        )}
      </YStack>
    </YStack>
  );
}
