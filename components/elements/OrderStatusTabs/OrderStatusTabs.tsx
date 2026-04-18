import React from 'react';
import { ScrollView } from 'react-native';
import { XStack, YStack, Text, styled } from 'tamagui';
import { WalletIcon, PackageIcon, TruckIcon, CheckCircleIcon } from '@/components/icons';
import type { IconProps } from '@/components/icons';

export type OrderTab = 'unpaid' | 'packing' | 'shipped' | 'completed';

interface TabConfig {
  key: OrderTab;
  label: string;
  icon: React.ComponentType<IconProps>;
}

const TABS: TabConfig[] = [
  { key: 'unpaid', label: 'Belum Bayar', icon: WalletIcon },
  { key: 'packing', label: 'Dikemas', icon: PackageIcon },
  { key: 'shipped', label: 'Dikirim', icon: TruckIcon },
  { key: 'completed', label: 'Selesai', icon: CheckCircleIcon },
];

interface OrderStatusTabsProps {
  activeTab?: OrderTab | null;
  counts: {
    unpaid: number;
    packing: number;
    shipped: number;
    completed: number;
  };
  onTabChange: (tab: OrderTab) => void;
}

const TabsContainer = styled(XStack, {
  backgroundColor: '$background',
  paddingVertical: '$3',
  paddingHorizontal: '$4',
  gap: '$2',
});

const TabButton = styled(YStack, {
  alignItems: 'center',
  justifyContent: 'center',
  gap: '$1',
  paddingVertical: '$2',
  paddingHorizontal: '$2',
  borderRadius: '$3',
  minWidth: 65,
  flex: 1,
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
  width: 32,
  height: 32,
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
  textAlign: 'center',

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

export function OrderStatusTabs({ activeTab, counts, onTabChange }: OrderStatusTabsProps) {
  return (
    <TabsContainer>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'space-between',
        }}>
        {TABS.map(tab => {
          const isActive = activeTab === tab.key;
          const count = counts[tab.key] || 0;
          const IconComponent = tab.icon;

          return (
            <TabButton
              key={tab.key}
              active={isActive}
              onPress={() => onTabChange(tab.key)}
              pressStyle={{ opacity: 0.7 }}>
              <TabIcon active={isActive}>
                <IconComponent size={28} color={isActive ? '$primary' : '$colorSubtle'} />
              </TabIcon>
              <TabLabel active={isActive}>{tab.label}</TabLabel>
              {count > 0 && (
                <Badge>
                  <BadgeText>{count > 99 ? '99+' : count}</BadgeText>
                </Badge>
              )}
            </TabButton>
          );
        })}
      </ScrollView>
    </TabsContainer>
  );
}
