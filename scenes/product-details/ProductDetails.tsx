import { useCallback, useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RouteParams } from '@/types/routes.types';
import {
  Button,
  Card,
  Image,
  Sheet,
  ScrollView,
  Text,
  View,
  XStack,
  YStack,
  styled,
  useMedia,
  useTheme,
} from 'tamagui';
import { AlertCircleIcon, CartIcon, HeartIcon, PillIcon } from '@/components/icons';
import {
  addProductToCart,
  formatPrice,
  getPrimaryImageUrl,
  getProductDetailsById,
  type ProductDetailsData,
} from '@/services/home.service';
import { BOTTOM_BAR_HEIGHT, getBottomBarShadow } from '@/constants/ui';
import { DEFAULT_THEME_VALUES } from '@/themes';
import { useAppSlice } from '@/slices';
import { getThemeColor } from '@/utils/theme';
import QuantitySelector from '@/components/elements/QuantitySelector';
import ProductImageGallery from '@/components/elements/ProductImageGallery';

const ScreenRoot = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
});

const ContentStack = styled(YStack, {
  width: '100%',
  maxWidth: 560,
  alignSelf: 'center',
  gap: '$4',
});

const SkeletonBlock = styled(YStack, {
  backgroundColor: '$surfaceBorder',
  borderRadius: '$3',
});

const CategoryTag = styled(XStack, {
  alignSelf: 'flex-start',
  alignItems: 'center',
  gap: '$2',
  backgroundColor: '$surfaceElevated',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  paddingHorizontal: '$3',
  paddingVertical: '$1.5',
  borderRadius: '$4',
});

const CategoryIcon = styled(View, {
  width: 20,
  height: 20,
  borderRadius: '$10',
  backgroundColor: '$surfaceSubtle',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
});

const AddToCartButton = styled(Button, {
  height: 52,
  borderRadius: '$4',
  backgroundColor: '$primary',
  borderWidth: 1,
  borderColor: '$primary',
  elevation: 3,
  pressStyle: { opacity: 0.95, scale: 0.985 },
  disabledStyle: {
    backgroundColor: '$backgroundDisabled',
    borderColor: '$borderColorDisabled',
    opacity: 1,
  },
});

const SheetConfirmButton = styled(Button, {
  width: 56,
  height: 56,
  borderRadius: '$10',
  backgroundColor: '$primary',
  alignItems: 'center',
  justifyContent: 'center',
  pressStyle: { opacity: 0.95, scale: 0.98 },
  disabledStyle: { opacity: 0.55 },
});

const BottomActionBar = styled(YStack, {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: '$surface',
  borderTopWidth: 1,
  borderTopColor: '$surfaceBorder',
  px: '$4',
  pt: '$3',
  justifyContent: 'center',
  elevation: 8,
});

const BottomActionBarContent = styled(YStack, {
  width: '100%',
  maxWidth: 560,
  alignSelf: 'center',
});

interface LoadingStateProps {
  topPadding: number;
  horizontalPadding: '$4' | '$5';
  bottomPadding: number;
  bottomPaddingInset: number;
  bottomBarHeight: number;
}

function ProductDetailsLoading({
  topPadding,
  horizontalPadding,
  bottomPadding,
  bottomPaddingInset,
  bottomBarHeight,
}: LoadingStateProps) {
  return (
    <ScreenRoot>
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <ContentStack pt={topPadding} px={horizontalPadding} pb={bottomPadding} flex={1}>
          <SkeletonBlock width="100%" aspectRatio={1} borderRadius="$6" />

          <YStack gap="$3">
            <XStack alignItems="center" justifyContent="space-between" gap="$2">
              <SkeletonBlock width="72%" height={34} />
              <SkeletonBlock width={36} height={36} borderRadius="$10" />
            </XStack>
            <SkeletonBlock width={110} height={28} borderRadius="$10" />
            <SkeletonBlock width="100%" height={76} />
          </YStack>
        </ContentStack>
      </ScrollView>

      <BottomActionBar
        minHeight={bottomBarHeight}
        pb={bottomPaddingInset}
        style={getBottomBarShadow(DEFAULT_THEME_VALUES.shadowColor)}
        importantForAccessibility="no-hide-descendants">
        <BottomActionBarContent>
          <XStack alignItems="stretch" justifyContent="space-between" gap="$3">
            <SkeletonBlock flex={1} height={52} borderRadius="$4" />
            <SkeletonBlock flex={1.6} height={52} borderRadius="$4" />
          </XStack>
        </BottomActionBarContent>
      </BottomActionBar>
    </ScreenRoot>
  );
}

