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
  // Bottom bar background: Use surfaceElevated for visual separation from content
  // Best practice: Bottom navigation should have distinct background for depth and clarity
  // - Light mode: surfaceElevated = #FFFFFF (white, same as background but provides semantic separation)
  // - Dark mode: surfaceElevated = #3D3D3D (lighter than background #2D2D2D for visual depth)
  // This follows iOS Human Interface Guidelines and Material Design conventions
  // Use DEFAULT_THEME_VALUES for fallback to ensure single source of truth
  const tabBarBg = getThemeColor(
    theme,
    'surfaceElevated',
    getThemeColor(
      theme,
      'surface',
      getThemeColor(theme, 'background', DEFAULT_THEME_VALUES.background),
    ),
  );
  // Border color for top border (visual separation from content)
  // Light mode: subtle gray border, Dark mode: darker border for contrast
  // Use DEFAULT_THEME_VALUES.borderColor for fallback consistency
  const tabBarBorderColor = getThemeColor(theme, 'borderColor', DEFAULT_THEME_VALUES.borderColor);
  // Active tab color: Brand teal (primary) for BOTH light and dark modes
  // - Light mode: primary = accentLight.accent4 (#0D9488) on white bg — excellent contrast
  // - Dark mode: primary = accentDark.accent9 (~#4DB8AC) on #3D3D3D bg — good contrast (3:1+ for UI)
  // Brand teal in both modes follows Material Design 3 guidelines:
  // active navigation items use brand/primary color regardless of theme
  const tabBarActive = getThemeColor(
    theme,
    'primary',
    getThemeColor(theme, 'brandPrimary', DEFAULT_THEME_VALUES.brandPrimary),
  );
  // Use colorSubtle for inactive tabs - theme-aware subtle color
  // Light mode: #6B7280 (medium gray), Dark mode: #9CA3AF (lighter gray for contrast on dark bg)
  // Falls back to colorPress if colorSubtle not available, then DEFAULT_THEME_VALUES.colorSubtle
  const tabBarInactive = getThemeColor(
    theme,
    'colorSubtle',
    getThemeColor(theme, 'colorPress', DEFAULT_THEME_VALUES.colorSubtle),
  );

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
          // Add top border for visual separation from content
          // Follows Material Design and iOS conventions for bottom navigation
          borderTopWidth: 1,
          borderTopColor: tabBarBorderColor,
          // Platform-aware shadow: boxShadow on web (shadow* deprecated), shadow* on native
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
        // Tab bar labels must use Poppins explicitly — react-navigation doesn't inherit Tamagui fonts
        tabBarLabelStyle: {
          fontFamily: fonts.poppins.regular,
          fontSize: TAB_BAR_LABEL_SIZE,
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
