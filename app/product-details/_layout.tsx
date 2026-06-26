import { Stack, useRouter } from 'expo-router';
import { Button, Text, YStack, useTheme } from 'tamagui';
import { getStackHeaderOptions, getThemeColor } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';
import { CartIcon } from '@/components/icons';
import { useCartPaginated } from '@/hooks';
import { useAppSlice } from '@/slices';

function ProductDetailsStackLayout() {
  const theme = useTheme();
  const router = useRouter();
  const { user } = useAppSlice();
  const { snapshot: cartSnapshot } = useCartPaginated({ userId: user?.id });
  const iconColor = getThemeColor(theme, 'color');

  const handleOpenCart = () => {
    router.push('/cart');
  };

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        ...getStackHeaderOptions(theme),
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerShown: true,
          headerRight: () => (
            <Button
              width={40}
              height={40}
              borderRadius={20}
              backgroundColor="transparent"
              padding={0}
              alignItems="center"
              justifyContent="center"
              pressStyle={{ opacity: 0.7 }}
              onPress={handleOpenCart}>
              <CartIcon size={24} color={iconColor} />
              {cartSnapshot.itemCount > 0 && (
                <YStack
                  position="absolute"
                  top={4}
                  right={2}
                  backgroundColor="$primary"
                  borderRadius={100}
                  borderWidth={1.5}
                  borderColor="$background"
                  minWidth={18}
                  height={18}
                  justifyContent="center"
                  alignItems="center"
                  px={cartSnapshot.itemCount > 9 ? '$1.5' : 0}
                  zIndex={10}
                  pointerEvents="none">
                  <Text color="$onPrimary" fontSize={9} fontWeight="900" lineHeight={11}>
                    {cartSnapshot.itemCount > 99 ? '99+' : cartSnapshot.itemCount}
                  </Text>
                </YStack>
              )}
            </Button>
          ),
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(ProductDetailsStackLayout);
