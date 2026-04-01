import { useState, useCallback, useMemo } from 'react';
import { SectionList, Alert, RefreshControl } from 'react-native';
import { YStack, Text, Spinner, useTheme, styled } from 'tamagui';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown, FadeOutLeft, Layout } from 'react-native-reanimated';

import Button from '@/components/elements/Button';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import SwipeableAddressRow from '@/components/elements/AddressCard/SwipeableAddressRow';
import { useAppSlice } from '@/slices';
import { getAddresses, deleteAddress, setDefaultAddress } from '@/services/address.service';
import type { Address } from '@/types/address';
import type { TypedHref } from '@/types/routes.types';
import {
  MIN_TOUCH_TARGET,
  BOTTOM_BAR_HEIGHT,
  PRIMARY_BUTTON_TITLE_STYLE,
  getBottomBarShadow,
} from '@/constants/ui';
import { MapPinIcon } from '@/components/icons';
import {
  ENTRANCE_STAGGER_DELAY_MS,
  ENTRANCE_DURATION_MS,
  EXIT_DURATION_MS,
  EMPTY_STATE_ICON_SIZE,
  LIST_HORIZONTAL_PADDING,
} from '@/constants/address';
import { getThemeColor } from '@/utils/theme';

const ReanimatedView = Animated.View;

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

type AddressSection = {
  title: 'Alamat Default' | 'Alamat Lainnya';
  data: Address[];
};

export default function AddressList() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAppSlice();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);

  const bottomBarHeight = BOTTOM_BAR_HEIGHT + insets.bottom;
  const scrollPaddingBottom = bottomBarHeight + 16;
  const emptyStatePaddingBottom = 100;
  const bottomCtaInset = 8;

  const loadAddresses = useCallback(async () => {
    if (!user?.id) return;
    const { data, error } = await getAddresses(user.id);
    if (error) {
      Alert.alert('Error', 'Gagal memuat alamat: ' + error.message);
    } else {
      setAddresses(data || []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
    }, [loadAddresses]),
  );

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadAddresses();
  }, [loadAddresses]);

  const handleDelete = useCallback((address: Address) => {
    setAddressToDelete(address);
    setDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!user?.id || !addressToDelete) return;
    const { error } = await deleteAddress(addressToDelete.id, user.id);
    if (error) {
      Alert.alert('Error', 'Gagal menghapus alamat: ' + error.message);
    } else {
      loadAddresses();
    }
    setAddressToDelete(null);
  }, [user?.id, addressToDelete, loadAddresses]);

  const handleSetDefault = useCallback(
    async (addressId: string) => {
      if (!user?.id) return;
      const { error } = await setDefaultAddress(addressId, user.id);
      if (error) {
        Alert.alert('Error', 'Gagal mengatur alamat default: ' + error.message);
      } else {
        loadAddresses();
      }
    },
    [user?.id, loadAddresses],
  );

  const handleEdit = useCallback(
    (addressId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const addressFormHref: TypedHref = {
        pathname: '/profile/address-form',
        params: { id: addressId },
      };
      router.push(addressFormHref);
    },
    [router],
  );

  const handleAddAddress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/profile/address-form');
  }, [router]);

  const defaultAddress = addresses.find(a => a.is_default);
  const otherAddresses = addresses.filter(a => !a.is_default);

  const sections: AddressSection[] = [];
  if (defaultAddress) {
    sections.push({ title: 'Alamat Default', data: [defaultAddress] });
  }
  if (otherAddresses.length > 0) {
    sections.push({ title: 'Alamat Lainnya', data: otherAddresses });
  }

  const listContentContainerStyle = useMemo(
    () => ({
      padding: LIST_HORIZONTAL_PADDING,
      paddingBottom: addresses.length > 0 ? scrollPaddingBottom : emptyStatePaddingBottom,
      flexGrow: 1,
    }),
    [addresses.length, scrollPaddingBottom],
  );

  const renderSectionHeader = useCallback(({ section }: { section: AddressSection }) => {
    if (section.data.length === 0) return null;
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

      return (
        <ReanimatedView
          entering={FadeInDown.delay(animationIndex * ENTRANCE_STAGGER_DELAY_MS).duration(
            ENTRANCE_DURATION_MS,
          )}
          exiting={FadeOutLeft.duration(EXIT_DURATION_MS)}
          layout={Layout.springify()}>
          <SwipeableAddressRow
            address={item}
            isDefault={item.is_default ?? false}
            onPress={() => handleEdit(item.id)}
            onEdit={() => handleEdit(item.id)}
            onDelete={() => handleDelete(item)}
            onSetDefault={!item.is_default ? () => handleSetDefault(item.id) : undefined}
          />
        </ReanimatedView>
      );
    },
    [handleEdit, handleDelete, handleSetDefault, defaultAddress],
  );

  const renderEmpty = useCallback(() => {
    return (
      <YStack flex={1} ai="center" jc="center" py="$10" gap="$4">
        <MapPinIcon size={EMPTY_STATE_ICON_SIZE} color="$primary" />
        <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
          Belum ada alamat tersimpan
        </Text>
        <Text fontSize="$4" color="$colorPress" textAlign="center" maxWidth={300} lineHeight="$4">
          Tambahkan alamat pengiriman agar checkout lebih cepat dan mudah
        </Text>
        <Button
          title="Tambah Alamat"
          alignSelf="stretch"
          py="$2"
          borderRadius="$3"
          minHeight={MIN_TOUCH_TARGET}
          backgroundColor="$primary"
          titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
          onPress={handleAddAddress}
          elevation={2}
          aria-label="Tambah alamat pengiriman baru"
          aria-describedby="Membuka form untuk menambahkan alamat pengiriman baru"
        />
      </YStack>
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

  const themePrimary = getThemeColor(theme, 'primary');

  return (
    <SafeAreaView edges={['top']}>
      <YStack flex={1}>
        <SectionList<Address, AddressSection>
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={item => item.id}
          contentContainerStyle={listContentContainerStyle}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={themePrimary}
              colors={[themePrimary]}
            />
          }
          showsVerticalScrollIndicator={false}
          aria-label="Daftar alamat pengiriman"
          role="list"
        />

        {addresses.length > 0 && (
          <YStack
            position="absolute"
            bottom={insets.bottom}
            left={0}
            right={0}
            backgroundColor="$background"
            px="$4"
            pt="$2"
            pb={bottomCtaInset + insets.bottom}
            elevation={8}
            borderTopWidth={1}
            borderTopColor="$borderColor"
            style={getBottomBarShadow(getThemeColor(theme, 'shadowColor'))}>
            <Button
              title="Tambah Alamat"
              width="100%"
              py="$2"
              borderRadius="$3"
              minHeight={MIN_TOUCH_TARGET}
              backgroundColor="$primary"
              titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
              onPress={handleAddAddress}
              aria-label="Tambah alamat pengiriman baru"
              aria-describedby="Membuka form untuk menambahkan alamat pengiriman baru"
            />
          </YStack>
        )}
      </YStack>

      <AppAlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Hapus Alamat"
        description={`Yakin ingin menghapus alamat ${addressToDelete?.receiver_name ?? ''}?`}
        cancelText="Batal"
        confirmText="Hapus"
        confirmColor="$danger"
        onConfirm={handleConfirmDelete}
      />
    </SafeAreaView>
  );
}
