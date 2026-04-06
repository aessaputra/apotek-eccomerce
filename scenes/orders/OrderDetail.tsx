import React, { useCallback, useState } from 'react';
import { ScrollView, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  Button,
  Card,
  H2,
  Separator,
  Spinner,
  Text,
  XStack,
  YStack,
  styled,
  useTheme,
} from 'tamagui';
import { TruckIcon, CreditCardIcon } from '@/components/icons';
import { getOrderStatusLabel, getPaymentStatusLabel } from '@/services';
import { getThemeColor } from '@/utils/theme';

const SectionCard = styled(Card, {
  bordered: true,
  size: '$4',
  backgroundColor: '$surface',
  borderColor: '$surfaceBorder',
  marginHorizontal: '$4',
  marginBottom: '$3',
});

function formatRupiah(amount: number): string {
  return `Rp ${amount.toLocaleString('id-ID')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrderDetail() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const theme = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const refreshTintColor = getThemeColor(theme, 'primary');

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={refreshTintColor}
          />
        }>
        <YStack paddingVertical="$4" gap="$3">
          {/* Status Section */}
          <SectionCard>
            <YStack padding="$4" gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="$colorSubtle">
                  Status Pesanan
                </Text>
                <Text fontSize="$3" fontWeight="600" color="$primary">
                  Diproses
                </Text>
              </XStack>

              <Separator />

              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="$colorSubtle">
                  Status Pembayaran
                </Text>
                <Text fontSize="$3" fontWeight="600" color="$success">
                  Lunas
                </Text>
              </XStack>
            </YStack>
          </SectionCard>

          {/* Products Section */}
          <SectionCard>
            <YStack padding="$4" gap="$3">
              <XStack alignItems="center" gap="$2">
                <CreditCardIcon size={20} color="$primary" />
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Produk
                </Text>
              </XStack>

              <Separator />

              <YStack gap="$2">
                <XStack justifyContent="space-between">
                  <Text fontSize="$3" color="$color">
                    Paracetamol 500mg
                  </Text>
                  <Text fontSize="$3" color="$colorSubtle">
                    x2
                  </Text>
                </XStack>
                <Text fontSize="$3" color="$colorSubtle">
                  Rp 25.000 x 2 = Rp 50.000
                </Text>
              </YStack>
            </YStack>
          </SectionCard>

          {/* Shipping Section */}
          <SectionCard>
            <YStack padding="$4" gap="$3">
              <XStack alignItems="center" gap="$2">
                <TruckIcon size={20} color="$primary" />
                <Text fontSize="$4" fontWeight="600" color="$color">
                  Pengiriman
                </Text>
              </XStack>

              <Separator />

              <YStack gap="$2">
                <Text fontSize="$3" color="$color">
                  JNE Regular
                </Text>
                <Text fontSize="$3" color="$colorSubtle">
                  Estimasi: 2-3 hari
                </Text>
                <Text fontSize="$3" color="$primary" fontWeight="600">
                  Rp 15.000
                </Text>
              </YStack>
            </YStack>
          </SectionCard>

          {/* Total Section */}
          <SectionCard>
            <YStack padding="$4" gap="$3">
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="$colorSubtle">
                  Subtotal Produk
                </Text>
                <Text fontSize="$3" color="$color">
                  Rp 50.000
                </Text>
              </XStack>
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$3" color="$colorSubtle">
                  Ongkir
                </Text>
                <Text fontSize="$3" color="$color">
                  Rp 15.000
                </Text>
              </XStack>
              <Separator />
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$4" fontWeight="700" color="$color">
                  Total
                </Text>
                <Text fontSize="$5" fontWeight="700" color="$primary">
                  Rp 65.000
                </Text>
              </XStack>
            </YStack>
          </SectionCard>

          {/* Action Button */}
          <YStack paddingHorizontal="$4" marginTop="$2">
            <Button size="$5" backgroundColor="$primary" color="white" fontWeight="600">
              Lacak Pengiriman
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </YStack>
  );
}
