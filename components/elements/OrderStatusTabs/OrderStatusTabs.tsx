import React from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
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
  width: number;
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

const VISIBLE_TAB_COUNT = 3.5;
const TABS_HORIZONTAL_PADDING = 12;
const TAB_GAP = 6;
const TABS_CONTENT_CONTAINER_STYLE = {
  paddingHorizontal: TABS_HORIZONTAL_PADDING,
  gap: TAB_GAP,
} as const;
const TAB_PRESS_STYLE = { opacity: 0.7 } as const;
const ACTIVE_ACCESSIBILITY_STATE = { selected: true } as const;
const INACTIVE_ACCESSIBILITY_STATE = { selected: false } as const;
const TAB_ICON_SIZE = 24;
const TAB_ICON_SLOT_SIZE = 28;
const TAB_LABEL_LINE_HEIGHT = 14;
const TAB_LABEL_SLOT_HEIGHT = TAB_LABEL_LINE_HEIGHT;
const TAB_CONTENT_GAP = 4;
const TAB_VERTICAL_PADDING = 8;
const TAB_MIN_HEIGHT = Math.max(
  MIN_TOUCH_TARGET,
  TAB_ICON_SLOT_SIZE + TAB_CONTENT_GAP + TAB_LABEL_SLOT_HEIGHT + TAB_VERTICAL_PADDING * 2,
);

interface OrderStatusTabsProps {
  activeTab?: OrderTab | null;
  counts: OrderStatusTabCounts;
  onTabChange: (tab: OrderTab) => void;
}

function isCountedTab(tab: TabConfig): tab is TabConfig & { key: CountedOrderTab } {
  return tab.key !== 'all';
}

export function getOrderStatusTabWidth(containerWidth: number): number {
  // Not used anymore as we let tabs size to content, but kept for test compatibility
  const horizontalPaddingWidth = TABS_HORIZONTAL_PADDING * 2;
  const visibleGapsWidth = TAB_GAP * (VISIBLE_TAB_COUNT - 1);

  return (containerWidth - horizontalPaddingWidth - visibleGapsWidth) / VISIBLE_TAB_COUNT;
}

const TabsContainer = styled(XStack, {
  backgroundColor: '$background',
  paddingVertical: '$3',
  gap: '$2',
});

const TabButton = styled(YStack, {
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: TAB_CONTENT_GAP,
  paddingVertical: TAB_VERTICAL_PADDING,
  paddingHorizontal: '$3',
  borderRadius: '$3',
  minWidth: 72,
  minHeight: TAB_MIN_HEIGHT,
  height: TAB_MIN_HEIGHT,
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
  width: TAB_ICON_SLOT_SIZE,
  height: TAB_ICON_SLOT_SIZE,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',

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
  lineHeight: TAB_LABEL_LINE_HEIGHT,
  textAlign: 'center',
  height: TAB_LABEL_SLOT_HEIGHT,

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

const TabBadge = styled(YStack, {
  position: 'absolute',
  top: -4,
  right: -4,
  backgroundColor: '$primary',
  borderRadius: 100,
  borderWidth: 1.5,
  minWidth: 16,
  height: 16,
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 10,
  pointerEvents: 'none',

  variants: {
    active: {
      true: {
        borderColor: '$surfaceElevated',
      },
      false: {
        borderColor: '$background',
      },
    },
    wide: {
      true: {
        px: '$1.5',
      },
      false: {
        px: 0,
      },
    },
  } as const,

  defaultVariants: {
    active: false,
    wide: false,
  },
});

const OrderStatusTabItem = React.memo(function OrderStatusTabItem({
  tab,
  count,
  isActive,
  width,
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
      onPress={handlePress}
      pressStyle={TAB_PRESS_STYLE}
      accessibilityRole="tab"
      accessibilityState={isActive ? ACTIVE_ACCESSIBILITY_STATE : INACTIVE_ACCESSIBILITY_STATE}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}>
      <TabIcon active={isActive}>
        <IconComponent size={TAB_ICON_SIZE} color={isActive ? '$primary' : '$colorSubtle'} />
        {count !== undefined && count > 0 ? (
          <TabBadge active={isActive} wide={count > 9}>
            <Text color="$onPrimary" fontSize={8} fontWeight="700" lineHeight={10}>
              {count > 99 ? '99+' : count}
            </Text>
          </TabBadge>
        ) : null}
      </TabIcon>
      <TabLabel active={isActive} numberOfLines={1}>
        {tab.label}
      </TabLabel>
    </TabButton>
  );
});

export function OrderStatusTabs({ activeTab, counts, onTabChange }: OrderStatusTabsProps) {
  const { width } = useWindowDimensions();
  const tabWidth = getOrderStatusTabWidth(width);

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
              width={tabWidth}
              onTabChange={onTabChange}
            />
          );
        })}
      </ScrollView>
    </TabsContainer>
  );
}
