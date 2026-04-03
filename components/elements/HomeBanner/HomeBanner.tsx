import { memo } from 'react';
import { Card, Image, Text, YStack, styled, XStack, useTheme } from 'tamagui';
import type {
  HomeBannerCTA,
  HomeBannerItem,
  HomeBannerIntent,
  HomeBannerPlacement,
} from '@/types/homeBanner';
import { ChevronRightIcon } from '@/components/icons';
import { getThemeColor } from '@/utils/theme';

export interface HomeBannerProps {
  banner: HomeBannerItem | null | undefined;
  onCTAPress?: (cta: HomeBannerCTA) => void;
}

export interface HomeBannerSkeletonProps {
  showIllustration?: boolean;
  placement?: HomeBannerPlacement;
}

function getAspectRatio(placement: HomeBannerPlacement): number {
  return placement === 'home_banner_top' ? 3 / 1 : 2 / 1;
}

const BannerContainer = styled(Card, {
  borderRadius: '$5',
  overflow: 'hidden',
  width: '100%',
  shadowColor: '$shadowColor',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 8,
});

const ContentOverlay = styled(YStack, {
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: '$3.5',
  gap: '$2',
  zIndex: 10,
});

const BannerAction = styled(XStack, {
  alignSelf: 'flex-start',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$1',
  borderRadius: '$10',
  paddingVertical: '$1.5',
  paddingHorizontal: '$3',
  minHeight: 44,
  pressStyle: { scale: 0.96, opacity: 0.9 },
});

const SkeletonBlock = styled(YStack, {
  backgroundColor: '$surfaceBorder',
  borderRadius: '$3',
});

const BANNER_THEME_CONFIG: Record<
  HomeBannerIntent,
  {
    titleColor: string;
    bodyColor: string;
    ctaBgToken: string;
    ctaTextToken: string;
    fallbackBg: string;
    borderColor: string;
  }
> = {
  promotional: {
    titleColor: '#FFFFFF',
    bodyColor: 'rgba(255,255,255,0.92)',
    ctaBgToken: 'primary',
    ctaTextToken: 'onPrimary',
    fallbackBg: '$warningSoft',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  informational: {
    titleColor: '#FFFFFF',
    bodyColor: 'rgba(255,255,255,0.92)',
    ctaBgToken: 'primary',
    ctaTextToken: 'onPrimary',
    fallbackBg: '$infoSoft',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  branding: {
    titleColor: '#FFFFFF',
    bodyColor: 'rgba(255,255,255,0.88)',
    ctaBgToken: 'primary',
    ctaTextToken: 'onPrimary',
    fallbackBg: '$surfaceSubtle',
    borderColor: 'rgba(255,255,255,0.25)',
  },
};

function useBannerTheme(intent: HomeBannerIntent) {
  const theme = useTheme();
  const config = BANNER_THEME_CONFIG[intent];

  return {
    ...config,
    ctaBg: getThemeColor(theme, config.ctaBgToken),
    ctaText: getThemeColor(theme, config.ctaTextToken),
  };
}

export const HomeBannerSkeleton = memo(function HomeBannerSkeleton({
  showIllustration = true,
  placement = 'home_banner_top',
}: HomeBannerSkeletonProps) {
  const aspectRatio = getAspectRatio(placement);
  return (
    <BannerContainer testID="home-banner-skeleton" aspectRatio={aspectRatio}>
      <YStack flex={1} backgroundColor="$surface" justifyContent="flex-end" padding="$3.5" gap="$2">
        {showIllustration ? (
          <SkeletonBlock width="100%" height="100%" position="absolute" top={0} left={0} />
        ) : null}
        <YStack gap="$2" zIndex={1}>
          <SkeletonBlock width="65%" height={20} borderRadius="$2" />
          <SkeletonBlock width="45%" height={14} borderRadius="$2" />
          <SkeletonBlock width={96} height={36} borderRadius="$10" marginTop="$1" />
        </YStack>
      </YStack>
    </BannerContainer>
  );
});

function HomeBanner({ banner, onCTAPress }: HomeBannerProps) {
  const hasText = Boolean(banner?.title || banner?.body);
  const hasValidCTA =
    banner?.ctaKind === 'route' && Boolean(banner?.cta?.label && banner?.cta?.route);
  const hasMediaUrl = Boolean(banner?.mediaUrl);
  const hasVisibleContent = hasText || hasValidCTA || hasMediaUrl;

  const theme = useBannerTheme(banner?.intent ?? 'promotional');
  const cta = banner?.cta;
  const aspectRatio = banner ? getAspectRatio(banner.placementKey) : 3 / 1;

  if (!banner || !hasVisibleContent) {
    return null;
  }

  if (!hasText && !hasValidCTA && hasMediaUrl) {
    return (
      <BannerContainer testID={`home-banner-${banner.placementKey}`} aspectRatio={aspectRatio}>
        <Image
          source={{ uri: banner.mediaUrl! }}
          width="100%"
          height="100%"
          resizeMode="cover"
          accessible={false}
          testID={`home-banner-image-${banner.placementKey}`}
        />
      </BannerContainer>
    );
  }

  return (
    <BannerContainer testID={`home-banner-${banner.placementKey}`} aspectRatio={aspectRatio}>
      {hasMediaUrl ? (
        <Image
          source={{ uri: banner.mediaUrl! }}
          width="100%"
          height="100%"
          resizeMode="cover"
          position="absolute"
          top={0}
          left={0}
          accessible={false}
          testID={`home-banner-image-${banner.placementKey}`}
        />
      ) : (
        <YStack flex={1} backgroundColor={theme.fallbackBg} />
      )}

      <ContentOverlay>
        {banner.title ? (
          <Text
            color={hasMediaUrl ? theme.titleColor : '$color'}
            fontSize={15}
            lineHeight={20}
            fontWeight="700"
            letterSpacing={-0.3}
            numberOfLines={2}
            textShadowColor={hasMediaUrl ? 'rgba(0,0,0,0.5)' : undefined}
            textShadowOffset={hasMediaUrl ? { width: 0, height: 1 } : undefined}
            textShadowRadius={hasMediaUrl ? 3 : undefined}>
            {banner.title}
          </Text>
        ) : null}

        {banner.body ? (
          <Text
            color={hasMediaUrl ? theme.bodyColor : '$colorSubtle'}
            fontSize={13}
            lineHeight={17}
            fontWeight="500"
            numberOfLines={2}
            textShadowColor={hasMediaUrl ? 'rgba(0,0,0,0.4)' : undefined}
            textShadowOffset={hasMediaUrl ? { width: 0, height: 1 } : undefined}
            textShadowRadius={hasMediaUrl ? 2 : undefined}>
            {banner.body}
          </Text>
        ) : null}

        {hasValidCTA && cta ? (
          <BannerAction
            onPress={() => onCTAPress?.(cta)}
            backgroundColor={theme.ctaBg}
            role="button"
            accessible
            accessibilityRole="button"
            accessibilityLabel={cta.label}
            borderWidth={1}
            borderColor={theme.borderColor}
            testID={`home-banner-cta-${banner.placementKey}`}>
            <Text color={theme.ctaText} fontSize={12} fontWeight="700">
              {cta.label}
            </Text>
            <ChevronRightIcon size={14} color={theme.ctaText} />
          </BannerAction>
        ) : null}
      </ContentOverlay>
    </BannerContainer>
  );
}

export default memo(HomeBanner);
