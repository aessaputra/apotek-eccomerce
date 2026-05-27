import { useTheme } from 'tamagui';
import { Stack } from 'expo-router';
import {
  NotificationsHeaderLeft,
  NotificationsHeaderRight,
} from '@/components/layouts/NotificationsHeaderActions';
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
          headerLeft: () => <NotificationsHeaderLeft />,
          headerRight: () => <NotificationsHeaderRight />,
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(NotificationsStackLayout);
