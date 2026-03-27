import { Stack } from 'expo-router';
import { useTheme } from 'tamagui';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { getStackHeaderOptions } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';

function OrdersStackLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={getStackHeaderOptions(theme)}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Pesanan',
          headerTitleAlign: 'center',
          headerRight: () => <HeaderCartIcon forHeaderRight />,
        }}
      />
      <Stack.Screen
        name="success"
        options={{
          title: 'Pembayaran Berhasil',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(OrdersStackLayout);
