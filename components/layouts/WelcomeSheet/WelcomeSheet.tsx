import { useCallback } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Sheet, Text, XStack, YStack, styled, useTheme } from 'tamagui';
import GradientButton from '@/components/elements/GradientButton';
import { PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';
import { windowWidth } from '@/utils/deviceInfo';
import config from '@/utils/config';
import { getThemeColor } from '@/utils/theme';

const ContentStack = styled(YStack, {
  width: '100%',
  maxWidth: 560,
  alignSelf: 'center',
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
  borderColor: '$sheetOverlay',
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
  alignItems: 'center',
});

export interface WelcomeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function WelcomeSheet({ open, onOpenChange }: WelcomeSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const envEntries = Object.entries(config);
  const primaryColor = getThemeColor(theme, 'brandPrimary');
  const brandPrimarySoftColor = getThemeColor(theme, 'brandPrimarySoft');

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      modal
      dismissOnOverlayPress
      dismissOnSnapToBottom
      snapPoints={[85]}
      animation="medium"
      animationConfig={{
        type: 'spring',
        damping: 24,
        mass: 0.9,
        stiffness: 200,
      }}>
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        backgroundColor="$sheetOverlay"
      />
      <Sheet.Handle />
      <Sheet.Frame
        backgroundColor="$surfaceSubtle"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
        pointerEvents="box-none">
        <Sheet.ScrollView
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          nestedScrollEnabled>
          <ContentStack
            px="$4"
            pt="$3"
            pb={Math.max(insets.bottom + 12, 20)}
            pointerEvents="box-none">
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

            <ButtonContainer pointerEvents="auto">
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
                onPress={handleClose}
              />
            </ButtonContainer>
          </ContentStack>
        </Sheet.ScrollView>
      </Sheet.Frame>
    </Sheet>
  );
}

export default WelcomeSheet;
