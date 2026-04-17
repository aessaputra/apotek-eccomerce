import React from 'react';
import { Card, Text, YStack, styled } from 'tamagui';
import { PackageIcon } from '@/components/icons';

const StyledCard = styled(Card, {
  elevate: true,
  backgroundColor: '$surfaceElevated',
  overflow: 'hidden',
  position: 'relative',
  padding: '$5',
  marginBottom: '$4',
  marginHorizontal: '$4',
  borderRadius: '$5',
  borderColor: '$surfaceBorder',
  borderWidth: 1,
  borderLeftWidth: 4,
  borderLeftColor: '$primary',
  // Smooth entrance style using config defaults if react-native-reanimated is active
  animation: 'lazy',
  enterStyle: {
    opacity: 0,
    y: 10,
  },
});

const IconWrapper = styled(YStack, {
  position: 'absolute',
  right: -40,
  top: -30,
  opacity: 0.12,
  pointerEvents: 'none',
  transform: [{ rotate: '-12deg' }],
});

export const OrdersHeroCard = React.memo(() => {
  return (
    <StyledCard>
      <IconWrapper>
        {/* We use oversized primary icon bleeding into the negative space */}
        <PackageIcon size={200} color="$primary" />
      </IconWrapper>

      <YStack gap="$2" zIndex={1} paddingRight="$6">
        <Text color="$color" fontSize="$6" fontWeight="800" lineHeight={32} letterSpacing={-0.5}>
          Dari Apotek Langsung ke Tangan Anda
        </Text>

        <Text color="$colorSubtle" fontSize="$3" lineHeight={22} marginTop="$1">
          Tak perlu repot menebak kapan obat tiba. Pantau setiap tahap penyiapan pesanan hingga
          pengantaran di sini.
        </Text>
      </YStack>
    </StyledCard>
  );
});

OrdersHeroCard.displayName = 'OrdersHeroCard';
