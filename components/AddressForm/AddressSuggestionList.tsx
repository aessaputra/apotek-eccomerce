import { Spinner, Text, YStack, XStack } from 'tamagui';
import { MapPin, Search, SearchX, AlertCircle } from '@tamagui/lucide-icons';
import type { AddressSuggestion } from '@/types/geocoding';

const INITIAL_RECOMMENDATION_LIMIT = 6;
const SEARCH_RECOMMENDATION_LIMIT = 5;

export interface AddressSuggestionListProps {
  query: string;
  results: AddressSuggestion[];
  isLoading: boolean;
  isSelecting?: boolean;
  error: string | null;
  showInitialRecommendations?: boolean;
  onSelect: (suggestion: AddressSuggestion) => void;
}

function AddressSuggestionList({
  query,
  results,
  isLoading,
  isSelecting = false,
  error,
  showInitialRecommendations = false,
  onSelect,
}: AddressSuggestionListProps) {
  const trimmedQuery = query.trim();
  const displayedResults = results.slice(
    0,
    showInitialRecommendations ? INITIAL_RECOMMENDATION_LIMIT : SEARCH_RECOMMENDATION_LIMIT,
  );
  const sectionTitle = showInitialRecommendations ? 'Rekomendasi dekat kamu' : 'Hasil pencarian';
  const SectionIcon = showInitialRecommendations ? MapPin : Search;

  if (trimmedQuery.length < 2 && !showInitialRecommendations) {
    return null;
  }

  if (isLoading) {
    return (
      <YStack gap="$2" paddingTop="$2">
        <XStack gap="$2" alignItems="center">
          <SectionIcon size={14} color="$colorMuted" />
          <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
            {sectionTitle}
          </Text>
        </XStack>
        <YStack
          backgroundColor="$surface"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$surfaceBorder"
          padding="$4"
          alignItems="center"
          gap="$3">
          <Spinner size="small" color="$primary" />
          <Text fontSize="$3" color="$colorMuted" textAlign="center">
            Mencari alamat yang cocok...
          </Text>
        </YStack>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack gap="$2" paddingTop="$2">
        <XStack gap="$2" alignItems="center">
          <SectionIcon size={14} color="$colorMuted" />
          <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
            {sectionTitle}
          </Text>
        </XStack>
        <YStack
          backgroundColor="$surface"
          borderRadius="$4"
          borderWidth={1.5}
          borderColor="$danger"
          padding="$4"
          gap="$2"
          alignItems="center">
          <AlertCircle size={20} color="$danger" />
          <Text fontSize="$3" color="$danger" textAlign="center">
            {error}
          </Text>
        </YStack>
      </YStack>
    );
  }

  if (results.length === 0 && !showInitialRecommendations) {
    return (
      <YStack gap="$2" paddingTop="$2">
        <XStack gap="$2" alignItems="center">
          <SectionIcon size={14} color="$colorMuted" />
          <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
            {sectionTitle}
          </Text>
        </XStack>
        <YStack
          backgroundColor="$surface"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$surfaceBorder"
          padding="$4"
          alignItems="center"
          gap="$3">
          <SearchX size={20} color="$colorMuted" />
          <Text fontSize="$3" color="$colorMuted" textAlign="center">
            Tidak ada alamat yang cocok dengan &quot;{trimmedQuery}&quot;
          </Text>
          <Text fontSize="$2" color="$colorMuted" textAlign="center">
            Coba ketik nama jalan atau patokan yang lebih spesifik
          </Text>
        </YStack>
      </YStack>
    );
  }

  if (results.length === 0 && showInitialRecommendations) {
    return (
      <YStack gap="$2" paddingTop="$2">
        <XStack gap="$2" alignItems="center">
          <SectionIcon size={14} color="$colorMuted" />
          <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
            {sectionTitle}
          </Text>
        </XStack>
        <YStack
          backgroundColor="$surface"
          borderRadius="$4"
          borderWidth={1}
          borderColor="$surfaceBorder"
          padding="$4"
          alignItems="center"
          gap="$3">
          <MapPin size={20} color="$colorMuted" />
          <Text fontSize="$3" color="$colorMuted" textAlign="center">
            Belum ada rekomendasi tempat di sekitarmu.
          </Text>
          <Text fontSize="$2" color="$colorMuted" textAlign="center">
            Aktifkan lokasi atau ketik nama jalan dan patokan yang lebih spesifik.
          </Text>
        </YStack>
      </YStack>
    );
  }

  return (
    <YStack gap="$2" paddingTop="$2">
      <XStack gap="$2" alignItems="center">
        <SectionIcon size={14} color="$colorMuted" />
        <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
          {sectionTitle}
        </Text>
      </XStack>

      <YStack gap="$1">
        {displayedResults.map(suggestion => (
          <XStack
            key={suggestion.id}
            paddingVertical="$3"
            paddingHorizontal="$2"
            gap="$3"
            alignItems="flex-start"
            pressStyle={{ opacity: 0.7, backgroundColor: '$backgroundHover' }}
            borderRadius="$3"
            disabled={isSelecting}
            onPress={() => onSelect(suggestion)}>
            <YStack paddingTop="$0.5">
              <MapPin size={18} color="$colorMuted" />
            </YStack>
            <YStack flex={1} gap="$0.5">
              <Text fontSize="$4" color="$color" fontWeight="600" numberOfLines={2}>
                {suggestion.primaryText}
              </Text>
              <Text fontSize="$3" color="$colorSubtle" numberOfLines={2}>
                {suggestion.secondaryText}
              </Text>
            </YStack>
          </XStack>
        ))}
      </YStack>
    </YStack>
  );
}

export default AddressSuggestionList;
