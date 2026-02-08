import { Stack } from 'expo-router';
import { useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';

export default function ProfileStackLayout() {
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
          title: 'Akun',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </Stack>
  );
}
