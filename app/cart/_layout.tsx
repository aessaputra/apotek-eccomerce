import { Stack } from 'expo-router';
import { useTheme } from 'tamagui';
import { getStackHeaderOptions } from '@/utils/theme';

export default function CartStackLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={getStackHeaderOptions(theme)}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Keranjang',
          headerTitleAlign: 'center',
        }}
      />
    </Stack>
  );
}
