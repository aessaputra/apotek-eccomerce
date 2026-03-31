import { useWindowDimensions } from 'react-native';
import { Text, styled } from 'tamagui';
import { TAB_BAR_LABEL_NUMBER_OF_LINES, TAB_BAR_LABEL_WIDTH } from '@/constants/ui';
import { getTabBarLabelFontSize } from '@/utils/tabBarTypography';

interface TabBarLabelProps {
  color: string;
  children: React.ReactNode;
}

const LabelText = styled(Text, {
  numberOfLines: TAB_BAR_LABEL_NUMBER_OF_LINES,
  ellipsizeMode: 'tail',
  textAlign: 'center',
  width: TAB_BAR_LABEL_WIDTH,
  includeFontPadding: false,
  maxFontSizeMultiplier: 1,
});

function TabBarLabel({ color, children }: TabBarLabelProps) {
  const { width } = useWindowDimensions();
  const fontSize = getTabBarLabelFontSize(width);

  return (
    <LabelText style={{ color, fontSize }} testID="tab-bar-label">
      {children}
    </LabelText>
  );
}

export default TabBarLabel;
export type { TabBarLabelProps };
