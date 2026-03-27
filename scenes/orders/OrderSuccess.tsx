import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { CheckCircle } from '@tamagui/lucide-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import { getThemeColor } from '@/utils/theme';
import type { RouteParams } from '@/types/routes.types';

export default function OrderSuccess() {
  const { orderId } = useLocalSearchParams<RouteParams<'orders/success'>>();
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const successColor = getThemeColor(theme, 'success', '#22c55e');

  const handleGoHome = () => {
    router.replace('/home');
  };

  const handleViewOrders = () => {
    router.replace('/orders');
  };

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
      paddingHorizontal="$4"
      paddingBottom={insets.bottom + 16}
      paddingTop={insets.top + 16}>
      <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
        <YStack alignItems="center" gap="$4">
          <YStack
            width={80}
            height={80}
            borderRadius={40}
            backgroundColor="$successBackground"
            alignItems="center"
            justifyContent="center">
            <CheckCircle size={40} color={successColor} />
          </YStack>

          <Text fontSize="$7" fontWeight="700" color="$color" textAlign="center">
            Pembayaran Berhasil
          </Text>

          <Text fontSize="$4" color="$colorSubtle" textAlign="center" maxWidth={300}>
            Terima kasih! Pesanan Anda telah diterima dan sedang diproses.
          </Text>

          {orderId && (
            <XStack
              backgroundColor="$surface"
              paddingHorizontal="$3"
              paddingVertical="$2"
              borderRadius="$2"
              borderWidth={1}
              borderColor="$surfaceBorder"
              gap="$2"
              alignItems="center">
              <Text fontSize="$3" color="$colorSubtle">
                Order ID:
              </Text>
              <Text fontSize="$3" fontWeight="600" color="$color">
                {orderId}
              </Text>
            </XStack>
          )}
        </YStack>

        <YStack gap="$3" width="100%" maxWidth={400}>
          <Button
            title="Lihat Pesanan"
            backgroundColor="$primary"
            titleStyle={{ color: '$white', fontWeight: '600' }}
            onPress={handleViewOrders}
          />

          <Button
            title="Kembali ke Beranda"
            backgroundColor="transparent"
            titleStyle={{ color: '$primary', fontWeight: '600' }}
            onPress={handleGoHome}
          />
        </YStack>
      </YStack>
    </YStack>
  );
}
