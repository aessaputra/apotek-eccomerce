import { useCallback, useMemo } from 'react';
import type {
  BottomTabBarButtonProps,
  BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import { Tabs, useRouter, useSegments } from 'expo-router';
import { useTheme } from 'tamagui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TabBarLabel from '@/components/layouts/TabBarLabel';
import TabBarButton from '@/components/layouts/TabBarButton';
import TabBarIcon from '@/components/layouts/TabBarIcon';
import { DEFAULT_THEME_VALUES } from '@/themes';
import {
  TAB_BAR_BORDER_TOP_WIDTH,
  TAB_BAR_ELEVATION,
  TAB_BAR_HEIGHT,
  TAB_BAR_PADDING_BOTTOM,
  TAB_BAR_PADDING_TOP,
  getBottomBarShadow,
} from '@/constants/ui';
import { TABS, shouldShowTabBar, type TabRouteName } from '@/constants/tabs';
import { getThemeColor } from '@/utils/theme';
import { getTabBarLayoutMetrics } from '@/utils/tabBarTypography';
import { Platform, useWindowDimensions } from 'react-native';

export default function TabsLayout() {
  const theme = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const currentGroup = segments[1] as string | undefined;
  const visibleSegments = segments.slice(1);

  /** Android-only bottom inset to avoid 3-button navigation overlap. */
  const androidBottomInset = Platform.OS === 'android' ? insets.bottom : 0;

  const tabBarColors = useMemo(() => {
    const background = getThemeColor(
      theme,
      'surface',
      getThemeColor(
        theme,
        'surfaceElevated',
        getThemeColor(theme, 'background', DEFAULT_THEME_VALUES.background),
      ),
    );

    return {
      background,
      borderColor: getThemeColor(
        theme,
        'surfaceBorder',
        getThemeColor(theme, 'borderColor', DEFAULT_THEME_VALUES.borderColor),
      ),
      active: getThemeColor(
        theme,
        'primary',
        getThemeColor(theme, 'brandPrimary', DEFAULT_THEME_VALUES.brandPrimary),
      ),
      inactive: getThemeColor(theme, 'tabBarInactive', DEFAULT_THEME_VALUES.tabBarInactive),
      shadowColor: getThemeColor(theme, 'shadowColor', DEFAULT_THEME_VALUES.shadowColor),
    };
  }, [theme]);

  const hideTabBar = !shouldShowTabBar(currentGroup, visibleSegments);
  const tabBarLayoutMetrics = useMemo(() => getTabBarLayoutMetrics(windowWidth), [windowWidth]);

  const tabBarStyle = useMemo(() => {
    const base = {
      display: (hideTabBar ? 'none' : 'flex') as 'none' | 'flex',
      flexDirection: 'row' as const,
      width: '100%' as const,
      height: TAB_BAR_HEIGHT + androidBottomInset,
      paddingTop: TAB_BAR_PADDING_TOP,
      paddingBottom: TAB_BAR_PADDING_BOTTOM + androidBottomInset,
      backgroundColor: tabBarColors.background,
      borderTopWidth: TAB_BAR_BORDER_TOP_WIDTH,
      borderTopColor: tabBarColors.borderColor,
    };
    const shadowStyle = getBottomBarShadow(tabBarColors.shadowColor);

    return Platform.OS === 'web'
      ? { ...base, ...shadowStyle }
      : { ...base, ...shadowStyle, elevation: TAB_BAR_ELEVATION };
  }, [hideTabBar, tabBarColors, androidBottomInset]);

  const renderTabIcon = useCallback((tabName: TabRouteName) => {
    const TabIcon = ({ color, focused }: { color: string; focused: boolean }) => {
      const tabConfig = TABS[tabName];
      return <TabBarIcon color={color} focused={focused} icon={tabConfig.icon} />;
    };
    TabIcon.displayName = `TabIcon_${tabName}`;
    return TabIcon;
  }, []);

  const renderTabButton = useCallback(
    (tabName: TabRouteName) => {
      const tabConfig = TABS[tabName];
      const TabButton = (props: BottomTabBarButtonProps) => {
        const { children, onPress, ref: _ref, ...rest } = props;

        const handlePress: BottomTabBarButtonProps['onPress'] = event => {
          if (tabName === 'profile') {
            event.preventDefault();
            router.navigate('/profile');
            return;
          }

          onPress?.(event);
        };

        return (
          <TabBarButton
            {...rest}
            onPress={handlePress}
            accessibilityHint={tabConfig.accessibilityHint}>
            {children}
          </TabBarButton>
        );
      };
      TabButton.displayName = `TabButton_${tabName}`;
      return TabButton;
    },
    [router],
  );

  const screenOptions: BottomTabNavigationOptions = {
    headerShown: false,
    tabBarInactiveTintColor: tabBarColors.inactive,
    tabBarInactiveBackgroundColor: tabBarColors.background,
    tabBarActiveTintColor: tabBarColors.active,
    tabBarActiveBackgroundColor: tabBarColors.background,
    tabBarStyle,
    tabBarItemStyle: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: tabBarLayoutMetrics.itemPaddingVertical,
      paddingHorizontal: tabBarLayoutMetrics.itemPaddingHorizontal,
    },
    tabBarLabel: ({ color, children }) => <TabBarLabel color={color}>{children}</TabBarLabel>,
  };

  const getTabScreenOptions = useCallback(
    (tabName: TabRouteName): BottomTabNavigationOptions => ({
      title: TABS[tabName].label,
      tabBarAccessibilityLabel: TABS[tabName].accessibilityLabel,
      tabBarButton: renderTabButton(tabName),
      tabBarIcon: renderTabIcon(tabName),
    }),
    [renderTabButton, renderTabIcon],
  );

  return (
    <Tabs detachInactiveScreens={false} screenOptions={screenOptions}>
      <Tabs.Screen name="home" options={getTabScreenOptions('home')} />
      <Tabs.Screen name="orders" options={getTabScreenOptions('orders')} />
      <Tabs.Screen name="notifications" options={getTabScreenOptions('notifications')} />
      <Tabs.Screen name="profile" options={getTabScreenOptions('profile')} />
    </Tabs>
  );
}
