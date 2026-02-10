import { useState, useEffect, useCallback } from 'react';
import { FlatList, Alert, RefreshControl } from 'react-native';
import { YStack, XStack, Text, Card, Spinner } from 'tamagui';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from '@/components/elements/Button';
import AddressCard from '@/components/elements/AddressCard/AddressCard';
import { useAppSlice } from '@/slices';
import { getAddresses, deleteAddress, setDefaultAddress } from '@/services/address.service';
import type { Address } from '@/types/address';
import { getThemeColor } from '@/utils/theme';
import { useTheme } from 'tamagui';

export default function AddressList() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bgColor = getThemeColor(theme, 'background', '#f8fafc');

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

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  // Refresh addresses when screen comes into focus (e.g., after adding/editing address)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadAddresses();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  const handleRefresh = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    loadAddresses();
  }, [loadAddresses]);

  const handleDelete = useCallback(
    (address: Address) => {
      Alert.alert('Hapus Alamat', `Yakin ingin menghapus alamat ${address.receiver_name}?`, [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setDeletingId(address.id);
            const { error } = await deleteAddress(address.id, user.id);
            setDeletingId(null);
            if (error) {
              Alert.alert('Error', 'Gagal menghapus alamat: ' + error.message);
            } else {
              loadAddresses();
            }
          },
        },
      ]);
    },
    [user?.id, loadAddresses],
  );

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
      router.push({
        pathname: '/(main)/(tabs)/profile/address-form',
        params: { id: addressId },
      });
    },
    [router],
  );

  // Estimated item height for FlatList optimization
  // Card padding: $4 (16px) top + bottom = 32px
  // Content: ~88px (nama + phone + alamat text)
  // Margin bottom: $3 (12px)
  // Total: ~132px per item
  const ITEM_HEIGHT = 132;

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({
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

  const renderEmpty = () => {
    const colorPress = getThemeColor(theme, 'colorPress', '#64748B');
    return (
      <YStack flex={1} alignItems="center" justifyContent="center" paddingVertical="$10" space="$4">
        <Ionicons name="location-outline" size={64} color={colorPress} />
        <Text fontSize="$5" fontWeight="600" color="$color" textAlign="center">
          Belum ada alamat pengiriman
        </Text>
        <Text fontSize="$3" color="$colorPress" textAlign="center" maxWidth={300}>
          Tambah alamat pengiriman untuk memudahkan proses checkout
        </Text>
        <Button
          title="Tambah Alamat"
          paddingVertical="$3"
          borderRadius="$2"
          height={48}
          backgroundColor="$primary"
          titleStyle={{ color: '$white', fontSize: 16 }}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/(main)/(tabs)/profile/address-form');
          }}
          accessibilityLabel="Tambah alamat pengiriman baru"
          accessibilityHint="Membuka form untuk menambahkan alamat pengiriman baru"
        />
      </YStack>
    );
  };

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
            paddingBottom: 100,
            flexGrow: 1,
          }}
          ListEmptyComponent={renderEmpty}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="Daftar alamat pengiriman"
          accessibilityRole="list"
        />

        {/* Floating Add Button */}
        {addresses.length > 0 && (
          <XStack position="absolute" bottom={20} left={20} right={20} justifyContent="center">
            <Button
              title="Tambah Alamat"
              paddingVertical="$3"
              borderRadius="$2"
              height={48}
              backgroundColor="$primary"
              titleStyle={{ color: '$white', fontSize: 16 }}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/(main)/(tabs)/profile/address-form');
              }}
              accessibilityLabel="Tambah alamat pengiriman baru"
              accessibilityHint="Membuka form untuk menambahkan alamat pengiriman baru"
            />
          </XStack>
        )}
      </YStack>
    </SafeAreaView>
  );
}
