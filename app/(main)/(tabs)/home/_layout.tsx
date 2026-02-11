import { YStack, useTheme } from 'tamagui';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderSearchAndCart from '@/components/layouts/HeaderSearchAndCart';
import { getStackHeaderOptions, getThemeColor } from '@/utils/theme';
import { DEFAULT_THEME_VALUES } from '@/themes';

export default function HomeStackLayout() {
  const theme = useTheme();
  // Use headerBackground for theme-aware header color (darker teal in dark mode for better contrast)
  // Use DEFAULT_THEME_VALUES for fallback to ensure consistency with theme definitions
  const headerBg = getThemeColor(
    theme,
    'headerBackground',
    getThemeColor(theme, 'brandPrimary', DEFAULT_THEME_VALUES.brandPrimary),
  );

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        ...getStackHeaderOptions(theme),
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: '',
          headerTitle: () => null,
          header: () => (
            <SafeAreaView style={{ backgroundColor: headerBg }} edges={['top']}>
              <YStack
                paddingHorizontal={16}
                paddingVertical={6}
                minHeight={44}
                justifyContent="center"
                width="100%">
                <HeaderSearchAndCart />
              </YStack>
            </SafeAreaView>
          ),
        }}
      />
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </Stack>
  );
}
