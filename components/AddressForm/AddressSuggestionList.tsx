import { Card, Spinner, Text, YStack, XStack } from 'tamagui';
import { MapPin, SearchX, AlertCircle } from '@tamagui/lucide-icons';
import type { AddressSuggestion } from '@/types/geocoding';

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

  if (trimmedQuery.length < 3 && !showInitialRecommendations) {
    return null;
  }

  if (isLoading) {
    return (
      <YStack gap="$2" paddingTop="$2">
        <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
          Rekomendasi Alamat
        </Text>
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
        <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
          Rekomendasi Alamat
        </Text>
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
        <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
          Rekomendasi Alamat
        </Text>
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

  return (
    <YStack gap="$2" paddingTop="$2">
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
          {showInitialRecommendations
            ? 'Rekomendasi tempat berdasarkan alamatmu'
            : 'Rekomendasi Alamat'}
        </Text>
        {results.length > 0 && (
          <Text fontSize="$2" color="$colorMuted">
            {results.length} hasil
          </Text>
        )}
      </XStack>

      <YStack gap="$2">
        {results.map(suggestion => (
          <Card
            key={suggestion.id}
            borderRadius="$4"
            borderWidth={1.5}
            borderColor="$surfaceBorder"
            backgroundColor="$surface"
            padding="$4"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
            disabled={isSelecting}
            animation="quick"
            onPress={() => onSelect(suggestion)}>
            <YStack gap="$2">
              <Text fontSize="$4" color="$color" fontWeight="600" numberOfLines={2}>
                {suggestion.primaryText}
              </Text>

              <Text fontSize="$3" color="$colorSubtle" numberOfLines={2}>
                {suggestion.secondaryText}
              </Text>

              <XStack gap="$1.5" alignItems="center" marginTop="$1">
                <MapPin size={14} color="$primary" />
                <Text fontSize="$2" color="$primary" fontWeight="500">
                  Pilih alamat ini
                </Text>
              </XStack>
            </YStack>
          </Card>
        ))}
      </YStack>
    </YStack>
  );
}

export default AddressSuggestionList;
