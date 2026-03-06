import { StyleProp, ViewStyle } from 'react-native';
import { LinearGradient, LinearGradientProps } from 'expo-linear-gradient';
import Button, { ButtonProps } from '../Button';

export interface GradientButtonProps extends ButtonProps {
  gradientBackgroundProps: LinearGradientProps;
  gradientBackgroundStyle?: StyleProp<ViewStyle>;
}

function GradientButton({
  gradientBackgroundProps,
  gradientBackgroundStyle,
  style,
  ...others
}: GradientButtonProps) {
  return (
    <Button
      {...others}
      style={[
        {
          position: 'relative',
          overflow: 'hidden',
        },
        style,
      ]}>
      <LinearGradient
        {...gradientBackgroundProps}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
          gradientBackgroundStyle,
        ]}
      />
    </Button>
  );
}

export default GradientButton;
