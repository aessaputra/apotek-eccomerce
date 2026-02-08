import { YStack, Text, useTheme } from 'tamagui';
import GradientButton from '@/components/elements/GradientButton';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getThemeColor } from '@/utils/theme';

export default function Details() {
  const router = useRouter();
  const theme = useTheme();
  const { from } = useLocalSearchParams<{ from?: string }>();
  return (
    <YStack
      flex={1}
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      backgroundColor="$background">
      <Text fontSize={24} marginBottom={20} color="$color">{`Details (from ${from})`}</Text>
      <GradientButton
        title="Go back to Home"
        titleStyle={{ color: '$background', textAlign: 'center' }}
        paddingVertical={8}
        paddingHorizontal={16}
        borderRadius={22}
        height={44}
        width="50%"
        gradientBackgroundProps={{
          colors: [
            getThemeColor(theme, 'color', '#0D9488'),
            getThemeColor(theme, 'color5', '#14B8A6'),
          ],
          start: { x: 0, y: 1 },
          end: { x: 0.8, y: 0 },
        }}
        onPress={() => router.back()}
      />
    </YStack>
  );
}
