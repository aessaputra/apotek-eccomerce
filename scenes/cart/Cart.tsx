import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  Sheet,
  Button as TamaguiButton,
} from 'tamagui';
import * as Crypto from 'expo-crypto';
import { getThemeColor } from '@/utils/theme';
import { CartIcon, ChevronRightIcon, MapPinIcon } from '@/components/icons';
import { CartItemRow } from '@/components/elements/CartItemRow/CartItemRow';
import { CartSummary } from '@/components/elements/CartSummary/CartSummary';
import { StickyBottomBar } from '@/components/elements/StickyBottomBar/StickyBottomBar';
import { EmptyCartState } from '@/components/elements/EmptyCartState/EmptyCartState';
import { CartLoadingSkeleton } from '@/components/elements/CartLoadingSkeleton/CartLoadingSkeleton';
import AddressCard from '@/components/elements/AddressCard';
import { useAppSlice } from '@/slices';
import { DataPersistKeys, useDataPersist } from '@/hooks/useDataPersist';
import { getAddress, getPreferredAddress, getAddresses } from '@/services/address.service';
import { getCartWithItems, updateCartItemQuantity, removeCartItem } from '@/services/cart.service';
import { getShippingRatesForAddress } from '@/services/shipping.service';
import { createCheckoutOrder, createSnapToken } from '@/services/checkout.service';
import { formatAddress, resolveBadgeText } from '@/utils/address';
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
const COURIER_CARD_PRESS_STYLE = {
  scale: 0.98,
  opacity: 0.9,
} as const;
const COURIER_CARD_ANIMATE_ONLY = ['transform', 'opacity'];

function translateCheckoutError(message: string | undefined, fallback: string): string {
  const normalized = (message || '').toLowerCase();

  if (
    normalized.includes('timeout') ||
    normalized.includes('timed out') ||
    normalized.includes('abort')
  ) {
    return 'Permintaan timeout. Pastikan koneksi stabil lalu coba lagi.';
  }

  if (
    normalized.includes('network') ||
    normalized.includes('fetch') ||
    normalized.includes('offline') ||
    normalized.includes('koneksi')
  ) {
    return 'Koneksi internet bermasalah. Silakan cek jaringan Anda lalu coba lagi.';
  }

  if (
    normalized.includes('midtrans') ||
    normalized.includes('snap') ||
    normalized.includes('payment')
  ) {
    return 'Layanan pembayaran sedang bermasalah. Silakan coba beberapa saat lagi.';
  }

  if (
    normalized.includes('database') ||
    normalized.includes('duplicate') ||
    normalized.includes('constraint')
  ) {
    return 'Terjadi kendala data saat checkout. Mohon ulangi beberapa saat lagi.';
  }

  return message?.trim() || fallback;
}

interface CourierOptionCardProps {
  option: ShippingOption;
  optionKey: string;
  isSelected: boolean;
  onSelect: (shippingKey: string) => void;
  formatRupiah: (amount: number) => string;
}

const CourierOptionCard = React.memo(function CourierOptionCard({
  option,
  optionKey,
  isSelected,
  onSelect,
  formatRupiah,
}: CourierOptionCardProps) {
  const handlePress = React.useCallback(() => {
    onSelect(optionKey);
  }, [onSelect, optionKey]);

  return (
    <Card
      onPress={handlePress}
      role="button"
      aria-label={`${option.courier_name} ${option.service_name} ${formatRupiah(option.price)}`}
      animation="quick"
      animateOnly={COURIER_CARD_ANIMATE_ONLY}
      pressStyle={COURIER_CARD_PRESS_STYLE}
      borderRadius="$4"
      borderWidth={2}
      borderColor={isSelected ? '$primary' : '$surfaceBorder'}
      padding="$3"
      backgroundColor="$surface">
      <XStack justifyContent="space-between" alignItems="flex-start" gap="$2">
        <YStack flex={1} gap="$0.5">
          <Text fontSize="$4" fontWeight="700" color="$color" numberOfLines={2}>
            {option.courier_name} - {option.service_name}
          </Text>
          <Text fontSize="$3" color="$colorSubtle">
            Estimasi: {option.estimated_delivery}
          </Text>
        </YStack>
        <Text fontSize="$4" fontWeight="700" color="$primary" flexShrink={0}>
          {formatRupiah(option.price)}
        </Text>
      </XStack>
    </Card>
  );
});

