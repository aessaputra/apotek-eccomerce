import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { YStack, XStack, Text, useTheme, Card, Spinner } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { CartIcon, MapPinIcon } from '@/components/icons';
import AddressCard from '@/components/elements/AddressCard/AddressCard';
import Button from '@/components/elements/Button';
import { useAppSlice } from '@/slices';
import { getAddresses } from '@/services/address.service';
import { getShippingRatesForAddress } from '@/services/shipping.service';
import type { Address } from '@/types/address';
import type { ShippingOption } from '@/types/shipping';
import type { Tables } from '@/types/supabase';
import { supabase } from '@/utils/supabase';

const DEFAULT_PRODUCT_WEIGHT_GRAMS = 200;

interface CartSnapshot {
  itemCount: number;
  estimatedWeightGrams: number;
  packageValue: number;
}

const EMPTY_CART: CartSnapshot = {
  itemCount: 0,
  estimatedWeightGrams: 0,
  packageValue: 0,
};

export default function Cart() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const subtleColor = getThemeColor(theme, 'colorPress');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [cartSnapshot, setCartSnapshot] = useState<CartSnapshot>(EMPTY_CART);
  const [loadingCart, setLoadingCart] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingKey, setSelectedShippingKey] = useState<string | null>(null);

  const selectedAddress = useMemo(
    () => addresses.find(address => address.id === selectedAddressId) ?? null,
    [addresses, selectedAddressId],
  );

  const selectedShippingOption = useMemo(
    () =>
      shippingOptions.find(
        option => `${option.courier_code}-${option.service_code}` === selectedShippingKey,
      ) ?? null,
    [shippingOptions, selectedShippingKey],
  );

  const loadAddresses = useCallback(async () => {
    if (!user?.id) {
      setAddresses([]);
      setSelectedAddressId(null);
      return;
    }

    setLoadingAddresses(true);

    const { data, error } = await getAddresses(user.id);
    setLoadingAddresses(false);

    if (error) {
      setShippingError(error.message);
      return;
    }

    const nextAddresses = data ?? [];
    setAddresses(nextAddresses);
    setSelectedAddressId(current => current ?? nextAddresses[0]?.id ?? null);
  }, [user?.id]);

  const loadCartSnapshot = useCallback(async () => {
    if (!user?.id) {
      setCartSnapshot(EMPTY_CART);
      return;
    }

    setLoadingCart(true);

    const { data: cartRows, error: cartError } = await supabase
      .from('carts')
      .select('id')
      .eq('user_id', user.id)
      .limit(1);

    if (cartError) {
      setLoadingCart(false);
      setShippingError(cartError.message);
      return;
    }

    const cartId = cartRows?.[0]?.id;
    if (!cartId) {
      setLoadingCart(false);
      setCartSnapshot(EMPTY_CART);
      return;
    }

    const { data: cartItems, error: itemError } = await supabase
      .from('cart_items')
      .select('product_id, quantity')
      .eq('cart_id', cartId);

    if (itemError) {
      setLoadingCart(false);
      setShippingError(itemError.message);
      return;
    }

    const typedItems = (cartItems || []) as Pick<Tables<'cart_items'>, 'product_id' | 'quantity'>[];
    const productIds = typedItems.map(item => item.product_id).filter(Boolean) as string[];

    let products: Pick<Tables<'products'>, 'id' | 'price'>[] = [];

    if (productIds.length > 0) {
      const { data: productRows, error: productError } = await supabase
        .from('products')
        .select('id, price')
        .in('id', productIds);

      if (productError) {
        setLoadingCart(false);
        setShippingError(productError.message);
        return;
      }

      products = (productRows || []) as Pick<Tables<'products'>, 'id' | 'price'>[];
    }

    const productMap = new Map(products.map(product => [product.id, product]));
    const itemCount = typedItems.reduce((total, item) => total + item.quantity, 0);
    const packageValue = typedItems.reduce((total, item) => {
      if (!item.product_id) {
        return total;
      }

      const product = productMap.get(item.product_id);
      return total + (product?.price || 0) * item.quantity;
    }, 0);

    setLoadingCart(false);
    setCartSnapshot({
      itemCount,
      packageValue,
      estimatedWeightGrams: itemCount * DEFAULT_PRODUCT_WEIGHT_GRAMS,
    });
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
      loadCartSnapshot();
    }, [loadAddresses, loadCartSnapshot]),
  );

  const formatRupiah = useCallback((amount: number): string => {
    return `Rp ${amount.toLocaleString('id-ID')}`;
  }, []);

  const handleCalculateShipping = useCallback(async () => {
    setShippingError(null);
    setShippingOptions([]);
    setSelectedShippingKey(null);

    if (!selectedAddress) {
      setShippingError('Pilih alamat pengiriman terlebih dahulu.');
      return;
    }

    if (cartSnapshot.estimatedWeightGrams <= 0 || cartSnapshot.itemCount <= 0) {
      setShippingError('Keranjang kosong. Tambahkan produk sebelum menghitung ongkir.');
      return;
    }

    setLoadingRates(true);
    const { data, error } = await getShippingRatesForAddress({
      address: selectedAddress,
      package_weight_grams: cartSnapshot.estimatedWeightGrams,
      package_value: cartSnapshot.packageValue,
      package_name: `Checkout package (${cartSnapshot.itemCount} item)`,
    });
    setLoadingRates(false);

    if (error) {
      setShippingError(error.message);
      return;
    }

    const options = data?.options ?? [];
    setShippingOptions(options);

    if (options.length === 0) {
      setShippingError('Tidak ada layanan kurir yang tersedia untuk alamat ini.');
    }
  }, [
    cartSnapshot.estimatedWeightGrams,
    cartSnapshot.itemCount,
    cartSnapshot.packageValue,
    selectedAddress,
  ]);

  const handleManageAddresses = useCallback(() => {
    router.push('/(main)/(tabs)/profile/addresses');
  }, [router]);

  useEffect(() => {
    setShippingError(null);
    setShippingOptions([]);
    setSelectedShippingKey(null);
  }, [
    selectedAddressId,
    cartSnapshot.estimatedWeightGrams,
    cartSnapshot.itemCount,
    cartSnapshot.packageValue,
  ]);

  if (!user) {
    return (
      <YStack
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$background"
        padding="$5"
        gap="$4">
        <CartIcon size={64} color={subtleColor} />
        <Text
          fontSize="$6"
          fontWeight="700"
          color="$color"
          textAlign="center"
          fontFamily="$heading">
          Login Terlebih Dahulu
        </Text>
        <Text fontSize="$4" color="$colorPress" textAlign="center" maxWidth={300} lineHeight="$4">
          Masuk ke akun Anda untuk menghitung ongkir berdasarkan alamat tersimpan.
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background" padding="$4" gap="$3">
      <XStack alignItems="center" gap="$2">
        <MapPinIcon size={20} color={subtleColor} />
        <Text fontSize="$6" fontWeight="700" color="$color" fontFamily="$heading">
          Hitung Ongkir Checkout
        </Text>
      </XStack>

      <Text fontSize="$3" color="$colorPress">
        Pilih alamat tersimpan, lalu ambil tarif kurir dari Biteship berdasarkan ringkasan
        keranjang.
      </Text>

      <Card
        padding="$3"
        borderRadius="$4"
        borderWidth={1}
        borderColor="$surfaceBorder"
        backgroundColor="$surface">
        <YStack gap="$2">
          <Text fontSize="$4" fontWeight="600" color="$color">
            Ringkasan Paket Checkout
          </Text>
          {loadingCart ? (
            <XStack alignItems="center" gap="$2">
              <Spinner size="small" color="$primary" />
              <Text color="$colorPress">Memuat keranjang...</Text>
            </XStack>
          ) : (
            <YStack gap="$1">
              <Text color="$colorPress">Jumlah item: {cartSnapshot.itemCount}</Text>
              <Text color="$colorPress">
                Estimasi berat: {cartSnapshot.estimatedWeightGrams} gram
              </Text>
              <Text color="$colorPress">
                Nilai paket: {formatRupiah(cartSnapshot.packageValue)}
              </Text>
            </YStack>
          )}
          <Button
            title="Hitung Ongkir"
            onPress={handleCalculateShipping}
            isLoading={loadingRates}
            disabled={loadingCart || cartSnapshot.itemCount <= 0}
            paddingVertical="$2"
            borderRadius="$3"
            minHeight={44}
            accessibilityLabel="Hitung ongkir"
          />
        </YStack>
      </Card>

      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize="$5" fontWeight="700" color="$color" fontFamily="$heading">
          Alamat Pengiriman
        </Text>
        <Button
          title="Kelola"
          backgroundColor="transparent"
          titleStyle={{ color: '$primary', fontWeight: '600' }}
          onPress={handleManageAddresses}
          accessibilityLabel="Kelola alamat"
        />
      </XStack>

      {loadingAddresses ? (
        <YStack alignItems="center" justifyContent="center" paddingVertical="$5">
          <Spinner size="large" color="$primary" />
        </YStack>
      ) : addresses.length === 0 ? (
        <YStack
          borderRadius="$4"
          borderWidth={1}
          borderColor="$surfaceBorder"
          padding="$4"
          backgroundColor="$surface"
          gap="$2">
          <Text fontSize="$4" color="$color">
            Belum ada alamat pengiriman.
          </Text>
          <Button
            title="Tambah Alamat"
            onPress={handleManageAddresses}
            paddingVertical="$2"
            borderRadius="$3"
            minHeight={44}
            accessibilityLabel="Tambah alamat"
          />
        </YStack>
      ) : (
        <YStack gap="$1">
          {addresses.map(address => (
            <Card
              key={address.id}
              borderWidth={address.id === selectedAddressId ? 2 : 1}
              borderColor={address.id === selectedAddressId ? '$primary' : '$surfaceBorder'}
              borderRadius="$4"
              backgroundColor="$surface"
              onPress={() => setSelectedAddressId(address.id)}>
              <AddressCard address={address} isDefault={address.is_default ?? false} />
            </Card>
          ))}
        </YStack>
      )}

      <Text fontSize="$5" fontWeight="700" color="$color" fontFamily="$heading">
        Opsi Pengiriman
      </Text>

      {shippingError ? (
        <Card
          borderRadius="$4"
          borderWidth={1}
          borderColor="$danger"
          padding="$3"
          backgroundColor="$surface">
          <Text color="$danger">{shippingError}</Text>
        </Card>
      ) : null}

      {shippingOptions.length > 0 ? (
        <YStack gap="$2" paddingBottom="$2">
          {shippingOptions.map(option => (
            <Card
              key={`${option.courier_code}-${option.service_code}`}
              onPress={() =>
                setSelectedShippingKey(`${option.courier_code}-${option.service_code}`)
              }
              borderRadius="$4"
              borderWidth={
                selectedShippingKey === `${option.courier_code}-${option.service_code}` ? 2 : 1
              }
              borderColor={
                selectedShippingKey === `${option.courier_code}-${option.service_code}`
                  ? '$primary'
                  : '$surfaceBorder'
              }
              padding="$3"
              backgroundColor="$surface">
              <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
                <YStack flex={1} gap="$1">
                  <Text fontSize="$4" fontWeight="700" color="$color">
                    {option.courier_name} - {option.service_name}
                  </Text>
                  <Text fontSize="$3" color="$colorPress">
                    Kode: {option.courier_code.toUpperCase()} / {option.service_code}
                  </Text>
                  <Text fontSize="$3" color="$colorPress">
                    Estimasi: {option.estimated_delivery}
                  </Text>
                </YStack>
                <Text fontSize="$4" fontWeight="700" color="$primary">
                  {formatRupiah(option.price)}
                </Text>
              </XStack>
            </Card>
          ))}
        </YStack>
      ) : (
        <Card
          borderRadius="$4"
          borderWidth={1}
          borderColor="$surfaceBorder"
          padding="$3"
          backgroundColor="$surface">
          <Text color="$colorPress">
            Belum ada tarif. Tekan &quot;Hitung Ongkir&quot; untuk memuat opsi kurir.
          </Text>
        </Card>
      )}

      {shippingOptions.length > 0 ? (
        <YStack gap="$2">
          <Card
            borderRadius="$4"
            borderWidth={1}
            borderColor="$surfaceBorder"
            padding="$3"
            backgroundColor="$surface">
            <Text fontWeight="600" color="$color">
              Kurir terpilih:
            </Text>
            <Text color="$colorPress">
              {selectedShippingOption
                ? `${selectedShippingOption.courier_name} - ${selectedShippingOption.service_name} (${formatRupiah(selectedShippingOption.price)})`
                : 'Belum dipilih'}
            </Text>
          </Card>
          <Button
            title="Gunakan Kurir Terpilih"
            disabled={!selectedShippingOption}
            onPress={() => {
              if (!selectedShippingOption) {
                return;
              }
              router.push('/(main)/(tabs)/orders');
            }}
            paddingVertical="$2"
            borderRadius="$3"
            minHeight={44}
            accessibilityLabel="Gunakan kurir terpilih"
          />
        </YStack>
      ) : null}
    </YStack>
  );
}
