import { Tabs, useSegments } from 'expo-router';
import { Platform } from 'react-native';
import { useTheme, useThemeName } from 'tamagui';
import { AntDesign } from '@expo/vector-icons';
import { getThemeColor } from '@/utils/theme';
import { DEFAULT_THEME_VALUES } from '@/themes';
import { ICON_SIZES } from '@/constants/ui';

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
  // Active tab color: Theme-aware for optimal contrast
  // Light mode: Use brandPrimary (teal) for brand consistency and good contrast on white background
  // Dark mode: Use white (color) for maximum contrast and prominence on dark background (#3D3D3D)
  // This ensures active tab is always clearly visible and follows platform best practices
  // Use DEFAULT_THEME_VALUES for fallback to ensure consistency with theme definitions
  const tabBarActive = isDark
    ? getThemeColor(theme, 'color', DEFAULT_THEME_VALUES.dark.color) // White for maximum contrast in dark mode
    : getThemeColor(
        theme,
        'primary',
        getThemeColor(theme, 'brandPrimary', DEFAULT_THEME_VALUES.brandPrimary),
      ); // Teal for brand consistency in light mode
  // Use colorSubtle for inactive tabs - theme-aware subtle color for better contrast
  // Light mode: #6B7280 (medium gray), Dark mode: #6B7280 (medium gray)
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
          tabBarIcon: ({ color }) => (
            <AntDesign name="home" size={ICON_SIZES.BUTTON} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pesanan',
          tabBarIcon: ({ color }) => (
            <AntDesign name="solution" size={ICON_SIZES.BUTTON} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Akun',
          tabBarIcon: ({ color }) => (
            <AntDesign name="user" size={ICON_SIZES.BUTTON} color={color} />
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
