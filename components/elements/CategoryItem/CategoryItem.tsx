import { memo } from 'react';
import { Card, Image, ScrollView, Text, XStack, YStack, styled, useTheme } from 'tamagui';
import { PillIcon } from '@/components/icons';
import type { CategoryRow } from '@/services/home.service';
import { getThemeColor } from '@/utils/theme';

const CategoryCard = styled(Card, {
  minHeight: 60,
  paddingHorizontal: '$3',
  paddingVertical: '$2.5',
  backgroundColor: '$surfaceElevated',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  borderRadius: '$6',
  elevation: 2,
  pressStyle: { opacity: 0.94, scale: 0.98 },
  flex: 1,

  variants: {
    size: {
      small: {
        minWidth: 120,
        maxWidth: 152,
      },
      medium: {
        minWidth: 148,
        maxWidth: 188,
      },
      large: {
        minWidth: 176,
        maxWidth: 232,
      },
    },
    layout: {
      scroll: {
        flex: 1,
      },
      grid2: {
        flexBasis: '48%',
        flexGrow: 0,
      },
      grid3: {
        flexBasis: '31.5%',
        flexGrow: 0,
      },
      grid4: {
        flexBasis: '23.5%',
        flexGrow: 0,
      },
    },
  } as const,

  defaultVariants: {
    size: 'small',
    layout: 'scroll',
  },
});

const SkeletonCard = styled(Card, {
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  borderRadius: '$4',
});

export interface CategoryItemProps {
  category: CategoryRow;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  layout?: 'scroll' | 'grid2' | 'grid3' | 'grid4';
}

export interface CategorySkeletonProps {
  isLargeScreen?: boolean;
}

export const CategorySkeleton = memo(function CategorySkeleton({
  isLargeScreen = false,
}: CategorySkeletonProps) {
  const skeletonItems = [1, 2, 3, 4, 5, 6].map(i => (
    <SkeletonCard
      key={i}
      minWidth={100}
      flex={1}
      minHeight={52}
      paddingHorizontal="$2.5"
      paddingVertical="$2">
      <XStack alignItems="center" justifyContent="center" gap="$2">
        <YStack width={24} height={24} borderRadius="$3" backgroundColor="$surfaceBorder" />
        <YStack width={60} height={14} borderRadius="$2" backgroundColor="$surfaceBorder" />
      </XStack>
    </SkeletonCard>
  ));

  if (isLargeScreen) {
    return (
      <XStack flexWrap="wrap" gap="$2.5">
        {skeletonItems}
      </XStack>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <XStack gap="$2.5" pr="$2">
        {skeletonItems}
      </XStack>
    </ScrollView>
  );
});

function CategoryItem({ category, onPress, size = 'small', layout = 'scroll' }: CategoryItemProps) {
  const theme = useTheme();

  return (
    <CategoryCard
      size={size}
      layout={layout}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? `${category.name} category` : undefined}
      accessibilityHint={onPress ? `Explore ${category.name} products` : undefined}>
      <XStack alignItems="center" justifyContent="flex-start" gap="$2.5">
        {category.logo_url ? (
          <Card
            width={30}
            height={30}
            borderRadius="$10"
            backgroundColor="$surfaceSubtle"
            alignItems="center"
            justifyContent="center"
            overflow="hidden">
            <Image source={{ uri: category.logo_url }} width={24} height={24} borderRadius="$3" />
          </Card>
        ) : (
          <YStack
            width={30}
            height={30}
            borderRadius="$10"
            alignItems="center"
            justifyContent="center"
            backgroundColor="$warningSoft">
            <PillIcon size={16} color={getThemeColor(theme, 'primary')} />
          </YStack>
        )}
        <Text fontSize={13} lineHeight={16} color="$color" fontWeight="700" numberOfLines={1}>
          {category.name}
        </Text>
      </XStack>
    </CategoryCard>
  );
}

export default memo(CategoryItem);
