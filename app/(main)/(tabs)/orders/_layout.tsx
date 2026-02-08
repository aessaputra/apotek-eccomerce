import { Stack } from 'expo-router';
import { useTheme } from 'tamagui';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { getThemeColor } from '@/utils/theme';

export default function OrdersStackLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerTintColor: getThemeColor(theme, 'background', '#ffffff'),
        headerStyle: { backgroundColor: getThemeColor(theme, 'color', '#0D9488') },
        headerTitleStyle: { fontSize: 18 },
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Pesanan',
          headerTitleAlign: 'center',
          headerRight: () => <HeaderCartIcon forHeaderRight />,
        }}
      />
    </Stack>
  );
}
