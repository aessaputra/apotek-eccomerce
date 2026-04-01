import { useEffect, useCallback } from 'react';
import { Sheet, YStack, XStack, Text, Input, Spinner, ScrollView, Card } from 'tamagui';
import { Search, MapPin } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BiteshipArea } from '@/types/shipping';
import { useAreaSearch } from '@/hooks/useAreaSearch';

export interface AreaPickerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (area: BiteshipArea) => void;
  selectedAreaId?: string;
}

function AreaPickerSheet({ open, onOpenChange, onSelect, selectedAreaId }: AreaPickerSheetProps) {
  const insets = useSafeAreaInsets();
  const { query, setQuery, results, isLoading, error, clearAll } = useAreaSearch();

  useEffect(() => {
    if (open) {
      setQuery('');
      clearAll();
    }
  }, [open, setQuery, clearAll]);

  const handleSelect = useCallback(
    (area: BiteshipArea) => {
      onSelect(area);
      onOpenChange(false);
    },
    [onSelect, onOpenChange],
  );

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      dismissOnOverlayPress
      dismissOnSnapToBottom
      snapPoints={[85]}
      animation="medium">
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="$sheetOverlay"
      />
      <Sheet.Handle />
      <Sheet.Frame
        paddingTop="$2"
        paddingHorizontal="$4"
        paddingBottom={insets.bottom}
        backgroundColor="$surfaceSubtle"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
        pointerEvents="box-none">
        <YStack flex={1} gap="$3" pointerEvents="box-none">
          <Text fontSize="$6" fontWeight="700" color="$color">
            Pilih Area Pengiriman
          </Text>

          <XStack
            backgroundColor="$background"
            borderWidth={1.5}
            borderColor="$surfaceBorder"
            borderRadius="$4"
            paddingHorizontal="$3"
            minHeight={56}
            alignItems="center"
            gap="$2"
            pointerEvents="auto">
            <Search size={20} color="$colorMuted" />
            <Input
              flex={1}
              backgroundColor="$colorTransparent"
              borderWidth={0}
              padding={0}
              fontSize="$4"
              color="$color"
              minHeight={56}
              placeholder="Cari kecamatan/kelurahan..."
              placeholderTextColor="$placeholderColor"
              value={query}
              onChangeText={setQuery}
            />
          </XStack>

          {isLoading && (
            <YStack alignItems="center" paddingVertical="$4">
              <Spinner size="large" color="$primary" />
              <Text fontSize="$3" color="$colorMuted" marginTop="$2">
                Mencari area...
              </Text>
            </YStack>
          )}

          {error && (
            <YStack alignItems="center" paddingVertical="$4">
              <Text fontSize="$3" color="$error">
                {error}
              </Text>
            </YStack>
          )}

          {!isLoading && !error && results.length === 0 && query.length >= 3 && (
            <YStack alignItems="center" justifyContent="center" paddingVertical="$8" gap="$2">
              <MapPin size={48} color="$colorMuted" />
              <Text fontSize="$4" color="$colorMuted" textAlign="center">
                Tidak ditemukan area untuk &quot;{query}&quot;
              </Text>
              <Text fontSize="$3" color="$colorMuted" textAlign="center">
                Coba kata kunci lain
              </Text>
            </YStack>
          )}

          {!isLoading && !error && results.length === 0 && query.length < 3 && (
            <YStack alignItems="center" justifyContent="center" paddingVertical="$8" gap="$2">
              <MapPin size={48} color="$colorMuted" />
              <Text fontSize="$4" color="$colorMuted" textAlign="center">
                Ketik minimal 3 karakter untuk mencari
              </Text>
            </YStack>
          )}

          <ScrollView
            flex={1}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            nestedScrollEnabled>
            <YStack gap="$1" pointerEvents="box-none">
              {results.map(area => (
                <Card
                  key={area.id}
                  animation="quick"
                  pressStyle={{ scale: 0.98, opacity: 0.9 }}
                  borderRadius="$4"
                  borderWidth={2}
                  borderColor={selectedAreaId === area.id ? '$primary' : '$surfaceBorder'}
                  padding="$3"
                  backgroundColor="$surface"
                  onPress={() => handleSelect(area)}
                  pointerEvents="auto">
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    {area.name}
                  </Text>
                  <Text fontSize="$2" color="$colorMuted" marginTop="$1">
                    {[
                      area.administrative_division_level_3_name,
                      area.administrative_division_level_2_name,
                      area.administrative_division_level_1_name,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </Text>
                  {area.postal_code && (
                    <Text fontSize="$2" color="$primary" marginTop="$1">
                      Kode Pos: {area.postal_code}
                    </Text>
                  )}
                </Card>
              ))}
            </YStack>
          </ScrollView>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

export default AreaPickerSheet;
