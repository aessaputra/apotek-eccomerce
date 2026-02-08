import { XStack, Text, Spinner, GetProps } from 'tamagui';
import { GestureResponderEvent, ImageSourcePropType, StyleProp, ImageStyle } from 'react-native';
import Image from '../Image';

export interface ButtonProps extends Omit<GetProps<typeof XStack>, 'style'> {
  title?: string;
  image?: ImageSourcePropType;
  imageStyle?: StyleProp<ImageStyle>;
  titleStyle?: object;
  onPress?: (event: GestureResponderEvent) => void;
  onLongPress?: (event: GestureResponderEvent) => void;
  isLoading?: boolean;
  loaderColor?: string;
  children?: React.ReactNode;
  style?: GetProps<typeof XStack>['style'];
  /** Warna background; default $primary (teal dari tema). Pakai "$error", "transparent", dll untuk override. */
  backgroundColor?: string;
}

/**
 * Tombol yang memakai tema dari themes.ts.
 * Default: backgroundColor $primary (teal), teks mengikuti titleStyle (biasanya $white).
 * Override lewat props: backgroundColor="$error", backgroundColor="transparent", dll.
 */
function Button({
  title,
  titleStyle,
  image,
  style,
  disabled,
  isLoading,
  loaderColor = '$white',
  imageStyle,
  children,
  backgroundColor = '$primary',
  ...others
}: ButtonProps) {
  const stackProps = {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor,
    opacity: disabled || isLoading ? 0.6 : 1,
    disabled: disabled ?? isLoading,
    accessibilityRole: 'button' as const,
    accessibilityLabel: title,
    cursor: 'pointer' as const,
    style,
    ...others,
  };

  return (
    <XStack {...(stackProps as GetProps<typeof XStack>)}>
      {children}
      {isLoading && <Spinner size="small" color={loaderColor} />}
      {!isLoading && image && <Image source={image} style={imageStyle} />}
      {!isLoading && title && (
        <Text fontSize={16} fontFamily="$body" {...(titleStyle as object)}>
          {title}
        </Text>
      )}
    </XStack>
  );
}

export default Button;
