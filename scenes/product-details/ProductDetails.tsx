import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Button,
  Card,
  Image,
  ScrollView,
  Text,
  View,
  XStack,
  YStack,
  styled,
  useMedia,
  useTheme,
} from 'tamagui';
import {
  AlertCircleIcon,
  CartIcon,
  ChevronLeftIcon,
  HeartIcon,
  MoreIcon,
  PillIcon,
} from '@/components/icons';
import {
  addProductToCart,
  formatPrice,
  getPrimaryImageUrl,
  getProductDetailsById,
  type ProductDetailsData,
} from '@/services/home.service';
import { useAppSlice } from '@/slices';
import { getThemeColor } from '@/utils/theme';

const ScreenRoot = styled(YStack, {
  flex: 1,
  backgroundColor: '$surfaceSubtle',
});

const ContentStack = styled(YStack, {
  width: '100%',
  maxWidth: 560,
  alignSelf: 'center',
  gap: '$4',
});

const HeaderButton = styled(Card, {
  width: 40,
  height: 40,
  borderRadius: '$10',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  alignItems: 'center',
  justifyContent: 'center',
  elevation: 2,
  pressStyle: { opacity: 0.9, scale: 0.98 },
});

const ImageContainer = styled(YStack, {
  width: '100%',
  aspectRatio: 1,
  borderRadius: '$6',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
});

const OrganicShape = styled(View, {
  position: 'absolute',
  width: '85%',
  height: '85%',
  borderRadius: '$8',
  backgroundColor: '$infoSoft',
  transform: [{ rotate: '-3deg' }],
});

const AccentBubble = styled(View, {
  position: 'absolute',
  borderRadius: '$10',
  opacity: 0.95,
});

const SkeletonBlock = styled(YStack, {
  backgroundColor: '$surfaceBorder',
  borderRadius: '$3',
});

const CategoryTag = styled(XStack, {
  alignSelf: 'flex-start',
  alignItems: 'center',
  gap: '$2',
  backgroundColor: '$infoSoft',
  paddingHorizontal: '$3',
  paddingVertical: '$1.5',
  borderRadius: '$4',
});

const CategoryIcon = styled(View, {
  width: 20,
  height: 20,
  borderRadius: '$10',
  backgroundColor: '$primary',
  alignItems: 'center',
  justifyContent: 'center',
});

const AddToCartButton = styled(Button, {
  height: 48,
  borderRadius: '$6',
  backgroundColor: '$primary',
  pressStyle: { opacity: 0.95, scale: 0.98 },
});

interface LoadingStateProps {
  topPadding: number;
  horizontalPadding: '$4' | '$5';
  bottomPadding: number;
}

function ProductDetailsLoading({
  topPadding,
  horizontalPadding,
  bottomPadding,
}: LoadingStateProps) {
  return (
    <ScreenRoot>
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <ContentStack pt={topPadding} px={horizontalPadding} pb={bottomPadding} flex={1}>
          <XStack alignItems="center" justifyContent="space-between">
            <SkeletonBlock width={40} height={40} borderRadius="$10" />
            <SkeletonBlock width={80} height={18} />
            <SkeletonBlock width={40} height={40} borderRadius="$10" />
          </XStack>

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

      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor="$surface"
        borderTopWidth={1}
        borderTopColor="$surfaceBorder"
        padding="$4"
        paddingBottom={bottomPadding - 104}
        elevation={4}>
        <ContentStack maxWidth={560} alignSelf="center" width="100%">
          <XStack alignItems="center" justifyContent="space-between" gap="$3">
            <YStack gap="$1.5">
              <SkeletonBlock width={140} height={28} />
              <SkeletonBlock width={70} height={14} />
            </YStack>
            <SkeletonBlock width={152} height={48} borderRadius="$6" />
          </XStack>
        </ContentStack>
      </YStack>
    </ScreenRoot>
  );
}

function ProductImage({ imageUrl }: { imageUrl: string | null }) {
  const theme = useTheme();

  return (
    <ImageContainer>
      <OrganicShape />
      <AccentBubble width={76} height={76} top={18} right={14} backgroundColor="$warningSoft" />
      <AccentBubble width={58} height={58} bottom={22} left={16} backgroundColor="$successSoft" />
      <View width="80%" height="80%" alignItems="center" justifyContent="center" zIndex={1}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} width="100%" height="100%" resizeMode="contain" />
        ) : (
          <YStack
            width={120}
            height={120}
            borderRadius="$12"
            backgroundColor="$warningSoft"
            alignItems="center"
            justifyContent="center">
            <HeartIcon size={48} color={getThemeColor(theme, 'primary')} />
          </YStack>
        )}
      </View>
    </ImageContainer>
  );
}

interface ProductErrorStateProps {
  topPadding: number;
  horizontalPadding: '$4' | '$5';
  message: string;
  onBack: () => void;
  onRetry: () => void;
}

