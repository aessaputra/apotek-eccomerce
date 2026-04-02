import { useEffect, useRef } from 'react';
import type { TextInput as RNTextInput } from 'react-native';
import { Sheet, YStack, XStack, Text, Input } from 'tamagui';
import { Search, ArrowLeft, X as CloseIcon } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AddressSuggestionList from './AddressSuggestionList';
import type { AddressSuggestion, GeocodingProximity } from '@/types/geocoding';

export interface StreetAddressSearchSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  isSaving?: boolean;
  isLoading: boolean;
  isSelecting?: boolean;
  error: string | null;
  results: AddressSuggestion[];
  proximity?: GeocodingProximity | null;
  onQueryChange: (value: string) => void;
  onSelectSuggestion: (suggestion: AddressSuggestion) => void;
  onLoadSuggestions?: () => void;
  showInitialRecommendations?: boolean;
}

function StreetAddressSearchSheet({
  open,
  onOpenChange,
  query,
  isSaving = false,
  isLoading,
  isSelecting = false,
  error,
  results,
  onQueryChange,
  onSelectSuggestion,
  onLoadSuggestions,
  showInitialRecommendations = false,
}: StreetAddressSearchSheetProps) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef<RNTextInput | null>(null);

  useEffect(() => {
    if (!open) return;

    onLoadSuggestions?.();

    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => clearTimeout(timer);
  }, [open, onLoadSuggestions]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      dismissOnOverlayPress
      dismissOnSnapToBottom={false}
      snapPoints={[96]}
      animation="medium">
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="$sheetOverlay"
      />
      <Sheet.Frame backgroundColor="$background" borderTopLeftRadius="$6" borderTopRightRadius="$6">
        <YStack flex={1} paddingTop={insets.top > 0 ? '$2' : '$4'}>
          <XStack alignItems="center" gap="$3" paddingHorizontal="$4" paddingBottom="$3">
            <XStack
              width={40}
              height={40}
              borderRadius={20}
              alignItems="center"
              justifyContent="center"
              pressStyle={{ opacity: 0.8, scale: 0.96 }}
              onPress={() => onOpenChange(false)}>
              <ArrowLeft size={22} color="$color" />
            </XStack>

            <Text flex={1} fontSize="$7" fontWeight="700" color="$color">
              Alamat Baru
            </Text>
          </XStack>

          <YStack paddingHorizontal="$4" gap="$3" flex={1}>
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
                placeholder="Nama Jalan, Gedung, No. Rumah"
                placeholderTextColor="$placeholderColor"
                value={query}
                editable={!isSaving}
                onChangeText={onQueryChange}
              />
              {query ? (
                <XStack
                  width={32}
                  height={32}
                  borderRadius={16}
                  alignItems="center"
                  justifyContent="center"
                  pressStyle={{ opacity: 0.8, scale: 0.96 }}
                  onPress={() => onQueryChange('')}>
                  <CloseIcon size={18} color="$colorMuted" />
                </XStack>
              ) : null}
            </XStack>

            <AddressSuggestionList
              query={query}
              results={results}
              isLoading={isLoading}
              isSelecting={isSelecting}
              error={error}
              showInitialRecommendations={showInitialRecommendations}
              onSelect={suggestion => {
                onSelectSuggestion(suggestion);
                onOpenChange(false);
              }}
            />
          </YStack>
        </YStack>
      </Sheet.Frame>
    </Sheet>
  );
}

export default StreetAddressSearchSheet;
