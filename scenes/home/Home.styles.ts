import { Card, Text, YStack, styled } from 'tamagui';

export const ScreenRoot = styled(YStack, {
  flex: 1,
  backgroundColor: '$background',
});

export const ContentStack = styled(YStack, {
  width: '100%',
  maxWidth: 560,
  alignSelf: 'center',
  gap: '$4',

  $gtSm: {
    maxWidth: 720,
    gap: '$4.5',
  },

  $gtMd: {
    maxWidth: 920,
    gap: '$5',
  },

  $gtLg: {
    maxWidth: 1080,
  },
});

export const SectionTitle = styled(Text, {
  color: '$color',
  fontSize: 14,
  fontWeight: '700',
});

export const SurfaceIconButton = styled(Card, {
  width: 44,
  height: 44,
  borderRadius: '$4',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  alignItems: 'center',
  justifyContent: 'center',
  pressStyle: { opacity: 0.9 },
});

export const SearchShell = styled(Card, {
  alignItems: 'center',
  flexDirection: 'row',
  borderRadius: '$10',
  borderWidth: 1,
  borderColor: '$surfaceBorder',
  backgroundColor: '$surface',
  height: 46,
  paddingLeft: '$2',
  paddingRight: '$3',
  gap: '$2',
  pressStyle: { opacity: 0.92 },
});

export const ErrorCallout = styled(Card, {
  borderRadius: '$5',
  borderWidth: 1,
  borderColor: '$borderColor',
  backgroundColor: '$surface',
  padding: '$4',
  gap: '$2.5',
});
