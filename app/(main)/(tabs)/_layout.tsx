import { Tabs, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme, useThemeName } from 'tamagui';
import { AntDesign } from '@expo/vector-icons';
import { getThemeColor } from '@/utils/theme';
import { DEFAULT_THEME_VALUES } from '@/themes';
import { ICON_SIZES, TAB_BAR_LABEL_SIZE } from '@/constants/ui';
import { fonts } from '@/utils/fonts';
import TabBarIconWithPill from '@/components/layouts/TabBarIconWithPill';

export default function TabLayout() {
  const theme = useTheme();
  const themeName = useThemeName();
  const isDark = themeName === 'dark';
  const segments = useSegments();
  const tabBarBg = getThemeColor(
    theme,
    'surfaceElevated',
    getThemeColor(
      theme,
      'surface',
      getThemeColor(theme, 'background', DEFAULT_THEME_VALUES.background),
    ),
  );
  const tabBarBorderColor = getThemeColor(theme, 'borderColor', DEFAULT_THEME_VALUES.borderColor);
  const tabBarActive = getThemeColor(
    theme,
    'primary',
    getThemeColor(theme, 'brandPrimary', DEFAULT_THEME_VALUES.brandPrimary),
  );
  const tabBarInactive = getThemeColor(
    theme,
    'colorSubtle',
    getThemeColor(theme, 'colorPress', DEFAULT_THEME_VALUES.colorSubtle),
  );

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
          height: 70,
          paddingTop: 8,
          paddingBottom: 10,
          backgroundColor: tabBarBg,
          borderTopWidth: 1,
          borderTopColor: tabBarBorderColor,
          ...(Platform.OS === 'web'
            ? { boxShadow: '0px -2px 4px rgba(0,0,0,0.1)' }
            : {
                elevation: 8,
                shadowColor: getThemeColor(
                  theme,
                  'shadowColor',
                  isDark ? DEFAULT_THEME_VALUES.dark.shadowColor : DEFAULT_THEME_VALUES.shadowColor,
                ),
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              }),
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.poppins.regular,
          fontSize: TAB_BAR_LABEL_SIZE,
          marginTop: 2,
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
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithPill focused={focused}>
              <AntDesign name="home" size={ICON_SIZES.BUTTON} color={color} />
            </TabBarIconWithPill>
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pesanan',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithPill focused={focused}>
              <AntDesign name="solution" size={ICON_SIZES.BUTTON} color={color} />
            </TabBarIconWithPill>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color, focused }) => (
            <TabBarIconWithPill focused={focused}>
              <AntDesign name="user" size={ICON_SIZES.BUTTON} color={color} />
            </TabBarIconWithPill>
          ),
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
