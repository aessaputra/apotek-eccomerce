import { memo } from 'react';
import { Card, Image, Text, YStack, styled, XStack } from 'tamagui';
import { ChevronRightIcon } from '@/components/icons';
import type { HomeBannerCTA, HomeBannerItem, HomeBannerIntent } from '@/types/homeBanner';

export interface HomeBannerProps {
  banner: HomeBannerItem | null | undefined;
  onCTAPress?: (cta: HomeBannerCTA) => void;
}

export interface HomeBannerSkeletonProps {
  showIllustration?: boolean;
}

/**
 * Banner container with image-led layout.
 * Uses aspect ratio for consistent sizing across placements.
 */
const BannerContainer = styled(Card, {
  borderRadius: '$4',
  overflow: 'hidden',
  aspectRatio: 21 / 9,
  width: '100%',
});

/**
 * Gradient overlay for text readability over images.
 * Positioned at bottom of banner with fade-up effect.
 */
const ContentOverlay = styled(YStack, {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '$3',
  gap: '$1.5',
});

/**
 * CTA button styled for visibility over image backgrounds.
 */
const BannerAction = styled(XStack, {
  alignSelf: 'flex-start',
  alignItems: 'center',
  gap: '$1',
  backgroundColor: '$surface',
  borderRadius: '$10',
  paddingVertical: '$1',
  paddingHorizontal: '$2.5',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  minHeight: 32,
  pressStyle: { opacity: 0.92 },
});

/**
 * Skeleton block for loading states.
 */
const SkeletonBlock = styled(YStack, {
  backgroundColor: '$surfaceBorder',
  borderRadius: '$3',
});

function getBannerColors(intent: HomeBannerIntent) {
  if (intent === 'branding') {
    return {
      titleColor: '$color',
      bodyColor: '$colorSubtle',
    } as const;
  }

  if (intent === 'promotional') {
    return {
      titleColor: '$color',
      bodyColor: '$colorSubtle',
    } as const;
  }

  return {
    titleColor: '$color',
    bodyColor: '$colorSubtle',
  } as const;
}

/**
 * Renders skeleton placeholder while banner data loads.
 */
export const HomeBannerSkeleton = memo(function HomeBannerSkeleton({
  showIllustration = true,
}: HomeBannerSkeletonProps) {
  return (
    <BannerContainer testID="home-banner-skeleton">
      <YStack flex={1} backgroundColor="$surface" justifyContent="flex-end" padding="$3" gap="$2">
        {showIllustration ? (
          <SkeletonBlock width="100%" height="100%" position="absolute" top={0} left={0} />
        ) : null}
        <YStack gap="$1.5" zIndex={1}>
          <SkeletonBlock width="70%" height={18} />
          <SkeletonBlock width="50%" height={14} />
          <SkeletonBlock width={88} height={32} borderRadius="$10" />
        </YStack>
      </YStack>
    </BannerContainer>
  );
});

/**
 * HomeBanner displays promotional, informational, or branding content.
 *
 * Presentation modes:
 * - Content Banner Mode: When title or body exists, renders image-led banner
 *   with bottom-anchored text + CTA overlay with scrim gradient.
 * - Image-Only Banner Mode: When no text/CTA but mediaUrl exists, renders
 *   full-image treatment without empty text blocks.
 *
 * @see HomeBanner Presentation Spec.md
 */
function HomeBanner({ banner, onCTAPress }: HomeBannerProps) {
  if (!banner) {
    return null;
  }

  const hasText = Boolean(banner.title || banner.body);
  const hasValidCTA = Boolean(banner.cta?.label);
  const hasMediaUrl = Boolean(banner.mediaUrl);

  const hasVisibleContent = hasText || hasValidCTA || hasMediaUrl;
  if (!hasVisibleContent) {
    return null;
  }

  const colors = getBannerColors(banner.intent);
  const cta = banner.cta;

  if (!hasText && !hasValidCTA && hasMediaUrl) {
    return (
      <BannerContainer testID={`home-banner-${banner.placementKey}`}>
        <Image
          source={{ uri: banner.mediaUrl! }}
          width="100%"
          height="100%"
          resizeMode="cover"
          testID={`home-banner-image-${banner.placementKey}`}
        />
      </BannerContainer>
    );
  }

  return (
    <BannerContainer testID={`home-banner-${banner.placementKey}`}>
      {hasMediaUrl ? (
        <Image
          source={{ uri: banner.mediaUrl! }}
          width="100%"
          height="100%"
          resizeMode="cover"
          position="absolute"
          top={0}
          left={0}
          testID={`home-banner-image-${banner.placementKey}`}
        />
      ) : (
        <YStack
          flex={1}
          backgroundColor={banner.intent === 'branding' ? '$surface' : '$surfaceSubtle'}
        />
      )}

      {hasMediaUrl ? (
        <YStack
          position="absolute"
          bottom={0}
          left={0}
          right={0}
          height="60%"
          backgroundColor="rgba(0, 0, 0, 0.5)"
          opacity={0.6}
        />
      ) : null}

      <ContentOverlay>
        {banner.title ? (
          <Text
            color={hasMediaUrl ? '$white' : colors.titleColor}
            fontSize={14}
            lineHeight={18}
            fontWeight="700"
            numberOfLines={2}>
            {banner.title}
          </Text>
        ) : null}

        {banner.body ? (
          <Text
            color={hasMediaUrl ? '$white' : colors.bodyColor}
            fontSize={12}
            lineHeight={16}
            fontWeight="500"
            numberOfLines={2}>
            {banner.body}
          </Text>
        ) : null}

        {hasValidCTA && cta ? (
          <BannerAction onPress={() => onCTAPress?.(cta)} role="button" aria-label={cta.label}>
            <Text color="$primary" fontSize={11} fontWeight="700">
              {cta.label}
            </Text>
            <ChevronRightIcon size={14} color="$primary" />
          </BannerAction>
        ) : null}
      </ContentOverlay>
    </BannerContainer>
  );
}

export default memo(HomeBanner);
