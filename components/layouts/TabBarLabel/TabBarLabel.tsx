import { Text, styled } from 'tamagui';
import {
  TAB_BAR_LABEL_SIZES,
  TAB_BAR_LABEL_NUMBER_OF_LINES,
  TAB_BAR_LABEL_WIDTH,
} from '@/constants/ui';

interface TabBarLabelProps {
  color: string;
  children: React.ReactNode;
}

const LabelText = styled(Text, {
  name: 'TabBarLabel',
  numberOfLines: TAB_BAR_LABEL_NUMBER_OF_LINES,
  ellipsizeMode: 'tail',
  textAlign: 'center',
  fontSize: TAB_BAR_LABEL_SIZES.lg,
  fontWeight: '500',
  lineHeight: 17,
  maxWidth: TAB_BAR_LABEL_WIDTH,
  alignSelf: 'stretch',
  flexShrink: 1,
  paddingHorizontal: 2,
  includeFontPadding: false,
  maxFontSizeMultiplier: 1,
  $tabMd: {
    fontSize: TAB_BAR_LABEL_SIZES.md,
    lineHeight: 16,
  },
  $tabSm: {
    fontSize: TAB_BAR_LABEL_SIZES.sm,
    lineHeight: 15,
    paddingHorizontal: 0,
  },
  $tabXs: {
    fontSize: TAB_BAR_LABEL_SIZES.xs,
    lineHeight: 14,
  },
  $tabLg: {
    fontSize: TAB_BAR_LABEL_SIZES.lg,
    lineHeight: 17,
  },
});

function TabBarLabel({ color, children }: TabBarLabelProps) {
  return (
    <LabelText color={color} testID="tab-bar-label">
      {children}
    </LabelText>
  );
}

export default TabBarLabel;
export type { TabBarLabelProps };
