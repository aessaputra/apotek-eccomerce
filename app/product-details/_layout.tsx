import { Stack, useRouter } from 'expo-router';
import { Button, XStack, useTheme } from 'tamagui';
import { getStackHeaderOptions, getThemeColor } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';
import { ChevronLeftIcon, MoreIcon, CartIcon } from '@/components/icons';

const FloatingButton = ({
  onPress,
  children,
}: {
  onPress: () => void;
  children: React.ReactNode;
}) => (
  <Button
    width={40}
    height={40}
    borderRadius={20}
    backgroundColor="$surface"
    padding={0}
    alignItems="center"
    justifyContent="center"
    elevation={2}
    opacity={0.9}
    pressStyle={{ opacity: 0.7, scale: 0.95 }}
    onPress={onPress}>
    {children}
  </Button>
);

function ProductDetailsStackLayout() {
  const theme = useTheme();
  const router = useRouter();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/home');
    }
  };

  const handleCart = () => {
    router.push('/(tabs)/cart');
  };

  const handleMore = () => {
    // Placeholder for more actions (like share)
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
          headerTransparent: true,
          headerLeft: () => (
            <FloatingButton onPress={handleBack}>
              <ChevronLeftIcon size={24} color={getThemeColor(theme, 'color')} />
            </FloatingButton>
          ),
          headerRight: () => (
            <XStack gap="$3" mr="$1">
              <FloatingButton onPress={handleMore}>
                <MoreIcon size={20} color={getThemeColor(theme, 'color')} />
              </FloatingButton>
              <FloatingButton onPress={handleCart}>
                <CartIcon size={20} color={getThemeColor(theme, 'color')} />
              </FloatingButton>
            </XStack>
          ),
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(ProductDetailsStackLayout);
