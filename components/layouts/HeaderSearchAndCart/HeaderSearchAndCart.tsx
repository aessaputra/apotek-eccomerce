import { XStack, Text, useTheme } from 'tamagui';
import { AntDesign } from '@expo/vector-icons';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { getThemeColor } from '@/utils/theme';

export default function HeaderSearchAndCart() {
  const theme = useTheme();
  const placeholderColor = getThemeColor(theme, 'colorPress', '#64748B');
  const searchBg = getThemeColor(theme, 'background', '#f1f5f9');

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
      <HeaderCartIcon />
    </XStack>
  );
}
