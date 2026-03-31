import { Stack } from 'expo-router';
import { useTheme } from 'tamagui';
import { getStackHeaderOptions } from '@/utils/theme';
import { withAuthGuard } from '@/hooks/withAuthGuard';

function ProfileStackLayout() {
  const theme = useTheme();
  return (
    <Stack screenOptions={getStackHeaderOptions(theme)}>
      <Stack.Screen
        name="index"
        options={{
          title: 'Akun',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="addresses"
        options={{
          title: 'Alamat Pengiriman',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="address-form"
        options={({ route }) => {
          const id =
            route.params &&
            typeof route.params === 'object' &&
            'id' in route.params &&
            typeof route.params.id === 'string'
              ? route.params.id
              : undefined;
          const isEdit = typeof id === 'string' && id.length > 0;
          return {
            title: isEdit ? 'Edit Alamat' : 'Tambah Alamat',
            headerShown: true,
            headerTitleAlign: 'center',
          };
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          title: 'Dukungan',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen
        name="edit-profile"
        options={{
          title: 'Edit Profil',
          headerShown: true,
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen name="details" options={{ title: 'Detail' }} />
    </Stack>
  );
}

export default withAuthGuard(ProfileStackLayout);
