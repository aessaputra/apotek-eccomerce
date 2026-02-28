import { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, Alert, TextInput } from 'react-native';
import { YStack, useTheme, Card, Spinner } from 'tamagui';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import FormInput from '@/components/elements/FormInput';
import ErrorMessage from '@/components/elements/ErrorMessage';
import Avatar from '@/components/elements/Avatar';
import BottomActionBar from '@/components/layouts/BottomActionBar';
import { useAppSlice } from '@/slices';
import { updateProfile, uploadAvatar } from '@/services/profile.service';
import { getThemeColor } from '@/utils/theme';
import { windowWidth } from '@/utils/deviceInfo';
import { BOTTOM_BAR_HEIGHT, FORM_SCROLL_PADDING } from '@/constants/ui';

export default function EditProfile() {
  const router = useRouter();
  const theme = useTheme();
  const { user, dispatch, setUser } = useAppSlice();
  const [fullName, setFullName] = useState(user?.full_name ?? user?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Sync form state with user changes
  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? user.name ?? '');
      setPhoneNumber(user.phone_number ?? '');
    }
  }, [user]);

  const nameInputRef = useRef<TextInput>(null);
  const phoneInputRef = useRef<TextInput>(null);
  const editingRef = useRef(true);

  const insets = useSafeAreaInsets();
  const avatarSize = windowWidth < 375 ? 100 : 120;
  // Use theme-aware background with light mode default fallback (#FFFFFF)
  const bgColor = getThemeColor(theme, 'background', '#FFFFFF');
  const bottomBarHeight = BOTTOM_BAR_HEIGHT + insets.bottom;
  // Scroll padding: bottom bar height + compact spacing (no tab bar since it's hidden)
  const scrollPaddingBottom = bottomBarHeight + FORM_SCROLL_PADDING.COMPACT;

  const validateName = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setNameError(null);
      return true;
    }
    if (trimmed.length < 2) {
      setNameError('Nama harus minimal 2 karakter');
      return false;
    }
    if (trimmed.length > 100) {
      setNameError('Nama maksimal 100 karakter');
      return false;
    }
    setNameError(null);
    return true;
  }, []);

  const validatePhone = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setPhoneError(null);
      return true;
    }
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(trimmed)) {
      setPhoneError('Format nomor telepon tidak valid');
      return false;
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      setPhoneError('Nomor telepon harus minimal 8 digit');
      return false;
    }
    if (digitsOnly.length > 15) {
      setPhoneError('Nomor telepon maksimal 15 digit');
      return false;
    }
    setPhoneError(null);
    return true;
  }, []);

  useEffect(() => {
    if (nameInputRef.current) {
      const timer = setTimeout(() => nameInputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAvatarUpload = useCallback(
    async (uri: string) => {
      if (!user) return;
      setUploadingAvatar(true);
      setError(null);
      try {
        const { url, error: uploadError } = await uploadAvatar(user.id, uri);
        if (uploadError || !url) {
          throw uploadError || new Error('Gagal mengupload avatar');
        }

        const { data, error: updateError } = await updateProfile(user.id, { avatar_url: url });
        if (updateError || !data) {
          throw updateError || new Error('Gagal memperbarui profil');
        }

        dispatch(setUser({ ...user, avatar_url: data.avatar_url }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal mengupload avatar';
        setError(errorMessage);
      } finally {
        setUploadingAvatar(false);
      }
    },
    [user, dispatch, setUser],
  );

  const handleSave = useCallback(async () => {
    if (!user) return;
    if (!validateName(fullName) || !validatePhone(phoneNumber)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Mohon perbaiki kesalahan pada form');
      return;
    }

    setError(null);
    setNameError(null);
    setPhoneError(null);
    setSaving(true);

    const { data, error: err } = await updateProfile(user.id, {
      full_name: fullName.trim() || null,
      phone_number: phoneNumber.trim() || null,
    });

    setSaving(false);

    const stillEditing = editingRef.current;

    if (err) {
      if (stillEditing) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setError(err.message ?? 'Gagal menyimpan profil.');
      }
      return;
    }

    if (data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      dispatch(
        setUser({
          ...user,
          full_name: data.full_name,
          name: data.full_name ?? user.email,
          phone_number: data.phone_number,
        }),
      );
      if (stillEditing) {
        Alert.alert('Berhasil', 'Profil berhasil diperbarui', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      }
    }
  }, [user, fullName, phoneNumber, dispatch, setUser, router, validateName, validatePhone]);

  if (!user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
        <YStack
          flex={1}
          padding="$5"
          paddingBottom="$10"
          alignItems="center"
          justifyContent="center"
          accessibilityLabel="Memuat profil"
          accessibilityLiveRegion="polite">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
      <YStack flex={1} position="relative">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            padding: 16,
            paddingBottom: scrollPaddingBottom,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {/* Avatar */}
          <YStack
            alignItems="center"
            marginBottom="$5"
            gap="$3"
            accessibilityLabel="Foto profil"
            accessibilityHint="Ketuk untuk mengubah foto profil">
            <Avatar
              avatarUrl={user.avatar_url}
              name={user.full_name || user.name || user.email}
              size={avatarSize}
              editable={true}
              onUpload={handleAvatarUpload}
              uploading={uploadingAvatar}
            />
          </YStack>

          {/* Form Edit Profile */}
          <Card
            padding="$4"
            marginBottom="$5"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            borderRadius="$4"
            elevation={1}
            accessibilityLabel="Form edit profil">
            <YStack gap="$4">
              <ErrorMessage message={error} onDismiss={() => setError(null)} />

              <YStack gap="$3">
                <FormInput
                  ref={nameInputRef}
                  label="Nama lengkap"
                  value={fullName}
                  onChangeText={t => {
                    setFullName(t);
                    if (nameError) validateName(t);
                  }}
                  onBlur={() => validateName(fullName)}
                  error={nameError}
                  autoCapitalize="words"
                  editable={!saving}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneInputRef.current?.focus()}
                  accessibilityLabel="Nama lengkap"
                  accessibilityHint="Masukkan nama lengkap Anda"
                />

                <FormInput
                  ref={phoneInputRef}
                  label="Nomor telepon"
                  value={phoneNumber}
                  onChangeText={t => {
                    setPhoneNumber(t);
                    if (phoneError) validatePhone(t);
                  }}
                  onBlur={() => validatePhone(phoneNumber)}
                  error={phoneError}
                  placeholder="08xx xxxx xxxx"
                  keyboardType="phone-pad"
                  editable={!saving}
                  returnKeyType="done"
                  accessibilityLabel="Nomor telepon"
                  accessibilityHint="Masukkan nomor telepon Anda"
                />
              </YStack>
            </YStack>
          </Card>
        </ScrollView>

        {/* Bottom action bar — uses measureInWindow for adjustResize-agnostic positioning */}
        <BottomActionBar
          buttonTitle="Simpan"
          onPress={handleSave}
          isLoading={saving}
          disabled={saving}
          accessibilityLabel="Simpan perubahan profil"
          accessibilityHint="Menyimpan perubahan informasi profil"
        />
      </YStack>
    </SafeAreaView>
  );
}
