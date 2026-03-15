import { XStack, View } from 'tamagui';

export interface DotIndicatorsProps {
  total: number;
  currentIndex: number;
  onDotPress?: (index: number) => void;
  size?: 'sm' | 'md' | 'lg';
}

const DOT_SIZES = { sm: 6, md: 8, lg: 10 } as const;

function DotIndicators({
  total,
  currentIndex,
  onDotPress,
  size = 'md',
}: DotIndicatorsProps): React.JSX.Element | null {
  if (total <= 1) return null;

  const dotSize = DOT_SIZES[size];

  return (
    <XStack gap="$2" justifyContent="center" alignItems="center">
      {Array.from({ length: total }, (_, index) => {
        const isActive = index === currentIndex;

        return (
          <View
            key={`dot-${index}`}
            width={isActive ? dotSize * 2.5 : dotSize}
            height={dotSize}
            borderRadius={dotSize / 2}
            backgroundColor={isActive ? '$primary' : '$surfaceBorder'}
            opacity={isActive ? 1 : 0.5}
            onPress={onDotPress ? () => onDotPress(index) : undefined}
            accessibilityLabel={`Go to image ${index + 1} of ${total}`}
            accessibilityRole="button"
            pressStyle={{ opacity: 0.7 }}
          />
        );
      })}
    </XStack>
  );
}

export default DotIndicators;
