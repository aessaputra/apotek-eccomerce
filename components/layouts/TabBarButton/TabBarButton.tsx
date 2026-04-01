import React from 'react';
import { Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import type { View } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { YStack } from 'tamagui';
import { getTabBarLayoutMetrics } from '@/utils/tabBarTypography';

const TabBarButton = React.forwardRef<View, BottomTabBarButtonProps>(
  function TabBarButton(props, ref) {
    const { children, style, ...pressableProps } = props;
    const { width } = useWindowDimensions();
    const { labelMarginTop } = getTabBarLayoutMetrics(width);

    return (
      <Pressable
        ref={ref}
        {...pressableProps}
        accessibilityRole="tab"
        style={StyleSheet.flatten([{ flex: 1, minWidth: 0 }, style])}>
        <YStack
          flex={1}
          width="100%"
          maxWidth="100%"
          minWidth={0}
          alignItems="center"
          justifyContent="center"
          marginTop={labelMarginTop}>
          {children}
        </YStack>
      </Pressable>
    );
  },
);

export default TabBarButton;
export type { BottomTabBarButtonProps as TabBarButtonProps };
