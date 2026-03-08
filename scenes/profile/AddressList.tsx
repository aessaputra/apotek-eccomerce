import { useState, useCallback } from 'react';
import { FlatList, Alert, RefreshControl } from 'react-native';
import { YStack, Text, Spinner, useTheme } from 'tamagui';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Button from '@/components/elements/Button';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import AddressCard from '@/components/elements/AddressCard/AddressCard';
import AddressFormSheet from '@/components/AddressFormSheet';
import { useAppSlice } from '@/slices';
import { getAddresses, deleteAddress, setDefaultAddress } from '@/services/address.service';
import type { Address } from '@/types/address';
import { getThemeColor } from '@/utils/theme';
import {
  MIN_TOUCH_TARGET,
  BOTTOM_BAR_HEIGHT,
  BOTTOM_BAR_SHADOW,
  PRIMARY_BUTTON_TITLE_STYLE,
} from '@/constants/ui';
import { MapPinIcon } from '@/components/icons';

export default function AddressList() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { user } = useAppSlice();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<Address | null>(null);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<string | undefined>(undefined);

  // Use theme-aware background with light mode default fallback (#FFFFFF)
  const bgColor = getThemeColor(theme, 'background');
  const bottomBarHeight = BOTTOM_BAR_HEIGHT + insets.bottom;
  const scrollPaddingBottom = bottomBarHeight + 16;

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

  // Refresh addresses when screen comes into focus (including initial mount)
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

  // Open sheet for editing
  const handleEdit = useCallback((addressId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingAddressId(addressId);
    setSheetOpen(true);
  }, []);

  // Open sheet for creating new address
  const handleAddAddress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setEditingAddressId(undefined);
    setSheetOpen(true);
  }, []);

  // Handle successful save
  const handleSheetSuccess = useCallback(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Estimated item height for FlatList optimization
  // Card padding: $4 (16px) top + bottom = 32px
  // Content: ~88px (nama + phone + alamat text)
  // Margin bottom: $3 (12px)
  // Total: ~132px per item
  const ITEM_HEIGHT = 132;

  const getItemLayout = useCallback(
    (_data: ArrayLike<Address> | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Address }) => (
      <AddressCard
        address={item}
        isDefault={item.is_default ?? false}
        showActions={true}
        onEdit={() => handleEdit(item.id)}
        onDelete={() => handleDelete(item)}
        onSetDefault={!item.is_default ? () => handleSetDefault(item.id) : undefined}
      />
    ),
    [handleEdit, handleDelete, handleSetDefault],
  );

  const renderEmpty = useCallback(() => {
    const colorPress = getThemeColor(theme, 'colorPress');
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical="$10" gap="$4">
        <MapPinIcon size={64} color={colorPress} />
        <Text
          fontSize="$6"
          fontWeight="700"
          color="$color"
          textAlign="center"
          fontFamily="$heading">
          Belum ada alamat pengiriman
        </Text>
        <Text fontSize="$4" color="$colorPress" textAlign="center" maxWidth={300} lineHeight="$4">
          Tambah alamat pengiriman untuk memudahkan proses checkout
        </Text>
        <Button
          title="Tambah Alamat"
          alignSelf="stretch"
          paddingVertical="$2"
          borderRadius="$3"
          minHeight={MIN_TOUCH_TARGET}
          backgroundColor="$primary"
          titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
          onPress={handleAddAddress}
          accessibilityLabel="Tambah alamat pengiriman baru"
          accessibilityHint="Membuka form untuk menambahkan alamat pengiriman baru"
        />
      </YStack>
    );
  }, [theme, handleAddAddress]);

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
        <YStack flex={1} alignItems="center" justifyContent="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
      <YStack flex={1}>
        <FlatList
          data={addresses}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          getItemLayout={getItemLayout}
          contentContainerStyle={{
            padding: 20,
            paddingBottom: addresses.length > 0 ? scrollPaddingBottom : 100,
            flexGrow: 1,
          }}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="Daftar alamat pengiriman"
          accessibilityRole="list"
        />

        {/* Sticky bottom bar: Tambah Alamat */}
        {addresses.length > 0 && (
          <YStack
            position="absolute"
            bottom={insets.bottom}
            left={0}
            right={0}
            backgroundColor="$background"
            borderTopWidth={1}
            borderColor="$borderColor"
            paddingHorizontal="$4"
            paddingTop="$2"
            paddingBottom={8 + insets.bottom}
            elevation={8}
            style={BOTTOM_BAR_SHADOW}>
            <Button
              title="Tambah Alamat"
              width="100%"
              paddingVertical="$2"
              borderRadius="$3"
              minHeight={MIN_TOUCH_TARGET}
              backgroundColor="$primary"
              titleStyle={PRIMARY_BUTTON_TITLE_STYLE}
              onPress={handleAddAddress}
              accessibilityLabel="Tambah alamat pengiriman baru"
              accessibilityHint="Membuka form untuk menambahkan alamat pengiriman baru"
            />
          </YStack>
        )}
      </YStack>

      {/* Address Form Sheet - replaces full-screen navigation */}
      <AddressFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        addressId={editingAddressId}
        onSuccess={handleSheetSuccess}
      />

      {/* Delete Confirmation Dialog */}
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
