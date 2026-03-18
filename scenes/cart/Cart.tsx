import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefreshCw } from '@tamagui/lucide-icons';
import {
  YStack,
  XStack,
  Text,
  useTheme,
  Card,
  Spinner,
  Separator,
  ScrollView,
  Button as TamaguiButton,
} from 'tamagui';
import { WebView } from 'react-native-webview';
import * as Crypto from 'expo-crypto';
import { getThemeColor } from '@/utils/theme';
import { CartIcon } from '@/components/icons';
import AddressCard from '@/components/elements/AddressCard/AddressCard';
import Button from '@/components/elements/Button';
import { CartItemRow } from '@/components/elements/CartItemRow/CartItemRow';
import { CartSummary } from '@/components/elements/CartSummary/CartSummary';
import { StickyBottomBar } from '@/components/elements/StickyBottomBar/StickyBottomBar';
import { EmptyCartState } from '@/components/elements/EmptyCartState/EmptyCartState';
import { CartLoadingSkeleton } from '@/components/elements/CartLoadingSkeleton/CartLoadingSkeleton';
import { useAppSlice } from '@/slices';
import { DataPersistKeys, useDataPersist } from '@/hooks/useDataPersist';
import { getAddresses } from '@/services/address.service';
import { getCartWithItems, updateCartItemQuantity, removeCartItem } from '@/services/cart.service';
import { getShippingRatesForAddress } from '@/services/shipping.service';
import {
  createCheckoutOrder,
  createSnapToken,
  pollOrderPaymentStatus,
} from '@/services/checkout.service';
import type { Address } from '@/types/address';
import type { CartItemWithProduct, CartSnapshot } from '@/types/cart';
import type { ShippingOption } from '@/types/shipping';
import { BOTTOM_BAR_HEIGHT } from '@/constants/ui';

interface PersistedCheckoutSession {
  fingerprint: string;
  idempotency_key: string;
  order_id: string | null;
}

const EMPTY_CART: CartSnapshot = {
  itemCount: 0,
  estimatedWeightGrams: 0,
  packageValue: 0,
};

const DEFAULT_ITEM_WEIGHT_GRAMS = 200;
const QUANTITY_SYNC_DEBOUNCE_MS = 400;

