import { XStack, Text, useTheme } from 'tamagui';
import { AntDesign } from '@expo/vector-icons';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { getThemeColor } from '@/utils/theme';

export default function HeaderSearchAndCart() {
  const theme = useTheme();
  // Use placeholderColor token — theme-aware, no manual dark/light branching
  const placeholderColor = getThemeColor(theme, 'placeholderColor');
  const searchBg = getThemeColor(theme, 'surfaceElevated');

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
      <HeaderCartIcon color={getThemeColor(theme, 'white')} />
    </XStack>
  );
}
