import { memo } from 'react';
import { Card, Image, ScrollView, Text, XStack, YStack, styled, useTheme } from 'tamagui';
import { PillIcon } from '@/components/icons';
import type { CategoryRow } from '@/services/home.service';
import { getThemeColor } from '@/utils/theme';

const CATEGORY_SIZE_CONFIG = {
  small: {
    minWidth: 148,
    maxWidth: 196,
    minHeight: 64,
    iconContainer: 32,
    iconImage: 22,
    iconGlyph: 16,
    textSize: 12,
    lineHeight: 16,
    horizontalPadding: '$3.5',
    verticalPadding: '$2.5',
  },
  medium: {
    minWidth: 178,
    maxWidth: 232,
    minHeight: 70,
    iconContainer: 36,
    iconImage: 24,
    iconGlyph: 18,
    textSize: 13,
    lineHeight: 17,
    horizontalPadding: '$4',
    verticalPadding: '$3',
  },
  large: {
    minWidth: 214,
    maxWidth: 276,
    minHeight: 78,
    iconContainer: 40,
    iconImage: 28,
    iconGlyph: 20,
    textSize: 14,
    lineHeight: 18,
    horizontalPadding: '$4.5',
    verticalPadding: '$3.5',
  },
} as const;

const CategoryCard = styled(Card, {
  minHeight: 64,
  paddingHorizontal: '$3',
  paddingVertical: '$2.5',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$primary',
  borderRadius: '$6',
  justifyContent: 'center',
  pressStyle: { opacity: 0.96, scale: 0.985 },
  hoverStyle: { borderColor: '$primary', backgroundColor: '$surface' },
  focusStyle: { borderColor: '$primary' },
  animation: 'quick',

  $gtSm: {
    borderRadius: '$7',
  },

  variants: {
    size: {
      small: {
        minWidth: 148,
        maxWidth: 196,
        minHeight: 64,
      },
      medium: {
        minWidth: 178,
        maxWidth: 232,
        minHeight: 70,
      },
      large: {
        minWidth: 214,
        maxWidth: 276,
        minHeight: 78,
      },
    },
    layout: {
      scroll: {
        flexGrow: 0,
        flexShrink: 0,
      },
      grid2: {
        flexBasis: '48.8%',
        flexGrow: 0,
      },
      grid3: {
        flexBasis: '32%',
        flexGrow: 0,
      },
      grid4: {
        flexBasis: '24%',
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
  borderColor: '$primary',
  borderRadius: '$6',
  minHeight: 64,
  justifyContent: 'center',
  overflow: 'hidden',
  $gtSm: {
    borderRadius: '$7',
  },
});

export interface CategoryItemProps {
  category: CategoryRow;
  onPress?: () => void;
  size?: 'small' | 'medium' | 'large';
  layout?: 'scroll' | 'grid2' | 'grid3' | 'grid4';
  width?: number;
}

export interface CategorySkeletonProps {
  isLargeScreen?: boolean;
}

export const CategorySkeleton = memo(function CategorySkeleton({
  isLargeScreen = false,
}: CategorySkeletonProps) {
  const skeletonItems = [1, 2, 3, 4, 5, 6, 7, 8].map(i => (
    <SkeletonCard
      key={i}
      minWidth={148}
      maxWidth={196}
      $gtSm={{ minWidth: 178, maxWidth: 232 }}
      $gtLg={{ minWidth: 214, maxWidth: 276 }}
      paddingHorizontal="$3.5"
      paddingVertical="$2.5">
      <XStack alignItems="center" justifyContent="flex-start" gap="$2.5">
        <YStack width={32} height={32} borderRadius="$10" backgroundColor="$surfaceSubtle" />
        <YStack flex={1} maxWidth={92} gap="$1.5">
          <YStack width="82%" height={10} borderRadius="$2" backgroundColor="$surfaceBorder" />
          <YStack width="58%" height={8} borderRadius="$2" backgroundColor="$surfaceSubtle" />
        </YStack>
      </XStack>
    </SkeletonCard>
  ));

  if (isLargeScreen) {
    return (
      <XStack flexWrap="wrap" gap="$3" justifyContent="flex-start">
        {skeletonItems}
      </XStack>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 2, paddingRight: 6 }}>
      <XStack gap="$3">{skeletonItems}</XStack>
    </ScrollView>
  );
});

function CategoryItem({
  category,
  onPress,
  size = 'small',
  layout = 'scroll',
  width,
}: CategoryItemProps) {
  const theme = useTheme();
  const sizeConfig = CATEGORY_SIZE_CONFIG[size];
  const textLines = 2;
  const constrainedWidth =
    layout === 'scroll' && typeof width === 'number' ? Math.max(width, 44) : null;

  return (
    <CategoryCard
      size={size}
      layout={layout}
      minHeight={Math.max(sizeConfig.minHeight, 44)}
      width={constrainedWidth ?? undefined}
      minWidth={constrainedWidth ?? Math.max(sizeConfig.minWidth, 44)}
      maxWidth={constrainedWidth ?? sizeConfig.maxWidth}
      paddingHorizontal={sizeConfig.horizontalPadding}
      paddingVertical={sizeConfig.verticalPadding}
      onPress={onPress}
      role={onPress ? 'button' : undefined}
      aria-label={onPress ? `${category.name} category` : undefined}
      aria-describedby={onPress ? `Explore ${category.name} products` : undefined}>
      <XStack alignItems="center" justifyContent="flex-start" gap="$2.5" minHeight={44}>
        {category.logo_url ? (
          <Card
            width={sizeConfig.iconContainer}
            height={sizeConfig.iconContainer}
            borderRadius="$10"
            backgroundColor="$surfaceSubtle"
            alignItems="center"
            justifyContent="center"
            overflow="hidden">
            <Image
              source={{ uri: category.logo_url }}
              width={sizeConfig.iconImage}
              height={sizeConfig.iconImage}
              borderRadius="$3"
              resizeMode="contain"
            />
          </Card>
        ) : (
          <YStack
            width={sizeConfig.iconContainer}
            height={sizeConfig.iconContainer}
            borderRadius="$10"
            alignItems="center"
            justifyContent="center"
            backgroundColor="$warningSoft">
            <PillIcon size={sizeConfig.iconGlyph} color={getThemeColor(theme, 'primary')} />
          </YStack>
        )}
        <Text
          flex={1}
          minWidth={0}
          fontSize={sizeConfig.textSize}
          lineHeight={sizeConfig.lineHeight}
          color="$color"
          fontWeight="700"
          numberOfLines={textLines}
          ellipsizeMode="tail">
          {category.name}
        </Text>
      </XStack>
    </CategoryCard>
  );
}

export default memo(CategoryItem);
