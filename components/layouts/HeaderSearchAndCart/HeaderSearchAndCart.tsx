import { XStack, Text, useTheme } from 'tamagui';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { getThemeColor } from '@/utils/theme';
import { SearchIcon } from '@/components/icons';

export interface HeaderSearchAndCartProps {
  onSearchPress?: () => void;
}

export default function HeaderSearchAndCart({ onSearchPress }: HeaderSearchAndCartProps) {
  const theme = useTheme();
  const placeholderColor = getThemeColor(theme, 'placeholderColor');
  const searchBg = getThemeColor(theme, 'surfaceElevated');

  const handleSearchPress = onSearchPress ?? (() => undefined);

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
        onPress={handleSearchPress}
        cursor="pointer"
        accessibilityRole="search"
        accessibilityLabel="Cari produk">
        <SearchIcon size={20} color={placeholderColor} />
        <Text fontSize={15} color={placeholderColor}>
          Cari produk...
        </Text>
      </XStack>
      <HeaderCartIcon color={getThemeColor(theme, 'white')} />
    </XStack>
  );
}
