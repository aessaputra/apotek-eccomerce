import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import useColorScheme from '@/hooks/useColorScheme';
import Button from '@/components/elements/Button';
import { useAppSlice } from '@/slices';
import { useDataPersist, DataPersistKeys } from '@/hooks';
import { colors } from '@/theme';
import { signOut as authSignOut } from '@/services/auth.service';
import { updateProfile } from '@/services/profile.service';
import type { User } from '@/types';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGrayPurple,
  },
  darkContainer: {
    backgroundColor: colors.blackGray,
  },
  scroll: {
    flex: 1,
  },
  inner: {
    padding: 24,
    paddingBottom: 48,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    color: colors.gray,
    marginBottom: 4,
  },
  value: {
    fontSize: 18,
    color: colors.darkPurple,
  },
  darkValue: {
    color: colors.gray,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.gray,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 12,
    color: colors.black,
    backgroundColor: colors.white,
  },
  darkInput: {
    borderColor: colors.gray,
    color: colors.white,
    backgroundColor: colors.blackGray,
  },
  errorText: {
    color: colors.pink,
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    paddingVertical: 12,
    borderRadius: 8,
    height: 48,
    backgroundColor: colors.lightPurple,
    marginBottom: 12,
  },
  buttonTitle: {
    fontSize: 16,
    color: colors.white,
  },
  buttonOutlined: {
    backgroundColor: colors.transparent,
    borderWidth: 1,
    borderColor: colors.lightPurple,
  },
  buttonOutlinedTitle: {
    color: colors.lightPurple,
  },
  logoutButton: {
    marginTop: 24,
    backgroundColor: colors.pink,
  },
});

export default function Profile() {
  const router = useRouter();
  const { isDark } = useColorScheme();
  const { user, dispatch, setUser } = useAppSlice();
  const { removePersistData } = useDataPersist();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? user?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={['top']}>
        <View style={styles.inner}>
          <ActivityIndicator size="large" color={colors.lightPurple} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, isDark && styles.darkContainer]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.label}>Email</Text>
          <Text style={[styles.value, isDark && styles.darkValue]}>{user.email}</Text>
        </View>

        {editing ? (
          <View style={styles.section}>
            <Text style={styles.label}>Nama lengkap</Text>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              placeholder="Nama lengkap"
              placeholderTextColor={colors.gray}
              value={fullName}
              onChangeText={setFullName}
              autoCapitalize="words"
              editable={!saving}
            />
            <Text style={styles.label}>Nomor telepon</Text>
            <TextInput
              style={[styles.input, isDark && styles.darkInput]}
              placeholder="Nomor telepon"
              placeholderTextColor={colors.gray}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              editable={!saving}
            />
            <Button
              title="Simpan"
              style={styles.button}
              titleStyle={styles.buttonTitle}
              onPress={handleSave}
              isLoading={saving}
            />
            <Button
              title="Batal"
              style={[styles.button, styles.buttonOutlined]}
              titleStyle={[styles.buttonTitle, styles.buttonOutlinedTitle]}
              onPress={() => {
                setEditing(false);
                setError(null);
                setFullName(user.full_name ?? user.name ?? '');
                setPhoneNumber(user.phone_number ?? '');
              }}
              disabled={saving}
            />
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>Nama</Text>
              <Text style={[styles.value, isDark && styles.darkValue]}>
                {user.full_name || user.name || '–'}
              </Text>
            </View>
            <View style={styles.section}>
              <Text style={styles.label}>Telepon</Text>
              <Text style={[styles.value, isDark && styles.darkValue]}>
                {user.phone_number || '–'}
              </Text>
            </View>
            <Button
              title="Edit profil"
              style={styles.button}
              titleStyle={styles.buttonTitle}
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
          style={[styles.button, styles.logoutButton]}
          titleStyle={styles.buttonTitle}
          onPress={handleLogout}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
