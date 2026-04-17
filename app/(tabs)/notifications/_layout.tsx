import { useTheme } from 'tamagui';
import { Stack } from 'expo-router';
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
          headerShown: false,
        }}
      />
    </Stack>
  );
}

export default withAuthGuard(NotificationsStackLayout);