interface ProductErrorStateProps {
  topPadding: number;
  horizontalPadding: '$4' | '$5';
  message: string;
  onRetry: () => void;
}

function ProductErrorState({
  topPadding,
  horizontalPadding,
  message,
  onRetry,
}: ProductErrorStateProps) {
  const theme = useTheme();

  return (
    <ScreenRoot>
      <ContentStack pt={topPadding} px={horizontalPadding} pb="$6" flex={1}>
        <YStack
          marginTop="$3"
          backgroundColor="$surface"
          borderWidth={1}
          borderColor="$surfaceBorder"
          borderRadius="$6"
          padding="$5"
          alignItems="center"
          gap="$3">
          <YStack
            width={58}
            height={58}
            borderRadius="$10"
            backgroundColor="$dangerSoft"
            alignItems="center"
            justifyContent="center">
            <AlertCircleIcon size={28} color={getThemeColor(theme, 'danger')} />
          </YStack>
          <Text fontSize={18} fontWeight="700" color="$color" textAlign="center">
            Gagal memuat produk
          </Text>
          <Text fontSize={14} lineHeight={21} color="$colorSubtle" textAlign="center">
            {message}
          </Text>
          <Button
            marginTop="$1"
            height={46}
            minWidth={160}
            borderRadius="$5"
            backgroundColor="$primary"
            pressStyle={{ opacity: 0.95, scale: 0.98 }}
            onPress={onRetry}>
            <Text color="$onPrimary" fontSize={15} fontWeight="700">
              Coba Lagi
            </Text>
          </Button>
        </YStack>
      </ContentStack>
    </ScreenRoot>
  );
}

