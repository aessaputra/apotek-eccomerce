import type { ComponentProps } from 'react';
import { YStack } from 'tamagui';
import { HomeIcon } from '@/components/icons';
import TabBarIconWithPill from '../TabBarIconWithPill';
import { ICON_SIZES } from '@/constants/ui';

interface TabBarIconProps {
  color: string;
  focused: boolean;
  icon: React.ComponentType<ComponentProps<typeof HomeIcon>>;
}

function TabBarIcon({ color, focused, icon: IconComponent }: TabBarIconProps) {
  return (
    <TabBarIconWithPill focused={focused}>
      <YStack
        width={ICON_SIZES.BUTTON}
        height={ICON_SIZES.BUTTON}
        alignItems="center"
        justifyContent="center">
        <IconComponent size={ICON_SIZES.BUTTON} color={color} />
      </YStack>
    </TabBarIconWithPill>
  );
}

export default TabBarIcon;
export type { TabBarIconProps };
