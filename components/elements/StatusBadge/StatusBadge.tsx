import React from 'react';
import { XStack, Text, styled, GetProps } from 'tamagui';
import type { OrderStatusVariant } from '@/services';

const StatusBadgeFrame = styled(XStack, {
  alignItems: 'center',
  gap: '$2',

  variants: {
    size: {
      compact: {
        paddingHorizontal: '$2',
        paddingVertical: '$1',
        borderRadius: '$2',
      },
      default: {
        paddingHorizontal: '$3',
        paddingVertical: '$1.5',
        borderRadius: '$3',
      },
    },
    variant: {
      success: {
        backgroundColor: '$successSoft',
      },
      warning: {
        backgroundColor: '$warningSoft',
      },
      danger: {
        backgroundColor: '$dangerSoft',
      },
      primary: {
        backgroundColor: '$brandPrimarySoft',
      },
      neutral: {
        backgroundColor: '$surfaceSubtle',
      },
    },
  } as const,

  defaultVariants: {
    size: 'default',
    variant: 'neutral',
  },
});

const StatusBadgeText = styled(Text, {
  variants: {
    size: {
      compact: {
        fontSize: '$2',
        fontWeight: '600',
      },
      default: {
        fontSize: '$3',
        fontWeight: '600',
      },
    },
    variant: {
      success: {
        color: '$success',
      },
      warning: {
        color: '$warning',
      },
      danger: {
        color: '$danger',
      },
      primary: {
        color: '$onPrimary',
      },
      neutral: {
        color: '$colorSubtle',
      },
    },
  } as const,

  defaultVariants: {
    size: 'default',
    variant: 'neutral',
  },
});

export interface StatusBadgeProps {
  /** The status variant determining background and text color */
  variant: OrderStatusVariant;
  /** The size of the badge */
  size?: 'compact' | 'default';
  /** The label text to display */
  children: React.ReactNode;
}

/**
 * Status badge component for displaying order/payment status.
 * Uses semantic color variants matching the app's design system.
 *
 * @example
 * // Compact size (for cards)
 * <StatusBadge variant="primary" size="compact">
 *   Dikemas
 * </StatusBadge>
 *
 * @example
 * // Default size (for detail views)
 * <StatusBadge variant="success">
 *   Selesai
 * </StatusBadge>
 */
export const StatusBadge = React.memo(function StatusBadge({
  variant,
  size = 'default',
  children,
}: StatusBadgeProps) {
  return (
    <StatusBadgeFrame size={size} variant={variant}>
      <StatusBadgeText size={size} variant={variant}>
        {children}
      </StatusBadgeText>
    </StatusBadgeFrame>
  );
});

export type StatusBadgeFrameProps = GetProps<typeof StatusBadgeFrame>;
