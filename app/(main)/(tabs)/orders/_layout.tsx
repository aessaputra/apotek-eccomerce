import { Stack } from 'expo-router';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import useColorScheme from '@/hooks/useColorScheme';
import { colors } from '@/theme';

export default function OrdersStackLayout() {
  const { isDark } = useColorScheme();
  return (
    <Stack
      screenOptions={{
        headerTintColor: colors.white,
        headerStyle: { backgroundColor: isDark ? colors.surfaceDark : colors.primary },
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
