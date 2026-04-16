import { useState, useCallback, useEffect, useRef } from 'react';
import type { ComponentRef } from 'react';
import { Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { YStack, Text, Card, Spinner, Input, Separator, styled, ScrollView } from 'tamagui';
import { useRouter } from 'expo-router';
import { useHeaderHeight } from '@react-navigation/elements';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import ErrorMessage from '@/components/elements/ErrorMessage';
import FormInput from '@/components/elements/FormInput';
import Avatar from '@/components/elements/Avatar';
import BottomActionBar from '@/components/layouts/BottomActionBar';
import { useAppSlice } from '@/slices';
import { updateProfile, uploadAvatar } from '@/services/profile.service';
import { windowWidth } from '@/utils/deviceInfo';
import { BOTTOM_BAR_HEIGHT, FORM_SCROLL_PADDING } from '@/constants/ui';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

const FormScrollView = styled(ScrollView, {
  flex: 1,
});

const KeyboardAvoidingWrapper = styled(KeyboardAvoidingView, {
  flex: 1,
});

const FormContent = styled(YStack, {
  px: '$4',
  pt: '$4',
  flexGrow: 1,
});

export default function EditProfile() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { user, dispatch, setUser } = useAppSlice();
  const [fullName, setFullName] = useState(user?.full_name ?? user?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [fullNameError, setFullNameError] = useState<string | null>(null);
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const phoneInputRef = useRef<ComponentRef<typeof Input>>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const showListener = Keyboard.addListener('keyboardDidShow', e => {
      setKeyboardHeight(e.endCoordinates.height);
    });

    const hideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardHeight(0);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? user.name ?? '');
      setPhoneNumber(user.phone_number ?? '');
    }
  }, [user]);

  const avatarSize = windowWidth < 375 ? 100 : 120;
  const insets = useSafeAreaInsets();
  const keyboardGap = 16;
  const extraBottomOffset = Platform.OS === 'android' ? keyboardHeight : 0;
  const scrollPaddingBottom =
    BOTTOM_BAR_HEIGHT + insets.bottom + FORM_SCROLL_PADDING.COMPACT + keyboardHeight + keyboardGap;

  const validateName = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 'Nama lengkap wajib diisi';
    }
    if (trimmed.length < 2) {
      return 'Nama harus minimal 2 karakter';
    }
    if (trimmed.length > 100) {
      return 'Nama maksimal 100 karakter';
    }
    return null;
  }, []);

  const validatePhone = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return 'Nomor telepon wajib diisi';
    }
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(trimmed)) {
      return 'Format nomor telepon tidak valid';
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      return 'Nomor telepon harus minimal 8 digit';
    }
    if (digitsOnly.length > 15) {
      return 'Nomor telepon maksimal 15 digit';
    }
    return null;
  }, []);

  const isDirty =
    fullName !== (user?.full_name ?? user?.name ?? '') ||
    phoneNumber !== (user?.phone_number ?? '');

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

  const handleSaveProfile = useCallback(async () => {
    if (!user || savingProfile || !isDirty) return;

    const nameValidationError = validateName(fullName);
    const phoneValidationError = validatePhone(phoneNumber);

    setFullNameError(nameValidationError);
    setPhoneNumberError(phoneValidationError);

    if (nameValidationError || phoneValidationError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setError(null);
    setSuccessDialogOpen(false);
    setSavingProfile(true);

    const payload = {
      full_name: fullName.trim(),
      phone_number: phoneNumber.trim() || null,
    };

    const { data, error: err } = await updateProfile(user.id, payload);

    setSavingProfile(false);

    if (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message ?? 'Gagal menyimpan profil.');
      return;
    }

    if (data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFullName(data.full_name ?? '');
      setPhoneNumber(data.phone_number ?? '');
      setFullNameError(null);
      setPhoneNumberError(null);
      dispatch(
        setUser({
          ...user,
          full_name: data.full_name,
          name: data.full_name ?? user.email,
          phone_number: data.phone_number,
        }),
      );
      setSuccessDialogOpen(true);
    }
  }, [
    user,
    fullName,
    phoneNumber,
    dispatch,
    setUser,
    validateName,
    validatePhone,
    savingProfile,
    isDirty,
  ]);

  if (!user) {
    return (
      <SafeAreaView edges={['bottom']}>
        <YStack
          flex={1}
          padding="$5"
          paddingBottom="$10"
          alignItems="center"
          justifyContent="center"
          aria-label="Memuat profil"
          accessibilityLiveRegion="polite">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={[]}>
      <KeyboardAvoidingWrapper
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}>
        <YStack flex={1}>
          <FormScrollView
            contentContainerStyle={{
              paddingBottom: scrollPaddingBottom,
            }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            <FormContent gap="$5">
              <YStack
                alignItems="center"
                gap="$3"
                aria-label="Foto profil"
                aria-describedby="Ketuk untuk mengubah foto profil">
                <Avatar
                  avatarUrl={user.avatar_url}
                  name={user.full_name || user.name || user.email}
                  size={avatarSize}
                  editable={true}
                  onUpload={handleAvatarUpload}
                  uploading={uploadingAvatar}
                />
              </YStack>

              <Card
                p="$4"
                mb="$5"
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$surfaceBorder"
                borderRadius="$4"
                elevation={2}
                aria-label="Form edit profil">
                <YStack gap="$4.5">
                  <YStack gap="$1.5">
                    <Text fontSize="$6" fontWeight="700" color="$color">
                      Informasi Profil
                    </Text>
                    <Text fontSize="$3" color="$colorSubtle" lineHeight="$4">
                      Perbarui informasi pribadi Anda.
                    </Text>
                  </YStack>

                  <Separator borderColor="$surfaceBorder" />

                  <ErrorMessage message={error} onDismiss={() => setError(null)} />

                  <YStack gap="$4">
                    <YStack gap="$2">
                      <FormInput
                        label="Nama lengkap"
                        required
                        value={fullName}
                        onChangeText={value => {
                          setFullName(value);
                          if (fullNameError) {
                            setFullNameError(validateName(value));
                          }
                          if (error) {
                            setError(null);
                          }
                        }}
                        onBlur={() => setFullNameError(validateName(fullName))}
                        autoCapitalize="words"
                        autoCorrect={false}
                        placeholder="Nama lengkap"
                        returnKeyType="next"
                        blurOnSubmit={false}
                        onSubmitEditing={() => phoneInputRef.current?.focus()}
                        aria-label="Input nama lengkap"
                        aria-describedby="Wajib diisi, gunakan 2-100 karakter"
                        error={fullNameError}
                      />
                      <Text fontSize="$2" color="$colorSubtle" lineHeight="$3" px="$1">
                        Gunakan 2-100 karakter.
                      </Text>
                    </YStack>

                    <YStack gap="$2">
                      <FormInput
                        ref={phoneInputRef}
                        label="Nomor telepon"
                        required
                        value={phoneNumber}
                        onChangeText={value => {
                          setPhoneNumber(value);
                          if (phoneNumberError) {
                            setPhoneNumberError(validatePhone(value));
                          }
                          if (error) {
                            setError(null);
                          }
                        }}
                        onBlur={() => setPhoneNumberError(validatePhone(phoneNumber))}
                        autoCapitalize="none"
                        keyboardType="phone-pad"
                        placeholder="08xx xxxx xxxx"
                        returnKeyType="done"
                        onSubmitEditing={handleSaveProfile}
                        aria-label="Input nomor telepon"
                        aria-describedby="Wajib diisi, 8-15 digit angka"
                        error={phoneNumberError}
                      />
                      <Text fontSize="$2" color="$colorSubtle" lineHeight="$3" px="$1">
                        Wajib diisi, 8-15 digit angka.
                      </Text>
                    </YStack>

                    <YStack gap="$2">
                      <Text fontSize="$4" color="$color" fontWeight="600">
                        Email
                      </Text>
                      <Input
                        value={user.email}
                        editable={false}
                        color="$colorSubtle"
                        backgroundColor="$backgroundFocus"
                        borderColor="$surfaceBorder"
                        aria-label="Email akun"
                      />
                      <Text fontSize="$2" color="$colorSubtle" lineHeight="$3" px="$1">
                        Email dikelola melalui pengaturan autentikasi akun.
                      </Text>
                    </YStack>
                  </YStack>
                </YStack>
              </Card>
            </FormContent>
          </FormScrollView>

          <BottomActionBar
            buttonTitle={savingProfile ? 'Menyimpan...' : 'Simpan Perubahan'}
            onPress={handleSaveProfile}
            isLoading={savingProfile}
            disabled={savingProfile || !isDirty}
            extraBottomOffset={extraBottomOffset}
            keyboardAnchored={Platform.OS === 'android'}
            aria-label="Simpan perubahan profil"
            aria-describedby="Menyimpan pembaruan informasi profil"
          />
        </YStack>
      </KeyboardAvoidingWrapper>

      <AppAlertDialog
        open={successDialogOpen}
        onOpenChange={setSuccessDialogOpen}
        title="Profil Berhasil Diperbarui"
        description="Perubahan profil Anda telah berhasil disimpan."
        confirmText="OK"
        onConfirm={() => router.back()}
      />
    </SafeAreaView>
  );
}
