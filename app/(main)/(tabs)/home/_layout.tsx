import { YStack, useTheme } from 'tamagui';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderSearchAndCart from '@/components/layouts/HeaderSearchAndCart';
import { getThemeColor } from '@/utils/theme';

export default function HomeStackLayout() {
  const theme = useTheme();
  const headerBg = getThemeColor(theme, 'color', '#0D9488');
  const headerTint = getThemeColor(theme, 'background', '#ffffff');

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: headerTint,
        headerStyle: { backgroundColor: headerBg },
        headerTitleStyle: { fontSize: 18 },
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
                paddingTop={12}
                paddingBottom={12}
                minHeight={56}
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
