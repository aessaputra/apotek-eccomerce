import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { XStack, Text } from 'tamagui';
import { ClockIcon } from '@/components/icons';

export interface PaymentCountdownTimerProps {
  createdAt: string;
  expiryHours?: number;
  onExpired?: () => void;
}

type UrgencyLevel = 'normal' | 'warning' | 'critical' | 'expired';

interface TimeLeft {
  hours: number;
  minutes: number;
  seconds: number;
  totalMs: number;
  isExpired: boolean;
}

function calculateTimeLeft(createdAt: string, expiryHours: number): TimeLeft {
  const created = new Date(createdAt).getTime();
  const deadline = created + expiryHours * 60 * 60 * 1000;
  const now = Date.now();
  const totalMs = deadline - now;

  if (totalMs <= 0) {
    return { hours: 0, minutes: 0, seconds: 0, totalMs: 0, isExpired: true };
  }

  const hours = Math.floor(totalMs / (1000 * 60 * 60));
  const minutes = Math.floor((totalMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((totalMs % (1000 * 60)) / 1000);

  return { hours, minutes, seconds, totalMs, isExpired: false };
}

function formatTimeUnit(value: number): string {
  return value.toString().padStart(2, '0');
}

function getUrgencyLevel(timeLeft: TimeLeft): UrgencyLevel {
  if (timeLeft.isExpired) return 'expired';
  if (timeLeft.hours === 0 && timeLeft.minutes < 30) return 'critical';
  if (timeLeft.hours < 2) return 'warning';
  return 'normal';
}

function getUrgencyColors(urgency: UrgencyLevel) {
  switch (urgency) {
    case 'critical':
      return { bg: '$dangerSoft', text: '$danger', icon: '$danger' };
    case 'expired':
      return { bg: '$surfaceSubtle', text: '$colorMuted', icon: '$colorMuted' };
    case 'warning':
    case 'normal':
    default:
      return { bg: '$warningSoft', text: '$warning', icon: '$warning' };
  }
}

export const PaymentCountdownTimer = React.memo(function PaymentCountdownTimer({
  createdAt,
  expiryHours = 24,
  onExpired,
}: PaymentCountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() =>
    calculateTimeLeft(createdAt, expiryHours),
  );

  const updateTimer = useCallback(() => {
    const newTimeLeft = calculateTimeLeft(createdAt, expiryHours);
    setTimeLeft(newTimeLeft);

    if (newTimeLeft.isExpired && onExpired) {
      onExpired();
    }
  }, [createdAt, expiryHours, onExpired]);

  useEffect(() => {
    updateTimer();
    const intervalId = setInterval(updateTimer, 60000);
    return () => clearInterval(intervalId);
  }, [updateTimer]);

  const urgency = useMemo(() => getUrgencyLevel(timeLeft), [timeLeft]);
  const colors = useMemo(() => getUrgencyColors(urgency), [urgency]);

  const formattedTime = useMemo(() => {
    if (timeLeft.isExpired) {
      return 'Pembayaran Kadaluarsa';
    }

    if (timeLeft.hours > 0) {
      return `${timeLeft.hours}j ${formatTimeUnit(timeLeft.minutes)}m`;
    }

    if (timeLeft.minutes > 0) {
      return `${timeLeft.minutes}m ${formatTimeUnit(timeLeft.seconds)}d`;
    }

    return `${timeLeft.seconds}d`;
  }, [timeLeft]);

  if (timeLeft.isExpired) {
    return (
      <XStack
        alignItems="center"
        justifyContent="center"
        gap="$2"
        paddingVertical="$2"
        paddingHorizontal="$3"
        borderRadius="$3"
        backgroundColor={colors.bg}>
        <ClockIcon size={16} color={colors.icon} />
        <Text fontSize="$3" fontWeight="600" color={colors.text}>
          {formattedTime}
        </Text>
      </XStack>
    );
  }

  return (
    <XStack
      alignItems="center"
      justifyContent="center"
      gap="$2"
      paddingVertical="$2"
      paddingHorizontal="$3"
      borderRadius="$3"
      backgroundColor={colors.bg}>
      <ClockIcon size={16} color={colors.icon} />
      <Text fontSize="$3" color={colors.text}>
        Bayar dalam{' '}
        <Text fontSize="$3" fontWeight="700" color={colors.text}>
          {formattedTime}
        </Text>
      </Text>
    </XStack>
  );
});

export default PaymentCountdownTimer;
