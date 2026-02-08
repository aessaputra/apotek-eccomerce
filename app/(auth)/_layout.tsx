import { Stack } from 'expo-router';
import { Theme } from 'tamagui';
import useColorScheme from '@/hooks/useColorScheme';

export default function AuthLayout() {
  const { colorScheme } = useColorScheme();
  const themeName = colorScheme ?? 'light';

  return (
    <Theme name={themeName}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack>
    </Theme>
  );
}
