import { useCallback, useEffect, useState } from 'react';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Input, Spinner, Button, useTheme, styled } from 'tamagui';
import { SearchIcon, ChevronLeftIcon } from '@/components/icons';
import { useDebounce } from '@/hooks';
import { searchProducts, type ProductWithImages } from '@/services/home.service';
import { getThemeColor } from '@/utils/theme';
import { THEME_FALLBACKS } from '@/constants/ui';
import SearchProductGrid from '@/components/elements/SearchProductGrid';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

export default function ProductSearch() {
  const router = useRouter();
  const theme = useTheme();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ProductWithImages[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);

  const debouncedQuery = useDebounce(query, 300);

  const iconColor = getThemeColor(theme, 'color', THEME_FALLBACKS.color);
  const placeholderColor = getThemeColor(
    theme,
    'searchPlaceholderColor',
    THEME_FALLBACKS.searchPlaceholderColor ?? THEME_FALLBACKS.placeholderColor,
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleProductPress = useCallback(
    (productId: string) => {
      router.push({ pathname: '/home/product-details', params: { id: productId } });
    },
    [router],
  );

  const handleRetry = useCallback(() => {
    if (debouncedQuery.trim()) {
      setIsLoading(true);
      setError(null);
      searchProducts(debouncedQuery)
        .then(data => {
          setResults(data);
        })
        .catch(err => {
          setError(err instanceof Error ? err.message : 'Failed to search products');
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [debouncedQuery]);

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setResults([]);

    let isStale = false;

    searchProducts(debouncedQuery)
      .then(data => {
        if (!isStale) {
          setResults(data);
        }
      })
      .catch(err => {
        if (!isStale) {
          setError(err instanceof Error ? err.message : 'Failed to search products');
          setResults([]);
        }
      })
      .finally(() => {
        if (!isStale) {
          setIsLoading(false);
        }
      });

    return () => {
      isStale = true;
    };
  }, [debouncedQuery]);

  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      );
    }

    if (error) {
      return (
        <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal="$4">
          <Text fontSize="$5" color="$color" textAlign="center" marginBottom="$3">
            {error}
          </Text>
          <Button
            backgroundColor="$primary"
            paddingHorizontal="$4"
            paddingVertical="$2"
            borderRadius="$3"
            onPress={handleRetry}>
            <Text color="$onPrimary" fontSize="$4" fontWeight="600">
              Retry
            </Text>
          </Button>
        </YStack>
      );
    }

    if (!debouncedQuery.trim()) {
      return (
        <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal="$4">
          <SearchIcon size={64} color={placeholderColor} />
          <Text fontSize="$5" color="$colorSubtle" textAlign="center" marginTop="$4">
            Start typing to search
          </Text>
        </YStack>
      );
    }

    if (results.length === 0) {
      return (
        <YStack flex={1} alignItems="center" justifyContent="center" paddingHorizontal="$4">
          <Text fontSize="$5" color="$color" textAlign="center" marginBottom="$2">
            No products found
          </Text>
          <Text fontSize="$4" color="$colorSubtle" textAlign="center">
            Try different keywords
          </Text>
        </YStack>
      );
    }

    return null;
  };

  return (
    <SafeAreaView>
      <YStack flex={1}>
        <XStack
          alignItems="center"
          paddingHorizontal="$3"
          paddingVertical="$2"
          backgroundColor="$surface"
          borderBottomWidth={1}
          borderBottomColor="$surfaceBorder">
          <XStack
            minWidth="$3"
            minHeight="$3"
            alignItems="center"
            justifyContent="center"
            onPress={handleBack}
            cursor="pointer"
            role="button"
            aria-label="Go back">
            <ChevronLeftIcon size={24} color={iconColor} />
          </XStack>

          <XStack
            flex={1}
            alignItems="center"
            backgroundColor="$surfaceElevated"
            borderRadius="$3"
            paddingHorizontal="$3"
            borderWidth={1}
            borderColor={isInputFocused ? '$primary' : '$borderColorHover'}>
            <SearchIcon size={20} color={placeholderColor} />
            <Input
              flex={1}
              value={query}
              onChangeText={setQuery}
              placeholder="Search products..."
              placeholderTextColor={placeholderColor}
              backgroundColor="transparent"
              borderWidth={0}
              paddingHorizontal="$2"
              paddingVertical="$2"
              fontSize="$4"
              color="$color"
              autoFocus={true}
              autoCorrect={false}
              autoCapitalize="none"
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
            />
          </XStack>
        </XStack>

        {results.length > 0 ? (
          <SearchProductGrid
            products={results}
            iconColor={iconColor}
            onProductPress={handleProductPress}
          />
        ) : (
          renderEmptyState()
        )}
      </YStack>
    </SafeAreaView>
  );
}
