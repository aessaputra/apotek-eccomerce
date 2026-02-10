import { Tabs, useSegments } from 'expo-router';
import { useTheme } from 'tamagui';
import { AntDesign } from '@expo/vector-icons';
import { getThemeColor } from '@/utils/theme';

export default function TabLayout() {
  const theme = useTheme();
  const segments = useSegments();
  const tabBarBg = getThemeColor(theme, 'background', '#f5f5f5');
  const tabBarInactive = getThemeColor(theme, 'colorPress', '#888');
  const tabBarActive = getThemeColor(theme, 'color', '#0D9488');

  // Hide tab bar on edit-profile, address-form, and addresses (sticky bottom bar used instead)
  const hideTabBar =
    segments.includes('edit-profile') ||
    segments.includes('address-form') ||
    segments.includes('addresses');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: tabBarInactive,
        tabBarInactiveBackgroundColor: tabBarBg,
        tabBarActiveTintColor: tabBarActive,
        tabBarActiveBackgroundColor: tabBarBg,
        tabBarStyle: {
          display: hideTabBar ? 'none' : 'flex',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Beranda',
          tabBarIcon: ({ color }) => <AntDesign name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pesanan',
          tabBarIcon: ({ color }) => <AntDesign name="solution" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color }) => <AntDesign name="user" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
