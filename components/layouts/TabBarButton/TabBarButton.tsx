import React from 'react';
import { Pressable, View } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { YStack } from 'tamagui';
import { TAB_BAR_LABEL_MARGIN_TOP_TOKEN } from '@/constants/ui';

const TabBarButton = React.forwardRef<View, BottomTabBarButtonProps>(
  function TabBarButton(props, ref) {
    const { children, ...pressableProps } = props;
    return (
      <Pressable ref={ref} {...pressableProps} accessibilityRole="tab" style={{ flex: 1 }}>
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          marginTop={TAB_BAR_LABEL_MARGIN_TOP_TOKEN}>
          {children}
        </YStack>
      </Pressable>
    );
  },
);

export default TabBarButton;
export type { BottomTabBarButtonProps as TabBarButtonProps };
