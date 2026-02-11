import { YStack, Text } from 'tamagui';
import { useRouter } from 'expo-router';
import Button from '@/components/elements/Button';
import { PRIMARY_BUTTON_TITLE_STYLE } from '@/constants/ui';

export default function Home() {
  const router = useRouter();
  return (
    <YStack flex={1} backgroundColor="$background">
      <YStack flex={1} alignItems="center" justifyContent="center">
        <Text fontSize={24} marginBottom={20} color="$color">
          Beranda
        </Text>
        <Button
          title="Go to Details"
          titleStyle={{ ...PRIMARY_BUTTON_TITLE_STYLE, textAlign: 'center' }}
          paddingVertical={8}
          paddingHorizontal={16}
          borderRadius={22}
          backgroundColor="$primary"
          height={44}
          width="50%"
          onPress={() =>
            router.push({ pathname: '(main)/(tabs)/home/details', params: { from: 'Home' } })
          }
        />
      </YStack>
    </YStack>
  );
}
