import { Stack } from 'expo-router';
import { useTheme } from 'tamagui';
import { getStackHeaderOptions } from '@/utils/theme';

export default function ProfileStackLayout() {
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
          const params = route.params as { id?: string } | undefined;
          const isEdit = !!params?.id;
          return {
            title: isEdit ? 'Edit Alamat' : 'Tambah Alamat',
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
          title: 'Edit Profile',
          headerTitleAlign: 'center',
        }}
      />
      <Stack.Screen name="details" options={{ title: 'Details' }} />
    </Stack>
  );
}