export default function Cart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAppSlice();
  const { getPersistData, setPersistData, removePersistData } = useDataPersist();
  const subtleColor = getThemeColor(theme, 'colorPress');
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [cartSnapshot, setCartSnapshot] = useState<CartSnapshot>(EMPTY_CART);
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingKey, setSelectedShippingKey] = useState<string | null>(null);
  const [quoteDestinationAreaId, setQuoteDestinationAreaId] = useState<string | null>(null);
  const [quoteDestinationPostalCode, setQuoteDestinationPostalCode] = useState<number | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string | null>(null);
  const quantitySyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQuantityUpdatesRef = useRef<Map<string, number>>(new Map());
  const confirmedQuantitiesRef = useRef<Map<string, number>>(new Map());
  const previousSelectedAddressIdRef = useRef<string | null>(null);

  const computeCartSnapshot = useCallback((items: CartItemWithProduct[]): CartSnapshot => {
    let itemCount = 0;
    let estimatedWeightGrams = 0;
    let packageValue = 0;

    for (const item of items) {
      itemCount += item.quantity;
      estimatedWeightGrams += item.quantity * (item.product.weight || DEFAULT_ITEM_WEIGHT_GRAMS);
      packageValue += item.quantity * item.product.price;
    }

    return {
      itemCount,
      estimatedWeightGrams,
      packageValue,
    };
  }, []);

  const updateCartState = useCallback(
    (updater: (items: CartItemWithProduct[]) => CartItemWithProduct[]) => {
      setCartItems(currentItems => {
        const nextItems = updater(currentItems);
        setCartSnapshot(computeCartSnapshot(nextItems));
        return nextItems;
      });
    },
    [computeCartSnapshot],
  );

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

  const checkoutFingerprint = useMemo(
    () =>
      [
        user?.id ?? '',
        selectedAddressId ?? '',
        selectedShippingKey ?? '',
        cartSnapshot.itemCount,
        cartSnapshot.estimatedWeightGrams,
        cartSnapshot.packageValue,
      ].join('|'),
    [
      cartSnapshot.estimatedWeightGrams,
      cartSnapshot.itemCount,
      cartSnapshot.packageValue,
      selectedAddressId,
      selectedShippingKey,
      user?.id,
    ],
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

  const loadCartData = useCallback(async () => {
    if (!user?.id) {
      setCartItems([]);
      setCartSnapshot(EMPTY_CART);
      return;
    }

    setLoadingCart(true);

    const { data, error } = await getCartWithItems(user.id);
    setLoadingCart(false);

    if (error) {
      setShippingError(error.message);
      return;
    }

    if (data) {
      setCartItems(data.items);
      setCartSnapshot(data.snapshot);
      confirmedQuantitiesRef.current = new Map(data.items.map(item => [item.id, item.quantity]));
    }
  }, [user?.id]);

  const flushPendingQuantityUpdates = useCallback(async () => {
    const pendingUpdates = Array.from(pendingQuantityUpdatesRef.current.entries());
    pendingQuantityUpdatesRef.current.clear();

    if (pendingUpdates.length === 0) {
      return;
    }

    const results = await Promise.all(
      pendingUpdates.map(async ([cartItemId, quantity]) => {
        const result = await updateCartItemQuantity(cartItemId, quantity);
        return {
          cartItemId,
          quantity,
          error: result.error,
        };
      }),
    );

    for (const result of results) {
      if (result.error) {
        const fallbackQuantity = confirmedQuantitiesRef.current.get(result.cartItemId);
        if (fallbackQuantity != null) {
          updateCartState(items =>
            items.map(item =>
              item.id === result.cartItemId ? { ...item, quantity: fallbackQuantity } : item,
            ),
          );
        }
        setShippingError(result.error.message);
        continue;
      }

      confirmedQuantitiesRef.current.set(result.cartItemId, result.quantity);
    }
  }, [updateCartState]);

  useFocusEffect(
    useCallback(() => {
      loadAddresses();
      loadCartData();
    }, [loadAddresses, loadCartData]),
  );

  const handleQuantityChange = useCallback(
    async (cartItemId: string, newQuantity: number) => {
      let itemExists = false;

      updateCartState(items =>
        items.map(item => {
          if (item.id !== cartItemId) {
            return item;
          }

          itemExists = true;
          if (item.quantity === newQuantity) {
            return item;
          }
          return { ...item, quantity: newQuantity };
        }),
      );

      if (!itemExists) {
        setShippingError('Produk keranjang tidak ditemukan. Silakan muat ulang halaman.');
        return;
      }

      pendingQuantityUpdatesRef.current.set(cartItemId, newQuantity);
      setShippingError(null);

      if (quantitySyncTimerRef.current) {
        clearTimeout(quantitySyncTimerRef.current);
      }

      quantitySyncTimerRef.current = setTimeout(() => {
        quantitySyncTimerRef.current = null;
        void flushPendingQuantityUpdates();
      }, QUANTITY_SYNC_DEBOUNCE_MS);
    },
    [flushPendingQuantityUpdates, updateCartState],
  );

  const handleRemoveItem = useCallback(
    async (cartItemId: string) => {
      pendingQuantityUpdatesRef.current.delete(cartItemId);
      confirmedQuantitiesRef.current.delete(cartItemId);

      const { error } = await removeCartItem(cartItemId);
      if (error) {
        setShippingError(error.message);
        return;
      }

      await loadCartData();
    },
    [loadCartData],
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
    setQuoteDestinationAreaId(data?.destination_area_id ?? null);
    setQuoteDestinationPostalCode(data?.destination_postal_code ?? null);

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
    router.push('/profile/addresses');
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    const hydrateCheckoutSession = async () => {
      if (!user?.id) {
        setCheckoutIdempotencyKey(null);
        setActiveOrderId(null);
        await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
        return;
      }

      const persisted = await getPersistData<PersistedCheckoutSession>(
        DataPersistKeys.CHECKOUT_SESSION,
      );

      if (!isMounted) {
        return;
      }

      if (persisted?.fingerprint === checkoutFingerprint) {
        setCheckoutIdempotencyKey(persisted.idempotency_key);
        setActiveOrderId(persisted.order_id);
        return;
      }

      setCheckoutIdempotencyKey(null);
      setActiveOrderId(null);
      await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
    };

    void hydrateCheckoutSession();

    return () => {
      isMounted = false;
    };
  }, [checkoutFingerprint, getPersistData, removePersistData, user?.id]);

  useEffect(() => {
    if (checkoutFingerprint == null) {
      return;
    }

    setShippingError(null);
    setShippingOptions([]);
    setSelectedShippingKey(null);
    setQuoteDestinationAreaId(null);
    setQuoteDestinationPostalCode(null);
    setCheckoutIdempotencyKey(null);
    setActiveOrderId(null);
    void removePersistData(DataPersistKeys.CHECKOUT_SESSION);
  }, [checkoutFingerprint, removePersistData]);

  useEffect(() => {
    return () => {
      if (quantitySyncTimerRef.current) {
        clearTimeout(quantitySyncTimerRef.current);
        quantitySyncTimerRef.current = null;
      }

      if (pendingQuantityUpdatesRef.current.size > 0) {
        void flushPendingQuantityUpdates();
      }
    };
  }, [flushPendingQuantityUpdates]);

  useEffect(() => {
    if (!selectedShippingKey) {
      return;
    }

    setCheckoutIdempotencyKey(null);
    setActiveOrderId(null);
    void removePersistData(DataPersistKeys.CHECKOUT_SESSION);
  }, [removePersistData, selectedShippingKey]);

  useEffect(() => {
    if (!selectedAddressId) {
      previousSelectedAddressIdRef.current = null;
      return;
    }

    if (previousSelectedAddressIdRef.current === selectedAddressId) {
      return;
    }

    previousSelectedAddressIdRef.current = selectedAddressId;

    if (cartSnapshot.itemCount > 0) {
      void handleCalculateShipping();
    }
  }, [cartSnapshot.itemCount, handleCalculateShipping, selectedAddressId]);

  const finalizePaymentFlow = useCallback(
    async (reason: 'success' | 'pending' | 'failed') => {
      setPaymentUrl(null);

      if (!activeOrderId) {
        router.push('/orders');
        return;
      }

      if (reason === 'failed') {
        setShippingError('Pembayaran dibatalkan atau gagal. Anda bisa coba lagi.');
        setCheckoutIdempotencyKey(null);
        setActiveOrderId(null);
        void removePersistData(DataPersistKeys.CHECKOUT_SESSION);
        router.push('/orders');
        return;
      }

      setConfirmingPayment(true);
      const { data, error } = await pollOrderPaymentStatus(activeOrderId, 12, 2000);
      setConfirmingPayment(false);

      if (error) {
        setShippingError(error.message);
      } else if (data?.payment_status === 'failed') {
        setShippingError('Pembayaran terdeteksi gagal. Silakan ulangi pembayaran.');
      } else if (data?.payment_status === 'success') {
        setShippingError(null);
      }

      setCheckoutIdempotencyKey(null);
      setActiveOrderId(null);
      void removePersistData(DataPersistKeys.CHECKOUT_SESSION);

      router.push('/orders');
    },
    [activeOrderId, removePersistData, router],
  );

  const handleStartCheckout = useCallback(async () => {
    setShippingError(null);

    if (!user?.id) {
      setShippingError('Silakan login terlebih dahulu.');
      return;
    }

    if (!selectedAddress) {
      setShippingError('Pilih alamat pengiriman terlebih dahulu.');
      return;
    }

    if (!selectedShippingOption) {
      setShippingError('Pilih kurir sebelum melanjutkan pembayaran.');
      return;
    }

    const currentIdempotencyKey = checkoutIdempotencyKey ?? Crypto.randomUUID();
    if (!checkoutIdempotencyKey) {
      setCheckoutIdempotencyKey(currentIdempotencyKey);
    }

    await setPersistData<PersistedCheckoutSession>(DataPersistKeys.CHECKOUT_SESSION, {
      fingerprint: checkoutFingerprint,
      idempotency_key: currentIdempotencyKey,
      order_id: activeOrderId,
    });

    setStartingCheckout(true);

    const { data: orderData, error: orderError } = await createCheckoutOrder({
      user_id: user.id,
      shipping_address_id: selectedAddress.id,
      destination_area_id: quoteDestinationAreaId ?? undefined,
      destination_postal_code: quoteDestinationPostalCode ?? undefined,
      shipping_option: selectedShippingOption,
      checkout_idempotency_key: currentIdempotencyKey,
    });

    if (orderError || !orderData) {
      setStartingCheckout(false);
      setShippingError(orderError?.message ?? 'Gagal membuat order checkout.');
      return;
    }

    setActiveOrderId(orderData.order_id);
    await setPersistData<PersistedCheckoutSession>(DataPersistKeys.CHECKOUT_SESSION, {
      fingerprint: checkoutFingerprint,
      idempotency_key: currentIdempotencyKey,
      order_id: orderData.order_id,
    });

    const { data: snapData, error: snapError } = await createSnapToken(orderData.order_id);
    setStartingCheckout(false);

    if (snapError || !snapData) {
      setShippingError(snapError?.message ?? 'Gagal memproses token pembayaran.');
      return;
    }

    setPaymentUrl(snapData.redirect_url);
  }, [
    activeOrderId,
    checkoutFingerprint,
    checkoutIdempotencyKey,
    quoteDestinationAreaId,
    quoteDestinationPostalCode,
    selectedAddress,
    selectedShippingOption,
    setPersistData,
    user?.id,
  ]);

  if (paymentUrl) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <XStack alignItems="center" justifyContent="space-between" padding="$3" gap="$2">
          <YStack flex={1} gap="$1">
            <Text fontSize="$5" fontWeight="700" color="$color" fontFamily="$heading">
              Pembayaran Midtrans
            </Text>
            <Text fontSize="$3" color="$colorPress">
              Selesaikan pembayaran lalu tunggu konfirmasi order secara otomatis.
            </Text>
          </YStack>
          <Button
            title="Tutup"
            backgroundColor="transparent"
            titleStyle={{ color: '$primary', fontWeight: '600' }}
            onPress={() => {
              void finalizePaymentFlow('pending');
            }}
            accessibilityLabel="Tutup pembayaran"
          />
        </XStack>

        {confirmingPayment ? (
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$3" padding="$4">
            <Spinner size="large" color="$primary" />
            <Text textAlign="center" color="$colorPress">
              Memastikan status pembayaran dari server. Mohon tunggu...
            </Text>
          </YStack>
        ) : (
          <WebView
            source={{ uri: paymentUrl }}
            style={{ flex: 1 }}
            onShouldStartLoadWithRequest={request => {
              const url = request.url || '';
              if (!url.startsWith('http://') && !url.startsWith('https://')) {
                return false;
              }

              const hasSettlement =
                url.includes('transaction_status=settlement') ||
                url.includes('transaction_status=capture');
              const hasPending = url.includes('transaction_status=pending');
              const hasFailed =
                url.includes('transaction_status=deny') ||
                url.includes('transaction_status=cancel') ||
                url.includes('transaction_status=expire');
              const reachedFinish =
                url.includes('example.com') ||
                url.includes('/finish') ||
                url.includes('/unfinish') ||
                url.includes('/error');

              if (reachedFinish || hasSettlement || hasPending || hasFailed) {
                if (hasFailed) {
                  void finalizePaymentFlow('failed');
                } else if (hasSettlement) {
                  void finalizePaymentFlow('success');
                } else {
                  void finalizePaymentFlow('pending');
                }

                return false;
              }

              return true;
            }}
            onNavigationStateChange={navState => {
              const url = navState.url || '';
              if (
                url.includes('transaction_status=settlement') ||
                url.includes('transaction_status=capture')
              ) {
                void finalizePaymentFlow('success');
              }
            }}
          />
        )}
      </YStack>
    );
  }

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
    <YStack flex={1} backgroundColor="$background" position="relative">
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: BOTTOM_BAR_HEIGHT + insets.bottom + 16 }}>
        <YStack gap="$4" padding="$4">
          {loadingCart ? (
            <CartLoadingSkeleton rowCount={3} />
          ) : cartItems.length === 0 ? (
            <EmptyCartState onBrowse={() => router.push('/')} />
          ) : (
            <>
              <Card bordered elevate size="$4">
                <Card.Header padded>
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Produk ({cartSnapshot.itemCount})
                  </Text>
                </Card.Header>
                <Separator />
                <YStack padding="$3" gap="$3">
                  {cartItems.map(item => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      onQuantityChange={handleQuantityChange}
                      onRemove={handleRemoveItem}
                    />
                  ))}
                </YStack>
              </Card>

              <Card bordered elevate size="$4">
                <Card.Header padded>
                  <Text fontSize="$4" fontWeight="600" color="$color">
                    Ringkasan Pesanan
                  </Text>
                </Card.Header>
                <Separator />
                <CartSummary
                  subtotal={cartSnapshot.packageValue}
                  shippingCost={selectedShippingOption?.price}
                  shippingName={selectedShippingOption?.courier_name}
                  itemCount={cartSnapshot.itemCount}
                  isLoadingShipping={loadingRates}
                />
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

              <XStack alignItems="center" justifyContent="space-between">
                <XStack alignItems="center" gap="$2">
                  <Text fontSize="$5" fontWeight="700" color="$color" fontFamily="$heading">
                    Opsi Pengiriman
                  </Text>
                  {loadingRates ? <Spinner size="small" color="$primary" /> : null}
                </XStack>

                {selectedAddressId &&
                (shippingError || shippingOptions.length === 0) &&
                !loadingRates ? (
                  <TamaguiButton
                    size="$2"
                    circular
                    backgroundColor="transparent"
                    borderWidth={1}
                    borderColor="$surfaceBorder"
                    color="$primary"
                    onPress={() => {
                      void handleCalculateShipping();
                    }}
                    icon={<RefreshCw size={14} color="$primary" />}
                    accessibilityLabel="Muat ulang ongkir"
                  />
                ) : null}
              </XStack>

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
                        selectedShippingKey === `${option.courier_code}-${option.service_code}`
                          ? 2
                          : 1
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
                    {selectedAddressId
                      ? 'Belum ada tarif ongkir untuk alamat ini.'
                      : 'Pilih alamat untuk melihat ongkir'}
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
                </YStack>
              ) : null}
            </>
          )}
        </YStack>
      </ScrollView>

      {cartItems.length > 0 ? (
        <StickyBottomBar
          grandTotal={cartSnapshot.packageValue + (selectedShippingOption?.price || 0)}
          isLoading={startingCheckout}
          disabled={!selectedShippingOption}
          onConfirm={handleStartCheckout}
          confirmText="Konfirmasi"
        />
      ) : null}
    </YStack>
  );
}