function ProductErrorState({
  topPadding,
  horizontalPadding,
  message,
  onBack,
  onRetry,
}: ProductErrorStateProps) {
  const theme = useTheme();

  return (
    <ScreenRoot>
      <ContentStack pt={topPadding} px={horizontalPadding} pb="$6" flex={1}>
        <XStack alignItems="center" justifyContent="space-between">
          <Card
            width={40}
            height={40}
            borderRadius="$10"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            alignItems="center"
            justifyContent="center"
            pressStyle={{ opacity: 0.9, scale: 0.98 }}
            onPress={onBack}>
            <ChevronLeftIcon size={20} color={getThemeColor(theme, 'color')} />
          </Card>

          <Text fontSize={16} fontWeight="700" color="$color">
            Details
          </Text>

          <YStack width={40} />
        </XStack>

        <YStack
          marginTop="$7"
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
            <Text color="$white" fontSize={15} fontWeight="700">
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
  const params = useLocalSearchParams<{ id?: string | string[] }>();
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

  const productId = useMemo(() => {
    if (Array.isArray(params.id)) return params.id[0] ?? '';
    return params.id ?? '';
  }, [params.id]);

  const topPadding = (media.gtSm ? 16 : 12) + insets.top;
  const horizontalPadding: '$4' | '$5' = media.gtSm ? '$5' : '$4';
  const contentBottomPadding = insets.bottom + 120;
  const stickyBottomPadding = insets.bottom + 16;

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

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleAddToCart = useCallback(async () => {
    if (!product) {
      setActionFeedback('Produk tidak tersedia.');
      return;
    }

    if (!user?.id) {
      setActionFeedback('Silakan login untuk menambahkan produk ke keranjang.');
      return;
    }

    if (product.stock <= 0) {
      setActionFeedback('Stok produk habis untuk saat ini.');
      return;
    }

    setActionFeedback(null);
    setIsAddingToCart(true);

    const { error: cartError } = await addProductToCart(user.id, product.id, 1);
    setIsAddingToCart(false);

    if (cartError) {
      setActionFeedback(cartError.message || 'Gagal menambahkan produk ke keranjang.');
      return;
    }

    setActionFeedback('Produk berhasil ditambahkan ke keranjang.');
    router.push('/(main)/(tabs)/cart');
  }, [product, router, user?.id]);

  const handleToggleFavorite = useCallback(() => {
    setIsFavorite(prev => !prev);
  }, []);

  const handleRetry = useCallback(() => {
    void fetchProduct();
  }, [fetchProduct]);

  const handleMoreOptions = useCallback(() => {}, []);

  if (isLoading) {
    return (
      <ProductDetailsLoading
        topPadding={topPadding}
        horizontalPadding={horizontalPadding}
        bottomPadding={contentBottomPadding}
      />
    );
  }

  if (error || !product) {
    return (
      <ProductErrorState
        topPadding={topPadding}
        horizontalPadding={horizontalPadding}
        message={error ?? 'Terjadi kesalahan yang tidak diketahui.'}
        onBack={handleBack}
        onRetry={handleRetry}
      />
    );
  }

  const imageUrl = getPrimaryImageUrl(product);
  const categoryLabel = product.category_name ?? 'Uncategorized';
  const descriptionLabel =
    product.description?.trim() || 'Deskripsi produk belum tersedia untuk item ini.';
  const formattedPrice = formatPrice(product.price);
  const isOutOfStock = product.stock <= 0;

  return (
    <ScreenRoot>
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <ContentStack pt={topPadding} px={horizontalPadding} pb={contentBottomPadding} flex={1}>
          <XStack alignItems="center" justifyContent="space-between">
            <HeaderButton onPress={handleBack}>
              <ChevronLeftIcon size={20} color={getThemeColor(theme, 'color')} />
            </HeaderButton>

            <Text fontSize={16} fontWeight="700" color="$color">
              Details
            </Text>

            <HeaderButton onPress={handleMoreOptions}>
              <MoreIcon size={20} color={getThemeColor(theme, 'color')} />
            </HeaderButton>
          </XStack>

          <ProductImage imageUrl={imageUrl} />

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

            <CategoryTag>
              <CategoryIcon>
                <PillIcon size={12} color={getThemeColor(theme, 'white')} />
              </CategoryIcon>
              <Text fontSize={13} color="$color" fontWeight="700">
                {categoryLabel}
              </Text>
            </CategoryTag>

            <Text fontSize={15} lineHeight={23} color="$colorSubtle" mt="$1">
              {descriptionLabel}
            </Text>

            {actionFeedback ? (
              <Text fontSize={13} color={isOutOfStock ? '$danger' : '$primary'}>
                {actionFeedback}
              </Text>
            ) : null}
          </YStack>
        </ContentStack>
      </ScrollView>

      <YStack
        position="absolute"
        bottom={0}
        left={0}
        right={0}
        backgroundColor="$surface"
        borderTopWidth={1}
        borderTopColor="$surfaceBorder"
        padding="$4"
        paddingBottom={stickyBottomPadding}
        elevation={4}>
        <ContentStack maxWidth={560} alignSelf="center" width="100%">
          <XStack alignItems="center" justifyContent="space-between" gap="$4">
            <YStack>
              <Text fontSize={26} color="$color" fontWeight="800" letterSpacing={-0.5}>
                {formattedPrice}
              </Text>
              <Text fontSize={12} color="$colorSubtle" fontWeight="600">
                /quantity
              </Text>
            </YStack>

            <AddToCartButton
              onPress={() => {
                void handleAddToCart();
              }}
              disabled={isAddingToCart || isOutOfStock}>
              <XStack alignItems="center" gap="$2">
                <CartIcon size={18} color={getThemeColor(theme, 'white')} />
                <Text color="$white" fontSize={15} fontWeight="700">
                  {isOutOfStock ? 'Out of Stock' : isAddingToCart ? 'Adding...' : 'Add to Cart'}
                </Text>
              </XStack>
            </AddToCartButton>
          </XStack>
        </ContentStack>
      </YStack>
    </ScreenRoot>
  );
}
