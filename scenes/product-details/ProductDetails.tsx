import { memo, useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
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
import { CartIcon, ChevronLeftIcon, HeartIcon, MoreIcon } from '@/components/icons';
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

interface ProductDetailsProps {
  productName?: string;
  category?: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  onAddToCart?: () => void;
  onBack?: () => void;
}

const ProductImage = memo(function ProductImage({ imageUrl }: { imageUrl?: string }) {
  const theme = useTheme();

  return (
    <ImageContainer>
      <OrganicShape />
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
});

export default function ProductDetails({
  productName = 'Immuguard Junior',
  category = 'Fitness',
  description = 'Medicine good for your body even when you do not really need them so keep all without worrying about the life would be later.',
  price = 3290000,
  imageUrl,
  onAddToCart,
  onBack,
}: ProductDetailsProps) {
  const router = useRouter();
  const media = useMedia();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [isFavorite, setIsFavorite] = useState(false);

  const handleBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    router.back();
  }, [onBack, router]);

  const handleAddToCart = useCallback(() => {
    if (onAddToCart) {
      onAddToCart();
    }
  }, [onAddToCart]);

  const handleToggleFavorite = useCallback(() => {
    setIsFavorite(prev => !prev);
  }, []);

  const handleMoreOptions = useCallback(() => {}, []);

  const topPadding = (media.gtSm ? 16 : 12) + insets.top;
  const horizontalPadding = media.gtSm ? '$5' : '$4';
  const formattedPrice = `Rp ${price.toLocaleString('id-ID')}`;

  return (
    <ScreenRoot>
      <ScrollView flex={1} showsVerticalScrollIndicator={false}>
        <ContentStack pt={topPadding} px={horizontalPadding} pb={insets.bottom + 120} flex={1}>
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
                fontSize={24}
                lineHeight={30}
                color="$color"
                fontWeight="800"
                letterSpacing={-0.5}>
                {productName}
              </Text>

              <Card
                width={36}
                height={36}
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
                <HeartIcon size={12} color={getThemeColor(theme, 'white')} />
              </CategoryIcon>
              <Text fontSize={13} color="$color" fontWeight="600">
                {category}
              </Text>
            </CategoryTag>

            <Text fontSize={14} lineHeight={22} color="$colorSubtle" mt="$1">
              {description}
            </Text>
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
        paddingBottom={insets.bottom + 16}
        elevation={4}>
        <ContentStack maxWidth={560} alignSelf="center" width="100%">
          <XStack alignItems="center" justifyContent="space-between" gap="$4">
            <YStack>
              <Text fontSize={22} color="$color" fontWeight="800">
                {formattedPrice}
              </Text>
              <Text fontSize={12} color="$colorSubtle" fontWeight="500">
                /quantity
              </Text>
            </YStack>

            <AddToCartButton onPress={handleAddToCart}>
              <XStack alignItems="center" gap="$2">
                <CartIcon size={18} color={getThemeColor(theme, 'white')} />
                <Text color="$white" fontSize={15} fontWeight="700">
                  Add to Cart
                </Text>
              </XStack>
            </AddToCartButton>
          </XStack>
        </ContentStack>
      </YStack>
    </ScreenRoot>
  );
}