export default function ProductDetails() {
  const router = useRouter();
  const params = useLocalSearchParams<RouteParams<'home/product-details'>>();
  const media = useMedia();
  const theme = useTheme();
  const { user } = useAppSlice();
  const insets = useSafeAreaInsets();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [product, setProduct] = useState<ProductDetailsData | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const productId = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '');

  const topPadding = media.gtSm ? 16 : 12;
  const horizontalPadding: '$4' | '$5' = media.gtSm ? '$5' : '$4';
  const bottomPaddingInset = Math.max(insets.bottom, 12);
  const bottomBarHeight = BOTTOM_BAR_HEIGHT + bottomPaddingInset;

  const fetchProduct = useCallback(async () => {
    if (!productId.trim()) {
      setProduct(null);
      setError('ID produk tidak valid. Silakan kembali dan pilih produk lain.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const nextProduct = await getProductDetailsById(productId);

    if (!nextProduct) {
      setProduct(null);
      setError('Produk tidak ditemukan atau sudah tidak tersedia.');
      setIsLoading(false);
      return;
    }

    setProduct(nextProduct);
    setIsLoading(false);
  }, [productId]);

  useEffect(() => {
    void fetchProduct();
  }, [fetchProduct]);

  useEffect(() => {
    if (!product) return;

    setQuantity(prevQuantity => {
      const maxQuantity = Math.max(product.stock, 1);
      return Math.min(Math.max(prevQuantity, 1), maxQuantity);
    });
  }, [product]);

  const handleAddToCart = useCallback(async () => {
    if (!product) {
      setActionFeedback('Produk tidak tersedia.');
      return false;
    }

    if (!user?.id) {
      setActionFeedback('Silakan login untuk menambahkan produk ke keranjang.');
      return false;
    }

    if (product.stock <= 0) {
      setActionFeedback('Stok produk habis untuk saat ini.');
      return false;
    }

    setActionFeedback(null);
    setIsAddingToCart(true);

    const { error: cartError } = await addProductToCart(user.id, product.id, quantity);
    setIsAddingToCart(false);

    if (cartError) {
      setActionFeedback(cartError.message || 'Gagal menambahkan produk ke keranjang.');
      return false;
    }

    setActionFeedback(`Produk berhasil ditambahkan ke keranjang (${quantity} item).`);
    setIsSheetOpen(false);
    router.push('/cart');
    return true;
  }, [product, quantity, router, user?.id]);

  const handleQuantityChange = useCallback((nextQuantity: number) => {
    setQuantity(nextQuantity);
    setActionFeedback(null);
  }, []);

  const handleToggleFavorite = useCallback(() => {
    setIsFavorite(prev => !prev);
  }, []);

  const handleRetry = useCallback(() => {
    void fetchProduct();
  }, [fetchProduct]);

  const handleOpenSheet = useCallback(() => {
    if ((product?.stock ?? 0) <= 0) return;
    setActionFeedback(null);
    setIsSheetOpen(true);
  }, [product?.stock]);

  const handleConfirmFromSheet = useCallback(() => {
    void handleAddToCart();
  }, [handleAddToCart]);

  if (isLoading) {
    return (
      <ProductDetailsLoading
        topPadding={topPadding}
        horizontalPadding={horizontalPadding}
        bottomPadding={bottomBarHeight}
        bottomPaddingInset={bottomPaddingInset}
        bottomBarHeight={bottomBarHeight}
      />
    );
  }

  if (error || !product) {
    return (
      <ProductErrorState
        topPadding={topPadding}
        horizontalPadding={horizontalPadding}
        message={error ?? 'Terjadi kesalahan yang tidak diketahui.'}
        onRetry={handleRetry}
      />
    );
  }

  const imageUrl = getPrimaryImageUrl(product);
  const descriptionLabel =
    product.description?.trim() || 'Deskripsi produk belum tersedia untuk item ini.';
  const formattedUnitPrice = formatPrice(product.price);
  const formattedTotalPrice = formatPrice(product.price * quantity);
  const isOutOfStock = product.stock <= 0;
  const maxQuantity = Math.max(product.stock, 1);
  const isSuccessFeedback = actionFeedback?.toLowerCase().includes('berhasil') ?? false;
  const feedbackExtraPadding = actionFeedback ? 22 : 0;
  const contentBottomPadding = bottomBarHeight + feedbackExtraPadding;

  return (
    <ScreenRoot>
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <ContentStack pt={topPadding} px={horizontalPadding} pb={contentBottomPadding} flex={1}>
          <ProductImageGallery images={product.images} />

          <YStack gap="$3" mt="$2">
            <XStack alignItems="flex-start" justifyContent="space-between" gap="$2">
              <Text
                flex={1}
                fontSize={28}
                lineHeight={34}
                color="$color"
                fontWeight="800"
                letterSpacing={-0.6}
                numberOfLines={2}>
                {product.name}
              </Text>

              <Card
                width={38}
                height={38}
                borderRadius="$10"
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$surfaceBorder"
                alignItems="center"
                justifyContent="center"
                pressStyle={{ opacity: 0.9, scale: 0.95 }}
                onPress={handleToggleFavorite}>
                <HeartIcon
                  size={18}
                  color={isFavorite ? getThemeColor(theme, 'error') : getThemeColor(theme, 'color')}
                  fill={isFavorite ? getThemeColor(theme, 'error') : 'transparent'}
                />
              </Card>
            </XStack>

            <CategoryTag
              testID="product-category-badge"
              accessibilityRole="image"
              accessibilityLabel={product.category_name ?? 'Uncategorized'}>
              <CategoryIcon testID="product-category-icon-container">
                {product.category_logo_url ? (
                  <Image
                    testID="product-category-logo"
                    source={{ uri: product.category_logo_url }}
                    width={14}
                    height={14}
                    borderRadius="$2"
                    resizeMode="contain"
                    accessibilityLabel={`${product.category_name ?? 'Uncategorized'} logo`}
                  />
                ) : (
                  <View
                    testID="product-category-fallback"
                    width="100%"
                    height="100%"
                    borderRadius="$10"
                    backgroundColor="$warningSoft"
                    alignItems="center"
                    justifyContent="center">
                    <PillIcon size={12} color={getThemeColor(theme, 'primary')} />
                  </View>
                )}
              </CategoryIcon>
              <Text testID="product-category-label" fontSize={12} color="$color" fontWeight="600">
                {product.category_name ?? 'Uncategorized'}
              </Text>
            </CategoryTag>

            <Text fontSize={15} lineHeight={23} color="$colorSubtle" mt="$1">
              {descriptionLabel}
            </Text>
          </YStack>
        </ContentStack>
      </ScrollView>

      <BottomActionBar
        minHeight={bottomBarHeight}
        pb={bottomPaddingInset}
        style={getBottomBarShadow(getThemeColor(theme, 'shadowColor'))}>
        <BottomActionBarContent>
          {actionFeedback ? (
            <Text
              fontSize={13}
              color={isSuccessFeedback ? '$primary' : '$danger'}
              textAlign="center"
              numberOfLines={2}
              mb="$2">
              {actionFeedback}
            </Text>
          ) : null}

          <XStack alignItems="stretch" justifyContent="space-between" gap="$3">
            <YStack
              flex={1}
              flexBasis={0}
              minWidth={0}
              flexShrink={1}
              justifyContent="center"
              backgroundColor="$surface"
              borderWidth={1}
              borderColor="$surfaceBorder"
              borderRadius="$4"
              px="$3"
              py="$2">
              <Text
                fontSize={18}
                lineHeight={22}
                color="$color"
                fontWeight="800"
                letterSpacing={-0.5}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}>
                {formattedUnitPrice}
              </Text>
            </YStack>

            <AddToCartButton
              flex={1.6}
              flexBasis={0}
              minWidth={0}
              flexShrink={1}
              onPress={handleOpenSheet}
              disabled={isOutOfStock}
              justifyContent="center"
              px="$3">
              <XStack flex={1} alignItems="center" justifyContent="center" gap="$2" minWidth={0}>
                <CartIcon
                  size={18}
                  color={getThemeColor(theme, isOutOfStock ? 'colorDisabled' : 'onPrimary')}
                />
                <Text
                  color={isOutOfStock ? '$colorDisabled' : '$onPrimary'}
                  fontSize={15}
                  fontWeight="700"
                  flexShrink={1}
                  minWidth={0}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}>
                  {isOutOfStock ? 'Stok Habis' : 'Tambah Keranjang'}
                </Text>
              </XStack>
            </AddToCartButton>
          </XStack>
        </BottomActionBarContent>
      </BottomActionBar>

      <Sheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        modal
        dismissOnOverlayPress
        dismissOnSnapToBottom
        moveOnKeyboardChange
        snapPoints={[35]}
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
          borderTopRightRadius="$6"
          pointerEvents="box-none">
          <YStack
            px="$4"
            pt="$3"
            pb={Math.max(insets.bottom + 12, 20)}
            gap="$4"
            pointerEvents="box-none">
            <XStack alignItems="center" gap="$3">
              {imageUrl ? (
                <Image
                  source={{ uri: imageUrl }}
                  width={56}
                  height={56}
                  borderRadius="$4"
                  backgroundColor="$surfaceSubtle"
                />
              ) : (
                <YStack
                  width={56}
                  height={56}
                  borderRadius="$4"
                  alignItems="center"
                  justifyContent="center"
                  backgroundColor="$warningSoft">
                  <HeartIcon size={24} color={getThemeColor(theme, 'primary')} />
                </YStack>
              )}

              <YStack flex={1} gap="$1">
                <Text fontSize={16} fontWeight="700" color="$color" numberOfLines={2}>
                  {product.name}
                </Text>
                <Text fontSize={13} color="$colorSubtle" fontWeight="600">
                  Stok: {product.stock}
                </Text>
              </YStack>
            </XStack>

            <XStack
              alignItems="center"
              justifyContent="space-between"
              gap="$3"
              pointerEvents="auto">
              <Text fontSize={14} color="$colorSubtle" fontWeight="600">
                Jumlah
              </Text>
              <QuantitySelector
                value={quantity}
                min={1}
                max={maxQuantity}
                onChange={handleQuantityChange}
                disabled={isOutOfStock || isAddingToCart}
                alignSelf="flex-start"
              />
            </XStack>

            <XStack
              alignItems="center"
              justifyContent="space-between"
              gap="$3"
              pointerEvents="auto">
              <YStack gap="$1">
                <Text fontSize={14} color="$colorSubtle" fontWeight="600">
                  Total
                </Text>
                <Text fontSize={24} color="$color" fontWeight="800" letterSpacing={-0.4}>
                  {formattedTotalPrice}
                </Text>
              </YStack>

              <SheetConfirmButton
                aria-label="Konfirmasi tambah ke keranjang"
                aria-describedby="Menambahkan produk ke keranjang lalu membuka halaman keranjang"
                onPress={handleConfirmFromSheet}
                disabled={isAddingToCart || isOutOfStock}>
                <CartIcon size={22} color={getThemeColor(theme, 'white')} />
              </SheetConfirmButton>
            </XStack>
          </YStack>
        </Sheet.Frame>
      </Sheet>
    </ScreenRoot>
  );
}
