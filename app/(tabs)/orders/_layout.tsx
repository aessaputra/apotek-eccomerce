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
          headerBackTitle: 'Pesanan',
        }}
      />
      <Stack.Screen
        name="packing"
        options={{
          title: 'Dikemas',
          headerTitleAlign: 'center',
          headerBackTitle: 'Pesanan',
        }}
      />
      <Stack.Screen
        name="shipped"
        options={{
          title: 'Dikirim',
          headerTitleAlign: 'center',
          headerBackTitle: 'Pesanan',
        }}
      />
      <Stack.Screen
        name="completed"
        options={{
          title: 'Selesai',
          headerTitleAlign: 'center',
          headerBackTitle: 'Pesanan',
        }}
      />
      <Stack.Screen
        name="order-detail/[orderId]"
        options={{
          title: 'Detail Pesanan',
          headerTitleAlign: 'center',
          headerBackTitle: 'Pesanan',
        }}
      />
      <Stack.Screen
        name="track-shipment/[orderId]"
        options={{
          title: 'Lacak Pengiriman',
          headerTitleAlign: 'center',
          headerBackTitle: 'Detail Pesanan',
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(OrdersStackLayout);
