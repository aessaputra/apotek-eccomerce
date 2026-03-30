import { Text, styled } from 'tamagui';
import {
  TAB_BAR_LABEL_SIZE,
  TAB_BAR_LABEL_NUMBER_OF_LINES,
  TAB_BAR_LABEL_MIN_FONT_SCALE,
  TAB_BAR_LABEL_WIDTH,
} from '@/constants/ui';

interface TabBarLabelProps {
  color: string;
  children: React.ReactNode;
}

const LabelText = styled(Text, {
  numberOfLines: TAB_BAR_LABEL_NUMBER_OF_LINES,
  adjustsFontSizeToFit: true,
  minimumFontScale: TAB_BAR_LABEL_MIN_FONT_SCALE,
  ellipsizeMode: 'tail',
  fontSize: TAB_BAR_LABEL_SIZE,
  textAlign: 'center',
  width: TAB_BAR_LABEL_WIDTH,
  includeFontPadding: false,
});

function TabBarLabel({ color, children }: TabBarLabelProps) {
  return (
    <LabelText style={{ color }} testID="tab-bar-label">
      {children}
    </LabelText>
  );
}

export default TabBarLabel;
export type { TabBarLabelProps };
