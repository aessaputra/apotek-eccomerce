import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, GetProps, Input, Text, XStack, styled } from 'tamagui';

const QuantityContainer = styled(XStack, {
  alignItems: 'center',
  gap: '$1',
  padding: '$1',
  borderRadius: '$6',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  backgroundColor: '$surface',
});

const QuantityButton = styled(Button, {
  width: 24,
  height: 24,
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
  minWidth: 32,
  height: 24,
  borderRadius: '$4',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$surface',
  paddingHorizontal: '$2',
});

export interface QuantitySelectorProps extends Omit<GetProps<typeof XStack>, 'onChange'> {
  value: number;
  min?: number;
  max: number;
  onChange: (nextValue: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  disableAnimation?: boolean;
}

function QuantitySelector({
  value,
  min = 1,
  max,
  onChange,
  disabled = false,
  size = 'md',
  disableAnimation = false,
  ...stackProps
}: QuantitySelectorProps) {
  const lowerBound = Math.max(min, 0);
  const upperBound = Math.max(lowerBound, max);
  const nextValue = Math.min(Math.max(value, lowerBound), upperBound);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(String(nextValue));

  useEffect(() => {
    if (isEditing) return;
    setDraftValue(String(nextValue));
  }, [isEditing, nextValue]);

  const metrics = useMemo(
    () =>
      size === 'sm'
        ? {
            buttonSize: 20,
            valueMinWidth: 24,
            valueHeight: 20,
            valueFontSize: 11,
            buttonFontSize: 12,
            buttonLineHeight: 12,
          }
        : {
            buttonSize: 32,
            valueMinWidth: 40,
            valueHeight: 32,
            valueFontSize: 14,
            buttonFontSize: 16,
            buttonLineHeight: 16,
          },
    [size],
  );

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

  const handleStartEditing = useCallback(() => {
    if (disabled) return;
    setDraftValue(String(nextValue));
    setIsEditing(true);
  }, [disabled, nextValue]);

  const handleDraftBlur = useCallback(() => {
    setIsEditing(false);
    setDraftValue(String(nextValue));
  }, [nextValue]);

  const handleSubmitEditing = useCallback(() => {
    const parsed = Number.parseInt(draftValue, 10);
    const normalized = Number.isNaN(parsed)
      ? nextValue
      : Math.min(Math.max(parsed, lowerBound), upperBound);

    if (normalized !== nextValue) {
      onChange(normalized);
    }

    setIsEditing(false);
    setDraftValue(String(normalized));
  }, [draftValue, lowerBound, nextValue, onChange, upperBound]);

  return (
    <QuantityContainer
      animation={disableAnimation ? undefined : 'quick'}
      enterStyle={disableAnimation ? undefined : { opacity: 0, y: 8 }}
      {...stackProps}>
      <QuantityButton
        width={metrics.buttonSize}
        height={metrics.buttonSize}
        onPress={handleDecrease}
        disabled={!canDecrease}>
        <Text
          fontSize={metrics.buttonFontSize}
          lineHeight={metrics.buttonLineHeight}
          color="$color"
          fontWeight="700">
          -
        </Text>
      </QuantityButton>

      {isEditing ? (
        <Input
          key="quantity-input"
          autoFocus
          keyboardType="numeric"
          returnKeyType="done"
          value={draftValue}
          onChangeText={setDraftValue}
          onSubmitEditing={handleSubmitEditing}
          onBlur={handleDraftBlur}
          minWidth={metrics.valueMinWidth}
          width={metrics.valueMinWidth}
          height={metrics.valueHeight}
          borderRadius="$4"
          borderWidth={1}
          borderColor="$surfaceBorder"
          backgroundColor="$surface"
          color="$color"
          fontWeight="700"
          fontSize={metrics.valueFontSize}
          textAlign="center"
          paddingHorizontal={0}
          paddingVertical={0}
        />
      ) : (
        <QuantityValueCard
          minWidth={metrics.valueMinWidth}
          height={metrics.valueHeight}
          paddingHorizontal={size === 'sm' ? '$1.5' : '$2'}
          onPress={handleStartEditing}>
          <Text
            fontSize={metrics.valueFontSize}
            color="$color"
            fontWeight="700"
            animation="quick"
            key={nextValue}>
            {nextValue}
          </Text>
        </QuantityValueCard>
      )}

      <QuantityButton
        width={metrics.buttonSize}
        height={metrics.buttonSize}
        onPress={handleIncrease}
        disabled={!canIncrease}>
        <Text
          fontSize={metrics.buttonFontSize}
          lineHeight={metrics.buttonLineHeight}
          color="$color"
          fontWeight="700">
          +
        </Text>
      </QuantityButton>
    </QuantityContainer>
  );
}

export default QuantitySelector;
