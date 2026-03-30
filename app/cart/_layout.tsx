import { Stack } from 'expo-router';
import { useTheme } from 'tamagui';
import { getStackHeaderOptions } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';

function CartStackLayout() {
  const theme = useTheme();
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: 'Keranjang Saya',
          headerTitleAlign: 'center',
          ...getStackHeaderOptions(theme),
        }}
      />
      <Stack.Screen
        name="payment"
        options={{
          headerShown: false,
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(CartStackLayout);
