import { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, SectionList } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { Card, Spinner, Text, XStack, YStack, styled, Button, useTheme } from 'tamagui';
import { ChevronRightIcon, MapPinIcon } from '@/components/icons';
import { useAppSlice } from '@/slices';
import { getAddresses } from '@/services/address.service';
import type { Address } from '@/types/address';
import {
  ENTRANCE_DURATION_MS,
  ENTRANCE_STAGGER_DELAY_MS,
  LIST_HORIZONTAL_PADDING,
} from '@/constants/address';
import { getThemeColor } from '@/utils/theme';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

const ReanimatedView = Animated.View;

type AddressSection = {
  title: 'Alamat Default' | 'Alamat Lainnya';
  data: Address[];
};

function resolveSelectedParam(value: string | string[] | undefined): string | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] : value;
}

export default function CartAddressPicker() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ selectedId?: string | string[] }>();
  const { user } = useAppSlice();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    resolveSelectedParam(params.selectedId),
  );

  const loadAddresses = useCallback(async () => {
    if (!user?.id) {
      setAddresses([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { data, error } = await getAddresses(user.id);
    if (error) {
      Alert.alert('Error', `Gagal memuat alamat: ${error.message}`);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const nextAddresses = data ?? [];
    const selectedFromParam = resolveSelectedParam(params.selectedId);
    setAddresses(nextAddresses);
    setSelectedAddressId(current => current ?? selectedFromParam ?? nextAddresses[0]?.id ?? null);
    setLoading(false);
    setRefreshing(false);
  }, [params.selectedId, user?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void loadAddresses();
    }, [loadAddresses]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadAddresses();
  }, [loadAddresses]);

  const handleSelectAddress = useCallback(
    (addressId: string) => {
      setSelectedAddressId(addressId);
      router.dismissTo({
        pathname: '/cart',
        params: { selectedId: addressId },
      });
    },
    [router],
  );

  const handleAddAddress = useCallback(() => {
    router.push('/profile/address-form');
  }, [router]);

  const defaultAddress = useMemo(() => addresses.find(address => address.is_default), [addresses]);
  const otherAddresses = useMemo(
    () => addresses.filter(address => !address.is_default),
    [addresses],
  );

  const sections = useMemo(() => {
    const result: AddressSection[] = [];
    if (defaultAddress) {
      result.push({ title: 'Alamat Default', data: [defaultAddress] });
    }

    if (otherAddresses.length > 0) {
      result.push({ title: 'Alamat Lainnya', data: otherAddresses });
    }

    return result;
  }, [defaultAddress, otherAddresses]);

  const renderSectionHeader = useCallback(({ section }: { section: AddressSection }) => {
    if (section.data.length === 0) {
      return null;
    }

    return (
      <Text
        fontSize="$3"
        fontWeight="600"
        color="$colorSubtle"
        textTransform="uppercase"
        letterSpacing={0.5}
        marginBottom="$2"
        marginTop="$3">
        {section.title}
      </Text>
    );
  }, []);

  const renderItem = useCallback(
    ({ item, index, section }: { item: Address; index: number; section: AddressSection }) => {
      const animationIndex =
        section.title === 'Alamat Lainnya' && defaultAddress ? index + 1 : index;
      const isSelected = item.id === selectedAddressId;
      const formattedAddress = [item.street_address, item.city, item.province, item.postal_code]
        .filter(Boolean)
        .join(', ');

      return (
        <ReanimatedView
          entering={FadeInDown.delay(animationIndex * ENTRANCE_STAGGER_DELAY_MS).duration(
            ENTRANCE_DURATION_MS,
          )}
          layout={Layout.springify()}>
          <Card
            bordered
            elevate
            borderRadius="$4"
            borderWidth={isSelected ? 2 : 1}
            borderColor={isSelected ? '$primary' : '$surfaceBorder'}
            backgroundColor="$surface"
            marginBottom="$3"
            onPress={() => handleSelectAddress(item.id)}>
            <Card.Header padded>
              <XStack alignItems="center" justifyContent="space-between" gap="$3">
                <YStack flex={1} gap="$1">
                  <Text fontSize="$4" color="$color" fontWeight="700" numberOfLines={1}>
                    {item.receiver_name}
                  </Text>
                  <Text fontSize="$3" color="$colorSubtle" numberOfLines={1}>
                    {item.phone_number}
                  </Text>
                </YStack>

                <XStack alignItems="center" gap="$2">
                  <YStack
                    width={20}
                    height={20}
                    borderRadius="$10"
                    borderWidth={2}
                    borderColor={isSelected ? '$primary' : '$surfaceBorder'}
                    alignItems="center"
                    justifyContent="center">
                    {isSelected ? (
                      <YStack
                        width={10}
                        height={10}
                        borderRadius="$10"
                        backgroundColor="$primary"
                      />
                    ) : null}
                  </YStack>
                  <ChevronRightIcon size={16} color="$colorSubtle" />
                </XStack>
              </XStack>
            </Card.Header>
            <Card.Footer padded>
              <Text color="$colorSubtle" numberOfLines={2}>
                {formattedAddress}
              </Text>
            </Card.Footer>
          </Card>
        </ReanimatedView>
      );
    },
    [defaultAddress, handleSelectAddress, selectedAddressId],
  );

  const renderEmpty = useCallback(() => {
    return (
      <Card
        borderRadius="$4"
        borderWidth={1}
        borderStyle="dashed"
        borderColor="$surfaceBorder"
        backgroundColor="$surface"
        padding="$4">
        <YStack gap="$3" alignItems="center">
          <MapPinIcon size={28} color="$primary" />
          <Text color="$color" fontWeight="600">
            Belum ada alamat
          </Text>
          <Button
            backgroundColor="$primary"
            color="$white"
            borderRadius="$3"
            minHeight={44}
            onPress={handleAddAddress}>
            Tambah Alamat
          </Button>
        </YStack>
      </Card>
    );
  }, [handleAddAddress]);

  if (loading) {
    return (
      <SafeAreaView edges={['top']}>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']}>
      <SectionList<Address, AddressSection>
        sections={sections}
        keyExtractor={item => item.id}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{
          padding: LIST_HORIZONTAL_PADDING,
          paddingBottom: 24,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={getThemeColor(theme, 'primary')}
            colors={[getThemeColor(theme, 'primary')]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
