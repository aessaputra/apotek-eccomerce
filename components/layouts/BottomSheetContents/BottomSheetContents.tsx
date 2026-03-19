import GradientButton from '@/components/elements/GradientButton';
import { YStack, XStack, Text, useTheme } from 'tamagui';
import { windowWidth } from '@/utils/deviceInfo';
import config from '@/utils/config';
import { getThemeColor } from '@/utils/theme';

type WelcomeBottomSheetContentsProps = {
  onClose: () => void;
};

export default function BottomSheetContents({ onClose }: WelcomeBottomSheetContentsProps) {
  const theme = useTheme();
  return (
    <YStack
      flex={1}
      justifyContent="center"
      alignItems="center"
      width="100%"
      paddingHorizontal={24}
      backgroundColor="$background">
      <Text
        fontSize={16}
        fontWeight="700"
        color="$color"
        marginTop={16}
        marginBottom={32}
        width="100%"
        textAlign="center">
        🎉 Selamat datang!{' '}
      </Text>
      <Text fontSize={14} width="100%" color="$color" marginBottom={32}>
        Aplikasi Apotek Eccomerce berjalan di environment
        <Text fontWeight="700">{` ${config.env} `}</Text>🚀
      </Text>
      <Text fontSize={14} width="100%" color="$color" marginBottom={8}>
        Variabel environment yang dimuat:
      </Text>
      {Object.entries(config).map(([key, value]) => (
        <XStack key={key} alignItems="center" width="100%" gap="$1">
          <Text fontSize={14} fontWeight="700" color="$color">{`✅ ${key}: `}</Text>
          <Text fontSize={14} color="$color">
            {value}
          </Text>
        </XStack>
      ))}
      <Text fontSize={14} width="100%" color="$color" marginVertical={32}>
        {`Setup selesai. Selamat berbelanja di Apotek Eccomerce.\n\nHappy coding!`}
      </Text>
      <GradientButton
        title="OK"
        titleStyle={{ color: getThemeColor(theme, 'background'), textAlign: 'center' }}
        justifyContent="center"
        alignItems="center"
        borderRadius={22}
        height={44}
        width={windowWidth / 2}
        backgroundColor={getThemeColor(theme, 'color')}
        marginBottom={40}
        gradientBackgroundProps={{
          colors: [getThemeColor(theme, 'color'), getThemeColor(theme, 'color5')],
          start: { x: 0, y: 1 },
          end: { x: 0.8, y: 0 },
        }}
        onPress={onClose}
      />
    </YStack>
  );
}
