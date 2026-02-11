import { XStack, Text, useTheme, useThemeName } from 'tamagui';
import { AntDesign } from '@expo/vector-icons';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { getThemeColor } from '@/utils/theme';

export default function HeaderSearchAndCart() {
  const theme = useTheme();
  const themeName = useThemeName();
  const isDark = themeName === 'dark';

  // Use theme-aware colors for search bar text/icon
  // Light mode: dark text (colorPress - hijau gelap #052E16) on white background
  // Dark mode: light text (color - putih #F9FAFB) on dark surface background for maximum contrast
  const placeholderColor = isDark
    ? getThemeColor(theme, 'color', '#F9FAFB') // White text in dark mode
    : getThemeColor(theme, 'colorPress', '#052E16'); // Dark green text in light mode
  // Use surface/surfaceElevated for dark mode (dark background) instead of white
  // This ensures proper contrast and consistency with dark mode design
  const searchBg = getThemeColor(
    theme,
    'surfaceElevated',
    getThemeColor(theme, 'surface', getThemeColor(theme, 'white', '#ffffff')),
  );

  function onSearchPress() {
    // TODO: navigate to search screen when implemented
  }

  return (
    <XStack width="100%" flexDirection="row" alignItems="center" gap={12}>
      <XStack
        flex={1}
        flexDirection="row"
        alignItems="center"
        height={40}
        minWidth={0}
        paddingHorizontal={12}
        borderRadius={20}
        gap={8}
        backgroundColor={searchBg}
        onPress={onSearchPress}
        cursor="pointer"
        accessibilityRole="search"
        accessibilityLabel="Cari produk">
        <AntDesign name="search" size={20} color={placeholderColor} />
        <Text fontSize={15} color={placeholderColor}>
          Cari produk...
        </Text>
      </XStack>
      <HeaderCartIcon color={getThemeColor(theme, 'white', '#ffffff')} />
    </XStack>
  );
}
