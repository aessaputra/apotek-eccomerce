import { View } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderSearchAndCart from '@/components/layouts/HeaderSearchAndCart';
import useColorScheme from '@/hooks/useColorScheme';
import { colors } from '@/theme';

export default function HomeStackLayout() {
  const { isDark } = useColorScheme();
  const headerBg = isDark ? colors.surfaceDark : colors.primary;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.white,
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
              <View
                style={{
                  paddingHorizontal: 16,
                  paddingTop: 12,
                  paddingBottom: 12,
                  minHeight: 56,
                  justifyContent: 'center',
                  width: '100%',
                }}>
                <HeaderSearchAndCart />
              </View>
            </SafeAreaView>
          ),
        }}
      />
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </Stack>
  );
}
