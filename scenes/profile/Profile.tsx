import { useState, useCallback } from 'react';
import { ScrollView, Alert } from 'react-native';
import { YStack, Text, Input, useTheme } from 'tamagui';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import { useAppSlice } from '@/slices';
import { useDataPersist, DataPersistKeys } from '@/hooks';
import { signOut as authSignOut } from '@/services/auth.service';
import { updateProfile } from '@/services/profile.service';
import type { User } from '@/types';
import { Spinner } from 'tamagui';
import { getThemeColor } from '@/utils/theme';

export default function Profile() {
  const router = useRouter();
  const theme = useTheme();
  const { user, dispatch, setUser } = useAppSlice();
  const { removePersistData } = useDataPersist();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? user?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const labelColor = getThemeColor(theme, 'colorPress', '#64748B');
  const valueColor = getThemeColor(theme, 'color', '#0f172a');
  const inputBg = getThemeColor(theme, 'background', '#f8fafc');
  const inputBorder = getThemeColor(theme, 'borderColor', '#e2e8f0');
  const inputColor = getThemeColor(theme, 'color', '#0f172a');
  const placeholderColor = getThemeColor(theme, 'colorPress', '#64748B');
  const errorColor = getThemeColor(theme, 'red10', '#dc2626');
  const primaryColor = getThemeColor(theme, 'color', '#0D9488');
  const whiteColor = getThemeColor(theme, 'background', '#ffffff');
  const bgColor = getThemeColor(theme, 'background', '#f8fafc');

  const handleSave = useCallback(async () => {
    if (!user) return;
    setError(null);
    setSaving(true);
    const { data, error: err } = await updateProfile(user.id, {
      full_name: fullName.trim() || null,
      phone_number: phoneNumber.trim() || null,
    });
    setSaving(false);
    if (err) {
      setError(err.message ?? 'Gagal menyimpan profil.');
      return;
    }
    if (data) {
      const updatedUser: User = {
        ...user,
        full_name: data.full_name,
        name: data.full_name ?? user.email,
        phone_number: data.phone_number,
      };
      dispatch(setUser(updatedUser));
      setEditing(false);
    }
  }, [user, fullName, phoneNumber, dispatch, setUser]);

  async function handleLogout() {
    Alert.alert('Keluar', 'Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: async () => {
          await removePersistData(DataPersistKeys.USER);
          await authSignOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  if (!user) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: bgColor,
        }}
        edges={['top']}>
        <YStack
          flex={1}
          padding={24}
          paddingBottom={48}
          alignItems="center"
          justifyContent="center">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: bgColor,
      }}
      edges={['top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}>
        <YStack marginBottom={24}>
          <Text fontSize={14} color={labelColor} marginBottom={4}>
            Email
          </Text>
          <Text fontSize={18} color={valueColor}>
            {user.email}
          </Text>
        </YStack>

        {editing ? (
          <YStack marginBottom={24}>
            <Text fontSize={14} color={labelColor} marginBottom={4}>
              Nama lengkap
            </Text>
            {error ? (
              <Text fontSize={14} color={errorColor} marginBottom={8}>
                {error}
              </Text>
            ) : null}
            <Input
              height={48}
              borderWidth={1}
              borderColor={inputBorder}
              borderRadius={8}
              paddingHorizontal={16}
              fontSize={16}
              marginBottom={12}
              color={inputColor}
              backgroundColor={inputBg}
              placeholder="Nama lengkap"
              placeholderTextColor={placeholderColor}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!saving}
            />
            <Text fontSize={14} color={labelColor} marginBottom={4}>
              Nomor telepon
            </Text>
            <Input
              height={48}
              borderWidth={1}
              borderColor={inputBorder}
              borderRadius={8}
              paddingHorizontal={16}
              fontSize={16}
              marginBottom={12}
              color={inputColor}
              backgroundColor={inputBg}
              placeholder="Nomor telepon"
              placeholderTextColor={placeholderColor}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!saving}
            />
            <Button
              title="Simpan"
              paddingVertical={12}
              borderRadius={8}
              height={48}
              backgroundColor="$primary"
              marginBottom={12}
              titleStyle={{ color: whiteColor, fontSize: 16 }}
              onPress={handleSave}
              isLoading={saving}
            />
            <Button
              title="Batal"
              paddingVertical={12}
              borderRadius={8}
              height={48}
              backgroundColor="transparent"
              borderWidth={1}
              borderColor="$primary"
              titleStyle={{ color: primaryColor, fontSize: 16 }}
              onPress={() => {
                setEditing(false);
                setError(null);
                setFullName(user.full_name ?? user.name ?? '');
                setPhoneNumber(user.phone_number ?? '');
              }}
              disabled={saving}
            />
          </YStack>
        ) : (
          <>
            <YStack marginBottom={24}>
              <Text fontSize={14} color={labelColor} marginBottom={4}>
                Nama
              </Text>
              <Text fontSize={18} color={valueColor}>
                {user.full_name || user.name || '–'}
              </Text>
            </YStack>
            <YStack marginBottom={24}>
              <Text fontSize={14} color={labelColor} marginBottom={4}>
                Telepon
              </Text>
              <Text fontSize={18} color={valueColor}>
                {user.phone_number || '–'}
              </Text>
            </YStack>
            <Button
              title="Edit profil"
              paddingVertical={12}
              borderRadius={8}
              height={48}
              backgroundColor="$primary"
              marginBottom={12}
              titleStyle={{ color: whiteColor, fontSize: 16 }}
              onPress={() => {
                setEditing(true);
                setFullName(user.full_name ?? user.name ?? '');
                setPhoneNumber(user.phone_number ?? '');
                setError(null);
              }}
            />
          </>
        )}

        <Button
          title="Keluar"
          paddingVertical={12}
          borderRadius={8}
          height={48}
          marginTop={24}
          backgroundColor="$error"
          titleStyle={{ color: whiteColor, fontSize: 16 }}
          onPress={handleLogout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
