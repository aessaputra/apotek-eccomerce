import { YStack, Text, styled } from 'tamagui';
import { BellIcon, WrenchIcon } from '@/components/icons';
import { useTheme } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { ICON_SIZES, EMPTY_STATE, SPACING_TOKENS } from '@/constants/ui';

const Container = styled(YStack, {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '$background',
  padding: SPACING_TOKENS.CONTAINER_PADDING,
  gap: SPACING_TOKENS.CONTAINER_GAP,
});

const IconContainer = styled(YStack, {
  width: EMPTY_STATE.ICON_CONTAINER_SIZE,
  height: EMPTY_STATE.ICON_CONTAINER_SIZE,
  borderRadius: SPACING_TOKENS.ICON_CONTAINER_RADIUS,
  backgroundColor: '$surface',
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: EMPTY_STATE.BORDER_WIDTH,
  borderColor: '$surfaceBorder',
});

const Title = styled(Text, {
  fontSize: EMPTY_STATE.TITLE_FONT_SIZE,
  fontWeight: '700',
  color: '$color',
  textAlign: 'center',
});

const Subtitle = styled(Text, {
  fontSize: EMPTY_STATE.BODY_FONT_SIZE,
  color: '$colorSubtle',
  textAlign: 'center',
  maxWidth: EMPTY_STATE.SUBTITLE_MAX_WIDTH,
  lineHeight: EMPTY_STATE.SUBTITLE_LINE_HEIGHT,
});

const ComingSoonBadge = styled(YStack, {
  backgroundColor: '$infoSoft',
  paddingHorizontal: SPACING_TOKENS.BADGE_PADDING_HORIZONTAL,
  paddingVertical: SPACING_TOKENS.BADGE_PADDING_VERTICAL,
  borderRadius: SPACING_TOKENS.BADGE_BORDER_RADIUS,
  marginTop: SPACING_TOKENS.BADGE_MARGIN_TOP,
});

const BadgeText = styled(Text, {
  fontSize: EMPTY_STATE.LABEL_FONT_SIZE,
  fontWeight: '600',
  color: '$info',
});

function Notifications() {
  const theme = useTheme();
  const iconColor = getThemeColor(theme, 'colorPress');
  const accentColor = getThemeColor(theme, 'primary');

  return (
    <Container>
      <IconContainer>
        <BellIcon size={ICON_SIZES.XL} color={accentColor} />
      </IconContainer>

      <YStack alignItems="center" gap={SPACING_TOKENS.CONTENT_STACK_GAP}>
        <Title>Notifikasi</Title>
        <Subtitle>
          Fitur notifikasi sedang dalam pengembangan. Nantikan update selanjutnya!
        </Subtitle>
      </YStack>

      <ComingSoonBadge>
        <BadgeText>Segera Hadir</BadgeText>
      </ComingSoonBadge>

      <YStack
        flexDirection="row"
        alignItems="center"
        gap={SPACING_TOKENS.MAINTENANCE_ROW_GAP}
        marginTop={SPACING_TOKENS.MAINTENANCE_ROW_MARGIN_TOP}
        opacity={EMPTY_STATE.MUTED_OPACITY}>
        <WrenchIcon size={ICON_SIZES.SMALL} color={iconColor} />
        <Text fontSize={EMPTY_STATE.LABEL_FONT_SIZE} color="$colorMuted">
          Under Maintenance
        </Text>
      </YStack>
    </Container>
  );
}

export default Notifications;