interface AddressCardSheetProps {
  address: Address;
  isSelected: boolean;
  onSelect: (addressId: string) => void;
}

const AddressCardSheet = React.memo(function AddressCardSheet({
  address,
  isSelected,
  onSelect,
}: AddressCardSheetProps) {
  const handlePress = React.useCallback(() => {
    onSelect(address.id);
  }, [address.id, onSelect]);

  return (
    <AddressCard
      address={address}
      selected={isSelected}
      badgeText={resolveBadgeText(address)}
      onPress={handlePress}
    />
  );
});

export default function Cart() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { user } = useAppSlice();
  const { getPersistData, setPersistData, removePersistData } = useDataPersist();
  const subtleColor = getThemeColor(theme, 'colorPress');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [loadingSelectedAddress, setLoadingSelectedAddress] = useState(false);
  const [cartSnapshot, setCartSnapshot] = useState<CartSnapshot>(EMPTY_CART);
  const [cartItems, setCartItems] = useState<CartItemWithProduct[]>([]);
  const [loadingCart, setLoadingCart] = useState(false);
  const [loadingRates, setLoadingRates] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShippingKey, setSelectedShippingKey] = useState<string | null>(null);
  const [shippingSheetOpen, setShippingSheetOpen] = useState(false);
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [availableAddresses, setAvailableAddresses] = useState<Address[]>([]);
  const [quoteDestinationAreaId, setQuoteDestinationAreaId] = useState<string | null>(null);
  const [quoteDestinationPostalCode, setQuoteDestinationPostalCode] = useState<number | null>(null);
  const [startingCheckout, setStartingCheckout] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkoutIdempotencyKey, setCheckoutIdempotencyKey] = useState<string | null>(null);
  const quantitySyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQuantityUpdatesRef = useRef<Map<string, number>>(new Map());
  const confirmedQuantitiesRef = useRef<Map<string, number>>(new Map());
  const previousSelectedAddressIdRef = useRef<string | null>(null);
  const shouldOpenShippingSheetRef = useRef(false);
  const cartMountedRef = useRef(true);
  const checkoutInProgressRef = useRef(false);

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

  const selectedShippingOption = useMemo(
    () =>
      shippingOptions.find(
        option => `${option.courier_code}-${option.service_code}` === selectedShippingKey,
      ) ?? null,
    [shippingOptions, selectedShippingKey],
  );

  const selectedAddressFullText = useMemo(() => {
    if (!selectedAddress) {
      return '';
    }

    return formatAddress(selectedAddress);
  }, [selectedAddress]);

  const resetShippingSelection = useCallback(() => {
    shouldOpenShippingSheetRef.current = false;
    setSelectedShippingKey(null);
    setShippingOptions([]);
    setQuoteDestinationAreaId(null);
    setQuoteDestinationPostalCode(null);
  }, []);

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
      return;
    }
  }, [user?.id]);

  const loadAddressesForSheet = useCallback(async () => {
    if (!user?.id) {
      setAvailableAddresses([]);
      setLoadingAddresses(false);
      return;
    }

    setLoadingAddresses(true);
    const { data, error } = await getAddresses(user.id);
    setLoadingAddresses(false);

    if (error) {
      setShippingError(`Gagal memuat alamat: ${error.message}`);
      return;
    }

    setAvailableAddresses(data ?? []);
  }, [user?.id]);

  const flushPendingQuantityUpdates = useCallback(
    async ({ skipStateUpdates = false }: { skipStateUpdates?: boolean } = {}) => {
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
        const allowStateUpdates = cartMountedRef.current && !skipStateUpdates;

        if (result.error) {
          const fallbackQuantity = confirmedQuantitiesRef.current.get(result.cartItemId);
          if (fallbackQuantity != null && allowStateUpdates) {
            updateCartState(items =>
              items.map(item =>
                item.id === result.cartItemId ? { ...item, quantity: fallbackQuantity } : item,
              ),
            );
          }

          if (allowStateUpdates) {
            setShippingError(result.error.message);
          }

          continue;
        }

        confirmedQuantitiesRef.current.set(result.cartItemId, result.quantity);
      }
    },
    [updateCartState],
  );

  useFocusEffect(
    useCallback(() => {
      loadCartData();
    }, [loadCartData]),
  );

  useEffect(() => {
    let isMounted = true;

    const hydrateSelectedAddress = async () => {
      if (!user?.id || selectedAddressId) {
        return;
      }

      setLoadingSelectedAddress(true);
      const { data, error } = await getPreferredAddress(user.id);

      if (!isMounted) {
        return;
      }

      setLoadingSelectedAddress(false);

      if (error) {
        setShippingError(error.message);
        return;
      }

      if (!data?.id) {
        setSelectedAddress(null);
        resetShippingSelection();
        return;
      }

      setSelectedAddressId(data.id);
    };

    void hydrateSelectedAddress();

    return () => {
      isMounted = false;
    };
  }, [resetShippingSelection, selectedAddressId, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const loadSelectedAddress = async () => {
      if (!selectedAddressId) {
        if (!isMounted) {
          return;
        }
        setSelectedAddress(null);
        resetShippingSelection();
        return;
      }

      setLoadingSelectedAddress(true);
      const { data, error } = await getAddress(selectedAddressId);

      if (!isMounted) {
        return;
      }

      setLoadingSelectedAddress(false);

      if (error || !data) {
        setSelectedAddress(null);
        resetShippingSelection();
        setShippingError(error?.message ?? 'Alamat pengiriman tidak ditemukan.');
        return;
      }

      setSelectedAddress(data);
    };

    void loadSelectedAddress();

    return () => {
      isMounted = false;
    };
  }, [resetShippingSelection, selectedAddressId]);

  const handleQuantityChange = useCallback(
    (cartItemId: string, newQuantity: number) => {
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

  const handleOpenAddressSheet = useCallback(() => {
    void loadAddressesForSheet();
    setAddressSheetOpen(true);
  }, [loadAddressesForSheet]);

  const handleSelectAddress = useCallback((addressId: string) => {
    setSelectedAddressId(addressId);
    setAddressSheetOpen(false);
  }, []);

  const handleSelectShippingKey = useCallback((shippingKey: string) => {
    setSelectedShippingKey(currentKey => (currentKey === shippingKey ? currentKey : shippingKey));
  }, []);

  const syncCheckoutSession = useCallback(async () => {
    if (!user?.id) {
      setCheckoutIdempotencyKey(null);
      setActiveOrderId(null);
      await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
      return;
    }

    const persisted = await getPersistData<PersistedCheckoutSession>(
      DataPersistKeys.CHECKOUT_SESSION,
    );

    if (!persisted) {
      setCheckoutIdempotencyKey(null);
      setActiveOrderId(null);
      return;
    }

    if (persisted.fingerprint === checkoutFingerprint) {
      setCheckoutIdempotencyKey(persisted.idempotency_key);
      setActiveOrderId(persisted.order_id);
      return;
    }

    setCheckoutIdempotencyKey(null);
    setActiveOrderId(null);
    await removePersistData(DataPersistKeys.CHECKOUT_SESSION);
  }, [checkoutFingerprint, getPersistData, removePersistData, user?.id]);

  useEffect(() => {
    void syncCheckoutSession();
  }, [syncCheckoutSession]);

  useFocusEffect(
    useCallback(() => {
      void syncCheckoutSession();
    }, [syncCheckoutSession]),
  );

  useEffect(() => {
    cartMountedRef.current = true;

    return () => {
      cartMountedRef.current = false;

      if (quantitySyncTimerRef.current) {
        clearTimeout(quantitySyncTimerRef.current);
        quantitySyncTimerRef.current = null;
      }

      if (pendingQuantityUpdatesRef.current.size > 0) {
        void flushPendingQuantityUpdates({ skipStateUpdates: true });
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
    if (!selectedAddress?.id) {
      previousSelectedAddressIdRef.current = null;
      resetShippingSelection();
      return;
    }

    if (previousSelectedAddressIdRef.current === selectedAddress.id) {
      return;
    }

    previousSelectedAddressIdRef.current = selectedAddress.id;

    resetShippingSelection();

    if (cartSnapshot.itemCount > 0) {
      void handleCalculateShipping();
    }
  }, [cartSnapshot.itemCount, handleCalculateShipping, resetShippingSelection, selectedAddress]);

  useEffect(() => {
    if (loadingRates || !shouldOpenShippingSheetRef.current) {
      return;
    }

    if (shippingOptions.length === 0) {
      if (shippingError) {
        shouldOpenShippingSheetRef.current = false;
      }

      return;
    }

    shouldOpenShippingSheetRef.current = false;

    setShippingSheetOpen(true);
  }, [loadingRates, shippingError, shippingOptions.length]);

  useEffect(() => {
    if (shippingOptions.length === 0 || selectedShippingKey !== null) {
      return;
    }

    const jne = shippingOptions.find(
      o => o.courier_code.toLowerCase() === 'jne' && o.service_code.toLowerCase() === 'reg',
    );

    if (jne) {
      setSelectedShippingKey(jne.courier_code + '-' + jne.service_code);
    }
  }, [shippingOptions, selectedShippingKey]);

  const handleStartCheckout = useCallback(async () => {
    if (checkoutInProgressRef.current) {
      return;
    }
    checkoutInProgressRef.current = true;

    setShippingError(null);
    setPaymentError(null);

    if (!user?.id) {
      setShippingError('Silakan login terlebih dahulu.');
      checkoutInProgressRef.current = false;
      return;
    }

    if (!selectedAddress) {
      setShippingError('Pilih alamat pengiriman terlebih dahulu.');
      checkoutInProgressRef.current = false;
      return;
    }

    if (!selectedShippingOption) {
      setShippingError('Pilih kurir sebelum melanjutkan pembayaran.');
      checkoutInProgressRef.current = false;
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
      checkoutInProgressRef.current = false;
      setShippingError(
        translateCheckoutError(
          orderError?.message,
          'Gagal membuat order checkout. Silakan coba lagi.',
        ),
      );
      return;
    }

    setCheckoutIdempotencyKey(orderData.checkout_idempotency_key);
    setActiveOrderId(orderData.order_id);
    await setPersistData<PersistedCheckoutSession>(DataPersistKeys.CHECKOUT_SESSION, {
      fingerprint: checkoutFingerprint,
      idempotency_key: orderData.checkout_idempotency_key,
      order_id: orderData.order_id,
    });

    const { data: snapData, error: snapError } = await createSnapToken(orderData.order_id);
    setStartingCheckout(false);

    if (snapError || !snapData) {
      checkoutInProgressRef.current = false;
      const errorMessage = translateCheckoutError(
        snapError?.message,
        'Gagal memproses pembayaran. Silakan coba lagi beberapa saat lagi.',
      );
      setPaymentError(errorMessage);
      setShippingError(errorMessage);
      return;
    }

    checkoutInProgressRef.current = false;
    router.push({
      pathname: '/cart/payment',
      params: {
        paymentUrl: snapData.redirectUrl,
        orderId: orderData.order_id,
      },
    });
  }, [
    activeOrderId,
    checkoutFingerprint,
    checkoutIdempotencyKey,
    quoteDestinationAreaId,
    quoteDestinationPostalCode,
    router,
    selectedAddress,
    selectedShippingOption,
    setPersistData,
    user?.id,
  ]);

  if (paymentError) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$5" gap="$4">
          <Card
            borderRadius="$4"
            borderWidth={1}
            borderColor="$danger"
            padding="$4"
            backgroundColor="$surface"
            maxWidth={400}
            width="100%">
            <YStack gap="$3" alignItems="center">
              <Text fontSize="$5" fontWeight="700" color="$danger" textAlign="center">
                Gagal Memproses Pembayaran
              </Text>
              <Text fontSize="$4" color="$color" textAlign="center">
                {paymentError}
              </Text>
              <TamaguiButton
                backgroundColor="$primary"
                color="$onPrimary"
                borderRadius="$3"
                minHeight={44}
                onPress={() => {
                  setPaymentError(null);
                  void handleStartCheckout();
                }}
                aria-label="Coba lagi pembayaran">
                Coba Lagi
              </TamaguiButton>
            </YStack>
          </Card>
        </YStack>
      </YStack>
    );
  }

  if (!user) {
    return (
      <YStack flex={1} backgroundColor="$background">
        <YStack flex={1} alignItems="center" justifyContent="center" padding="$5" gap="$4">
          <CartIcon size={64} color={subtleColor} />
          <Text fontSize="$6" fontWeight="700" color="$color" textAlign="center">
            Login Terlebih Dahulu
          </Text>
          <Text fontSize="$4" color="$colorPress" textAlign="center" maxWidth={300} lineHeight="$4">
            Masuk ke akun Anda untuk menghitung ongkir berdasarkan alamat tersimpan.
          </Text>
        </YStack>
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

              {loadingSelectedAddress ? (
                <YStack alignItems="center" justifyContent="center" paddingVertical="$5">
                  <Spinner size="large" color="$primary" />
                </YStack>
              ) : selectedAddress ? (
                <Card
                  bordered
                  elevate
                  size="$4"
                  backgroundColor="$surface"
                  borderColor="$surfaceBorder"
                  onPress={handleOpenAddressSheet}
                  aria-label="Ganti alamat pengiriman">
                  <XStack padding="$4" gap="$3" alignItems="center">
                    <XStack alignSelf="flex-start" marginTop="$1">
                      <MapPinIcon size={20} color="$primary" />
                    </XStack>

                    <YStack gap="$1" flex={1}>
                      <XStack alignItems="center" gap="$1" flex={1}>
                        <Text color="$color" fontWeight="700" numberOfLines={1}>
                          {selectedAddress.receiver_name}
                        </Text>
                        <Text color="$colorSubtle" fontSize="$3">
                          {' | '}
                        </Text>
                        <Text color="$colorSubtle" fontSize="$3" numberOfLines={1} flex={1}>
                          {selectedAddress.phone_number}
                        </Text>
                      </XStack>
                      <Text color="$colorSubtle" numberOfLines={2}>
                        {selectedAddressFullText}
                      </Text>
                    </YStack>

                    <XStack alignItems="center" justifyContent="center">
                      <ChevronRightIcon size={16} color="$colorSubtle" />
                    </XStack>
                  </XStack>
                </Card>
              ) : (
                <Card
                  borderRadius="$4"
                  borderWidth={1}
                  borderStyle="dashed"
                  borderColor="$surfaceBorder"
                  backgroundColor="$surface"
                  padding="$4">
                  <YStack gap="$3">
                    <XStack alignItems="center" gap="$2">
                      <MapPinIcon size={18} color="$primary" />
                      <Text color="$color" fontWeight="600">
                        Belum ada alamat
                      </Text>
                    </XStack>
                    <TamaguiButton
                      backgroundColor="$primary"
                      color="$onPrimary"
                      borderRadius="$3"
                      minHeight={44}
                      onPress={handleOpenAddressSheet}
                      aria-label="Tambah alamat pengiriman">
                      Tambah Alamat
                    </TamaguiButton>
                  </YStack>
                </Card>
              )}

              <Card
                bordered
                elevate
                size="$4"
                backgroundColor="$surface"
                borderColor="$surfaceBorder"
                onPress={() => {
                  if (loadingRates || !selectedAddressId) {
                    return;
                  }

                  if (shippingOptions.length === 0) {
                    shouldOpenShippingSheetRef.current = true;
                    void handleCalculateShipping();
                    return;
                  }

                  setShippingSheetOpen(true);
                }}>
                <Card.Header padded>
                  <XStack alignItems="center" justifyContent="space-between" gap="$3">
                    <Text fontSize="$4" fontWeight="600" color="$color" numberOfLines={1} flex={1}>
                      Opsi Pengiriman
                    </Text>
                    {loadingRates ? (
                      <Spinner size="small" color="$primary" />
                    ) : (
                      <ChevronRightIcon size={16} color="$colorSubtle" />
                    )}
                  </XStack>
                </Card.Header>

                <Separator />

                <XStack padding="$3" gap="$3" alignItems="center">
                  {selectedShippingOption ? (
                    <>
                      <YStack flex={1} gap="$0.5" minWidth={0}>
                        <Text color="$color" fontWeight="700" numberOfLines={1}>
                          {selectedShippingOption.courier_name} -{' '}
                          {selectedShippingOption.service_name}
                        </Text>
                        <Text color="$colorSubtle" fontSize="$3" numberOfLines={1}>
                          Estimasi: {selectedShippingOption.estimated_delivery}
                        </Text>
                      </YStack>
                      <Text color="$primary" fontWeight="700" flexShrink={0}>
                        {formatRupiah(selectedShippingOption.price)}
                      </Text>
                    </>
                  ) : (
                    <Text flex={1} color="$colorSubtle" fontWeight="500" textAlign="center">
                      Pilih Kurir
                    </Text>
                  )}
                </XStack>
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

              {shippingError && shippingOptions.length === 0 && !loadingRates ? (
                <XStack justifyContent="flex-end" marginTop="$-2">
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
                    aria-label="Muat ulang ongkir"
                  />
                </XStack>
              ) : null}

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
            </>
          )}
        </YStack>
      </ScrollView>

      {/* Shipping Options Sheet */}
      <Sheet
        modal
        dismissOnOverlayPress
        dismissOnSnapToBottom
        moveOnKeyboardChange
        snapPoints={[60]}
        open={shippingSheetOpen}
        onOpenChange={setShippingSheetOpen}
        animation="medium"
        animationConfig={{
          type: 'spring',
          damping: 24,
          mass: 0.9,
          stiffness: 200,
        }}>
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="$sheetOverlay"
        />
        <Sheet.Handle />
        <Sheet.Frame
          backgroundColor="$surfaceSubtle"
          borderTopLeftRadius="$6"
          borderTopRightRadius="$6">
          <YStack flex={1}>
            <YStack px="$4" pt="$2" pb="$3">
              <Text fontSize="$6" fontWeight="700" color="$color">
                Opsi Pengiriman
              </Text>
            </YStack>

            <Sheet.ScrollView showsVerticalScrollIndicator={false}>
              <YStack gap="$2" px="$4" pb="$4">
                {shippingOptions.map(option => {
                  const optionKey = `${option.courier_code}-${option.service_code}`;

                  return (
                    <CourierOptionCard
                      key={optionKey}
                      option={option}
                      optionKey={optionKey}
                      isSelected={selectedShippingKey === optionKey}
                      onSelect={handleSelectShippingKey}
                      formatRupiah={formatRupiah}
                    />
                  );
                })}
              </YStack>
            </Sheet.ScrollView>

            <YStack px="$4" pt="$2" pb="$4">
              <TamaguiButton
                borderRadius="$3"
                minHeight={44}
                backgroundColor="$primary"
                color="$surface"
                onPress={() => setShippingSheetOpen(false)}>
                Konfirmasi
              </TamaguiButton>
            </YStack>
          </YStack>
        </Sheet.Frame>
      </Sheet>

      {/* Address Picker Sheet */}
      <Sheet
        modal
        dismissOnOverlayPress
        dismissOnSnapToBottom
        moveOnKeyboardChange
        snapPoints={[60]}
        open={addressSheetOpen}
        onOpenChange={setAddressSheetOpen}
        animation="medium"
        animationConfig={{
          type: 'spring',
          damping: 24,
          mass: 0.9,
          stiffness: 200,
        }}>
        <Sheet.Overlay
          animation="lazy"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          backgroundColor="$sheetOverlay"
        />
        <Sheet.Handle />
        <Sheet.Frame
          backgroundColor="$surfaceSubtle"
          borderTopLeftRadius="$6"
          borderTopRightRadius="$6">
          <YStack flex={1}>
            <YStack px="$4" pt="$2" pb="$3">
              <Text fontSize="$6" fontWeight="700" color="$color">
                Pilih Alamat
              </Text>
            </YStack>

            {loadingAddresses ? (
              <YStack flex={1} alignItems="center" justifyContent="center">
                <Spinner size="large" color="$primary" />
              </YStack>
            ) : availableAddresses.length === 0 ? (
              <YStack flex={1} alignItems="center" justifyContent="center" px="$4">
                <Card
                  borderRadius="$4"
                  borderWidth={1}
                  borderStyle="dashed"
                  borderColor="$surfaceBorder"
                  backgroundColor="$surface"
                  padding="$4"
                  width="100%">
                  <YStack gap="$3" alignItems="center">
                    <MapPinIcon size={28} color="$primary" />
                    <Text color="$color" fontWeight="600" textAlign="center">
                      Belum ada alamat
                    </Text>
                  </YStack>
                </Card>
              </YStack>
            ) : (
              <Sheet.ScrollView showsVerticalScrollIndicator={false}>
                <YStack gap="$2" px="$4" pb="$4">
                  {availableAddresses.map(address => (
                    <AddressCardSheet
                      key={address.id}
                      address={address}
                      isSelected={address.id === selectedAddressId}
                      onSelect={handleSelectAddress}
                    />
                  ))}
                </YStack>
              </Sheet.ScrollView>
            )}
          </YStack>
        </Sheet.Frame>
      </Sheet>

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
