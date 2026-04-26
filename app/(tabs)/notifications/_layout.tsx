import { useTheme } from 'tamagui';
import { Stack } from 'expo-router';
import HeaderCartIcon from '@/components/layouts/HeaderCartIcon';
import { getStackHeaderOptions } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';

function NotificationsStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        ...getStackHeaderOptions(theme),
      }}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Notifikasi',
          headerTitleAlign: 'center',
          headerRight: () => <HeaderCartIcon forHeaderRight />,
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(NotificationsStackLayout);
