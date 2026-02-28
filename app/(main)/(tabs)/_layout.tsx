import { useMemo } from 'react';
import { Tabs, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme, useThemeName } from 'tamagui';
import { AntDesign } from '@expo/vector-icons';
import { getThemeColor } from '@/utils/theme';
import { DEFAULT_THEME_VALUES } from '@/themes';
import {
  ICON_SIZES,
  TAB_BAR_LABEL_SIZE,
  TAB_BAR_HEIGHT,
  TAB_BAR_PADDING_TOP,
  TAB_BAR_PADDING_BOTTOM,
} from '@/constants/ui';
import { fonts } from '@/utils/fonts';
import TabBarIconWithPill from '@/components/layouts/TabBarIconWithPill';

const TAB_BAR_ITEM_PADDING_VERTICAL = 4;
const TAB_BAR_LABEL_MARGIN_TOP = 2;

export default function TabLayout() {
  const theme = useTheme();
  const themeName = useThemeName();
  const segments = useSegments();

  const tabBarColors = useMemo(() => {
    const isDark = themeName === 'dark';
    const background = getThemeColor(
      theme,
      'surfaceElevated',
      getThemeColor(
        theme,
        'surface',
        getThemeColor(theme, 'background', DEFAULT_THEME_VALUES.background),
      ),
    );
    return {
      background,
      borderColor: getThemeColor(theme, 'borderColor', DEFAULT_THEME_VALUES.borderColor),
      active: getThemeColor(
        theme,
        'primary',
        getThemeColor(theme, 'brandPrimary', DEFAULT_THEME_VALUES.brandPrimary),
      ),
      inactive: getThemeColor(theme, 'tabBarInactive', DEFAULT_THEME_VALUES.tabBarInactive),
      shadowColor: getThemeColor(
        theme,
        'shadowColor',
        isDark ? DEFAULT_THEME_VALUES.dark.shadowColor : DEFAULT_THEME_VALUES.shadowColor,
      ),
    };
  }, [theme, themeName]);

  const hideTabBar =
    segments.includes('edit-profile') ||
    segments.includes('address-form') ||
    segments.includes('addresses');

  const tabBarStyle = useMemo(() => {
    const base = {
      display: (hideTabBar ? 'none' : 'flex') as 'none' | 'flex',
      height: TAB_BAR_HEIGHT,
      paddingTop: TAB_BAR_PADDING_TOP,
      paddingBottom: TAB_BAR_PADDING_BOTTOM,
      backgroundColor: tabBarColors.background,
      borderTopWidth: 1,
      borderTopColor: tabBarColors.borderColor,
    };
    return Platform.OS === 'web'
      ? { ...base, boxShadow: '0px -2px 4px rgba(0,0,0,0.1)' }
      : {
          ...base,
          elevation: 8,
          shadowColor: tabBarColors.shadowColor,
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        };
  }, [hideTabBar, tabBarColors]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarInactiveTintColor: tabBarColors.inactive,
        tabBarInactiveBackgroundColor: tabBarColors.background,
        tabBarActiveTintColor: tabBarColors.active,
        tabBarActiveBackgroundColor: tabBarColors.background,
        tabBarStyle,
        tabBarItemStyle: {
          paddingVertical: TAB_BAR_ITEM_PADDING_VERTICAL,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.poppins.regular,
          fontSize: TAB_BAR_LABEL_SIZE,
          marginTop: TAB_BAR_LABEL_MARGIN_TOP,
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
