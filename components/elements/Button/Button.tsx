import { XStack, Text, Spinner, GetProps } from 'tamagui';
import { GestureResponderEvent, ImageSourcePropType, StyleProp, ImageStyle } from 'react-native';
import Image from '../Image';
import { PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';

type ButtonTitleStyle = GetProps<typeof Text>;

export interface ButtonProps extends Omit<GetProps<typeof XStack>, 'style'> {
  title?: string;
  image?: ImageSourcePropType;
  imageStyle?: StyleProp<ImageStyle>;
  titleStyle?: Partial<ButtonTitleStyle>;
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
 * Default: backgroundColor $primary (teal), teks mengikuti PRIMARY_BUTTON_TITLE_STYLE.
 * Override lewat props: backgroundColor="$error", backgroundColor="transparent", dll.
 *
 * titleStyle akan di-merge dengan PRIMARY_BUTTON_TITLE_STYLE sebagai base,
 * sehingga konsisten dengan design system apotek.
 */
function Button({
  title,
  titleStyle,
  image,
  style,
  disabled,
  isLoading,
  loaderColor = '$onPrimary',
  imageStyle,
  children,
  backgroundColor = '$primary',
  ...others
}: ButtonProps) {
  // Merge PRIMARY_BUTTON_TITLE_STYLE dengan custom titleStyle (custom takes precedence)
  const mergedTitleStyle = {
    ...PRIMARY_BUTTON_TITLE_STYLE,
    ...titleStyle,
  } as Partial<ButtonTitleStyle>;

  const stackProps = {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    backgroundColor,
    opacity: disabled || isLoading ? 0.6 : 1,
    disabled: disabled ?? isLoading,
    role: 'button' as const,
    'aria-label': title,
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
        <Text
          fontSize={mergedTitleStyle.fontSize}
          fontWeight={mergedTitleStyle.fontWeight}
          color={mergedTitleStyle.color}
          {...titleStyle}>
          {title}
        </Text>
      )}
    </XStack>
  );
}

export default Button;
