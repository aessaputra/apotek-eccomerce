import React from 'react';
import { ScrollView } from 'react-native';
import { XStack, YStack, Text, styled } from 'tamagui';
import {
  ShoppingBagIcon,
  WalletIcon,
  PackageIcon,
  TruckIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@/components/icons';
import type { IconProps } from '@/components/icons';
import { MIN_TOUCH_TARGET } from '@/constants/ui';

export type OrderTab = 'all' | 'unpaid' | 'packing' | 'shipped' | 'completed' | 'cancelled';
type CountedOrderTab = Exclude<OrderTab, 'all'>;
export type OrderStatusTabCounts = Partial<Record<CountedOrderTab, number>>;

interface TabConfig {
  key: OrderTab;
  label: string;
  icon: React.ComponentType<IconProps>;
}

interface OrderStatusTabItemProps {
  tab: TabConfig;
  count?: number;
  isActive: boolean;
  onTabChange: (tab: OrderTab) => void;
}

const TABS: TabConfig[] = [
  { key: 'all', label: 'Semua pesanan', icon: ShoppingBagIcon },
  { key: 'unpaid', label: 'Belum Bayar', icon: WalletIcon },
  { key: 'packing', label: 'Dikemas', icon: PackageIcon },
  { key: 'shipped', label: 'Dikirim', icon: TruckIcon },
  { key: 'completed', label: 'Selesai', icon: CheckCircleIcon },
  { key: 'cancelled', label: 'Dibatalkan', icon: XCircleIcon },
];

const TABS_CONTENT_CONTAINER_STYLE = {
  paddingHorizontal: 12,
  gap: 6,
} as const;
const TAB_PRESS_STYLE = { opacity: 0.7 } as const;
const ACTIVE_ACCESSIBILITY_STATE = { selected: true } as const;
const INACTIVE_ACCESSIBILITY_STATE = { selected: false } as const;
const TAB_ICON_SIZE = 24;
const TAB_WIDTH = 64;
const ALL_TAB_WIDTH = 80;

interface OrderStatusTabsProps {
  activeTab?: OrderTab | null;
  counts: OrderStatusTabCounts;
  onTabChange: (tab: OrderTab) => void;
}

function isCountedTab(tab: TabConfig): tab is TabConfig & { key: CountedOrderTab } {
  return tab.key !== 'all';
}

const TabsContainer = styled(XStack, {
  backgroundColor: '$background',
  paddingVertical: '$3',
  gap: '$2',
});

const TabButton = styled(YStack, {
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$1',
  paddingVertical: '$2',
  paddingHorizontal: '$2',
  borderRadius: '$3',
  width: TAB_WIDTH,
  minHeight: MIN_TOUCH_TARGET,
  position: 'relative',

  variants: {
    active: {
      true: {
        backgroundColor: '$surfaceElevated',
      },
      false: {
        backgroundColor: 'transparent',
      },
    },
  } as const,

  defaultVariants: {
    active: false,
  },
});

const TabIcon = styled(YStack, {
  width: 28,
  height: 28,
  alignItems: 'center',
  justifyContent: 'center',

  variants: {
    active: {
      true: {
        color: '$primary',
      },
      false: {
        color: '$colorSubtle',
      },
    },
  } as const,

  defaultVariants: {
    active: false,
  },
});

const TabLabel = styled(Text, {
  fontSize: '$2',
  lineHeight: 14,
  textAlign: 'center',
  width: '100%',

  variants: {
    active: {
      true: {
        fontWeight: '600',
        color: '$primary',
      },
      false: {
        fontWeight: '400',
        color: '$colorSubtle',
      },
    },
  } as const,

  defaultVariants: {
    active: false,
  },
});

const Badge = styled(YStack, {
  position: 'absolute',
  top: 4,
  right: 4,
  backgroundColor: '$danger',
  borderRadius: '$10',
  minWidth: 18,
  height: 18,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$1',
});

const BadgeText = styled(Text, {
  fontSize: 10,
  fontWeight: '700',
  color: 'white',
  lineHeight: 14,
});

const OrderStatusTabItem = React.memo(function OrderStatusTabItem({
  tab,
  count,
  isActive,
  onTabChange,
}: OrderStatusTabItemProps) {
  const IconComponent = tab.icon;
  const handlePress = React.useCallback(() => {
    onTabChange(tab.key);
  }, [onTabChange, tab.key]);
  const accessibilityLabel = `${tab.label}, tab pesanan${isActive ? ' aktif' : ''}`;
  const accessibilityHint = `Ketuk untuk melihat ${tab.label.toLowerCase()}.`;

  return (
    <TabButton
      active={isActive}
      width={tab.key === 'all' ? ALL_TAB_WIDTH : TAB_WIDTH}
      onPress={handlePress}
      pressStyle={TAB_PRESS_STYLE}
      accessibilityRole="tab"
      accessibilityState={isActive ? ACTIVE_ACCESSIBILITY_STATE : INACTIVE_ACCESSIBILITY_STATE}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}>
      <TabIcon active={isActive}>
        <IconComponent size={TAB_ICON_SIZE} color={isActive ? '$primary' : '$colorSubtle'} />
      </TabIcon>
      <TabLabel active={isActive} numberOfLines={2}>
        {tab.label}
      </TabLabel>
      {count !== undefined && count > 0 && (
        <Badge>
          <BadgeText>{count > 99 ? '99+' : count}</BadgeText>
        </Badge>
      )}
    </TabButton>
  );
});

export function OrderStatusTabs({ activeTab, counts, onTabChange }: OrderStatusTabsProps) {
  return (
    <TabsContainer>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={TABS_CONTENT_CONTAINER_STYLE}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = isCountedTab(tab) ? (counts[tab.key] ?? 0) : undefined;

          return (
            <OrderStatusTabItem
              key={tab.key}
              tab={tab}
              count={count}
              isActive={isActive}
              onTabChange={onTabChange}
            />
          );
        })}
      </ScrollView>
    </TabsContainer>
  );
}
