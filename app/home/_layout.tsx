import { useTheme } from 'tamagui';
import { Stack } from 'expo-router';
import { getStackHeaderOptions } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';

function HomeStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        ...getStackHeaderOptions(theme),
      }}>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="details"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="product-details"
        options={{
          title: 'Product Details',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="product-list"
        options={{
          title: 'Products',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(HomeStackLayout);
