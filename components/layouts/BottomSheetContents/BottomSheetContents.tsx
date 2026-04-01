import GradientButton from '@/components/elements/GradientButton';
import { YStack, XStack, Text, styled, useTheme } from 'tamagui';
import { windowWidth } from '@/utils/deviceInfo';
import config from '@/utils/config';
import { PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';
import { getThemeColor } from '@/utils/theme';

const RootStack = styled(YStack, {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  px: '$5',
  backgroundColor: '$background',
});

const ContentStack = styled(YStack, {
  width: '100%',
  gap: '$4',
});

const HeaderText = styled(Text, {
  width: '100%',
  textAlign: 'center',
  color: '$color',
  fontSize: 16,
  fontWeight: '700',
  lineHeight: 24,
});

const DescriptionText = styled(Text, {
  width: '100%',
  color: '$colorSubtle',
  fontSize: 14,
  lineHeight: 21,
});

const SectionLabel = styled(Text, {
  width: '100%',
  color: '$color',
  fontSize: 14,
  fontWeight: '600',
  lineHeight: 20,
});

const EnvListCard = styled(YStack, {
  width: '100%',
  p: '$3',
  gap: '$2',
  backgroundColor: '$surfaceSubtle',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  borderRadius: '$4',
});

const EnvItemRow = styled(XStack, {
  width: '100%',
  alignItems: 'flex-start',
  gap: '$2',
});

const EnvKeyText = styled(Text, {
  color: '$color',
  fontSize: 14,
  fontWeight: '700',
  lineHeight: 20,
});

const EnvValueText = styled(Text, {
  flex: 1,
  minWidth: 0,
  color: '$colorSubtle',
  fontSize: 14,
  lineHeight: 20,
});

const ButtonContainer = styled(YStack, {
  width: '100%',
  pt: '$2',
  pb: '$5',
  alignItems: 'center',
});

type WelcomeBottomSheetContentsProps = {
  onClose: () => void;
};

export default function BottomSheetContents({ onClose }: WelcomeBottomSheetContentsProps) {
  const theme = useTheme();
  const envEntries = Object.entries(config);
  const primaryColor = getThemeColor(theme, 'brandPrimary');
  const brandPrimarySoftColor = getThemeColor(theme, 'brandPrimarySoft');

  return (
    <RootStack>
      <ContentStack>
        <HeaderText>🎉 Selamat datang!</HeaderText>

        <DescriptionText>
          Aplikasi Apotek Eccomerce berjalan di environment
          <Text color="$color" fontWeight="700">{` ${config.env} `}</Text>🚀
        </DescriptionText>

        <YStack width="100%" gap="$3">
          <SectionLabel>Variabel environment yang dimuat:</SectionLabel>
          <EnvListCard>
            {envEntries.map(([key, value]) => (
              <EnvItemRow key={key}>
                <EnvKeyText>{`✅ ${key}:`}</EnvKeyText>
                <EnvValueText>{String(value)}</EnvValueText>
              </EnvItemRow>
            ))}
          </EnvListCard>
        </YStack>

        <DescriptionText>
          {`Setup selesai. Selamat berbelanja di Apotek Eccomerce.\n\nHappy coding!`}
        </DescriptionText>

        <ButtonContainer>
          <GradientButton
            title="OK"
            titleStyle={{ ...PRIMARY_BUTTON_TITLE_STYLE, textAlign: 'center' }}
            justifyContent="center"
            alignItems="center"
            borderRadius={22}
            height={44}
            width={windowWidth / 2}
            backgroundColor="$primary"
            gradientBackgroundProps={{
              colors: [primaryColor, brandPrimarySoftColor],
              start: { x: 0, y: 1 },
              end: { x: 0.8, y: 0 },
            }}
            onPress={onClose}
          />
        </ButtonContainer>
      </ContentStack>
    </RootStack>
  );
}
