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
        name="unpaid"
        options={{
          title: 'Belum Bayar',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="packing"
        options={{
          title: 'Dikemas',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="shipped"
        options={{
          title: 'Dikirim',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="completed"
        options={{
          title: 'Selesai',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="success"
        options={{
          title: 'Pembayaran Berhasil',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[orderId]"
        options={{
          title: 'Detail Pesanan',
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(OrdersStackLayout);
