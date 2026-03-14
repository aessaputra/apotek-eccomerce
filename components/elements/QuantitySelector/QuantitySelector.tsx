import { useCallback } from 'react';
import { Button, Card, GetProps, Text, XStack, styled } from 'tamagui';

const QuantityContainer = styled(XStack, {
  alignItems: 'center',
  gap: '$2',
  padding: '$1.5',
  borderRadius: '$6',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  backgroundColor: '$surface',
  animation: 'quick',
  enterStyle: { opacity: 0, y: 8 },
});

const QuantityButton = styled(Button, {
  width: 36,
  height: 36,
  borderRadius: '$10',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  backgroundColor: '$surfaceSubtle',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 0,
  paddingVertical: 0,
  pressStyle: { opacity: 0.9, scale: 0.96 },
  disabledStyle: {
    opacity: 0.5,
  },
});

const QuantityValueCard = styled(Card, {
  minWidth: 52,
  height: 36,
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$surface',
  paddingHorizontal: '$2.5',
});

export interface QuantitySelectorProps extends Omit<GetProps<typeof XStack>, 'onChange'> {
  value: number;
  min?: number;
  max: number;
  onChange: (nextValue: number) => void;
  disabled?: boolean;
}

function QuantitySelector({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  ...stackProps
}: QuantitySelectorProps) {
  const lowerBound = Math.max(min, 1);
  const upperBound = Math.max(lowerBound, max);
  const nextValue = Math.min(Math.max(value, lowerBound), upperBound);

  const canDecrease = !disabled && nextValue > lowerBound;
  const canIncrease = !disabled && nextValue < upperBound;

  const handleDecrease = useCallback(() => {
    if (!canDecrease) return;
    onChange(nextValue - 1);
  }, [canDecrease, nextValue, onChange]);

  const handleIncrease = useCallback(() => {
    if (!canIncrease) return;
    onChange(nextValue + 1);
  }, [canIncrease, nextValue, onChange]);

  return (
    <QuantityContainer {...stackProps}>
      <QuantityButton onPress={handleDecrease} disabled={!canDecrease}>
        <Text fontSize={18} lineHeight={18} color="$color" fontWeight="700">
          -
        </Text>
      </QuantityButton>

      <QuantityValueCard>
        <Text fontSize={16} color="$color" fontWeight="700" animation="quick" key={nextValue}>
          {nextValue}
        </Text>
      </QuantityValueCard>

      <QuantityButton onPress={handleIncrease} disabled={!canIncrease}>
        <Text fontSize={18} lineHeight={18} color="$color" fontWeight="700">
          +
        </Text>
      </QuantityButton>
    </QuantityContainer>
  );
}

export default QuantitySelector;
