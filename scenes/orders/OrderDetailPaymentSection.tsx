import React from 'react';
import { Text, XStack, styled } from 'tamagui';

interface OrderDetailPaymentSectionProps {
  secondaryStatusDisplay: string | null;
}

const SecondaryStatusText = styled(Text, {
  fontSize: '$2',
  color: '$colorMuted',
});

export default function OrderDetailPaymentSection({
  secondaryStatusDisplay,
}: OrderDetailPaymentSectionProps) {
  if (!secondaryStatusDisplay) {
    return null;
  }

  return (
    <XStack justifyContent="space-between" alignItems="center">
      <Text fontSize="$3" color="$colorSubtle">
        Status Pembayaran
      </Text>
      <SecondaryStatusText>{secondaryStatusDisplay}</SecondaryStatusText>
    </XStack>
  );
}
