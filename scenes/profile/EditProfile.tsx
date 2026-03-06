import { useState, useCallback, useEffect, useRef } from 'react';
import { ScrollView, Platform } from 'react-native';
import { YStack, XStack, Text, useTheme, Card, Spinner, Dialog, Input, Button } from 'tamagui';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import ErrorMessage from '@/components/elements/ErrorMessage';
import AppAlertDialog from '@/components/elements/AppAlertDialog';
import Avatar from '@/components/elements/Avatar';
import { useAppSlice } from '@/slices';
import { updateProfile, uploadAvatar } from '@/services/profile.service';
import { getThemeColor } from '@/utils/theme';
import { windowWidth } from '@/utils/deviceInfo';
import { FORM_SCROLL_PADDING } from '@/constants/ui';

type EditableField = 'fullName' | 'phoneNumber';

export default function EditProfile() {
  const theme = useTheme();
  const { user, dispatch, setUser } = useAppSlice();
  const [fullName, setFullName] = useState(user?.full_name ?? user?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<EditableField | null>(null);
  const [dialogValue, setDialogValue] = useState('');
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [dialogSaving, setDialogSaving] = useState(false);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const saveCloseGuardRef = useRef(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name ?? user.name ?? '');
      setPhoneNumber(user.phone_number ?? '');
    }
  }, [user]);

  const insets = useSafeAreaInsets();
  const avatarSize = windowWidth < 375 ? 100 : 120;
  const bgColor = getThemeColor(theme, 'background');
  const scrollPaddingBottom = insets.bottom + FORM_SCROLL_PADDING.COMPACT;

  const validateName = useCallback((value: string): string | null => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
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
      return null;
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

  const openFieldDialog = useCallback(
    (field: EditableField) => {
      setError(null);
      setDialogError(null);
      setEditingField(field);
      setDialogValue(field === 'fullName' ? fullName : phoneNumber);
    },
    [fullName, phoneNumber],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        return;
      }

      if (dialogSaving || saveCloseGuardRef.current) {
        return;
      }

      setEditingField(null);
      setDialogError(null);
    },
    [dialogSaving],
  );

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

  const handleSaveField = useCallback(async () => {
    if (!user || !editingField) return;

    const validationError =
      editingField === 'fullName' ? validateName(dialogValue) : validatePhone(dialogValue);

    if (validationError) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setDialogError(validationError);
      return;
    }

    setError(null);
    setDialogError(null);
    setDialogSaving(true);

    const payload =
      editingField === 'fullName'
        ? { full_name: dialogValue.trim() || null }
        : { phone_number: dialogValue.trim() || null };

    const { data, error: err } = await updateProfile(user.id, payload);

    setDialogSaving(false);

    if (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message ?? 'Gagal menyimpan profil.');
      return;
    }

    if (data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setFullName(data.full_name ?? '');
      setPhoneNumber(data.phone_number ?? '');
      dispatch(
        setUser({
          ...user,
          full_name: data.full_name,
          name: data.full_name ?? user.email,
          phone_number: data.phone_number,
        }),
      );
      setEditingField(null);
      setDialogValue('');
      setSuccessDialogOpen(true);
    }
  }, [user, editingField, dialogValue, dispatch, setUser, validateName, validatePhone]);

  const handleSaveButtonPress = useCallback(() => {
    saveCloseGuardRef.current = true;
    void handleSaveField().finally(() => {
      saveCloseGuardRef.current = false;
    });
  }, [handleSaveField]);

  const preventOutsideDismiss = useCallback((event: { preventDefault: () => void }) => {
    event.preventDefault();
  }, []);

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
                <Card
                  padding="$3.5"
                  borderWidth={1}
                  borderColor="$borderColor"
                  borderRadius="$3"
                  backgroundColor="$background"
                  pressStyle={{ opacity: 0.9, backgroundColor: '$backgroundHover' }}
                  onPress={() => openFieldDialog('fullName')}
                  accessibilityRole="button"
                  accessibilityLabel="Edit nama lengkap"
                  {...(Platform.OS === 'web'
                    ? { 'aria-description': 'Buka dialog untuk mengubah nama lengkap' }
                    : { accessibilityHint: 'Buka dialog untuk mengubah nama lengkap' })}>
                  <XStack alignItems="center" justifyContent="space-between" gap="$3">
                    <YStack flex={1} gap="$1">
                      <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
                        Nama lengkap
                      </Text>
                      <Text fontSize="$4" color="$color" numberOfLines={1}>
                        {fullName.trim() || 'Belum diisi'}
                      </Text>
                    </YStack>
                    <Text fontSize="$4" color="$colorSubtle">
                      Ubah
                    </Text>
                  </XStack>
                </Card>

                <Card
                  padding="$3.5"
                  borderWidth={1}
                  borderColor="$borderColor"
                  borderRadius="$3"
                  backgroundColor="$background"
                  pressStyle={{ opacity: 0.9, backgroundColor: '$backgroundHover' }}
                  onPress={() => openFieldDialog('phoneNumber')}
                  accessibilityRole="button"
                  accessibilityLabel="Edit nomor telepon"
                  {...(Platform.OS === 'web'
                    ? { 'aria-description': 'Buka dialog untuk mengubah nomor telepon' }
                    : { accessibilityHint: 'Buka dialog untuk mengubah nomor telepon' })}>
                  <XStack alignItems="center" justifyContent="space-between" gap="$3">
                    <YStack flex={1} gap="$1">
                      <Text fontSize="$3" color="$colorSubtle" fontWeight="500">
                        Nomor telepon
                      </Text>
                      <Text fontSize="$4" color="$color" numberOfLines={1}>
                        {phoneNumber.trim() || 'Belum diisi'}
                      </Text>
                    </YStack>
                    <Text fontSize="$4" color="$colorSubtle">
                      Ubah
                    </Text>
                  </XStack>
                </Card>
              </YStack>
            </YStack>
          </Card>
        </ScrollView>

        <Dialog open={editingField !== null} onOpenChange={handleDialogOpenChange} modal>
          <Dialog.Portal>
            <Dialog.Overlay
              key="edit-profile-overlay"
              animation="quick"
              enterStyle={{ opacity: 0 }}
              exitStyle={{ opacity: 0 }}
              backgroundColor="$shadow6"
            />
            <Dialog.Content
              key="edit-profile-content"
              bordered
              elevate
              animation="quick"
              width="90%"
              maxWidth={420}
              enterStyle={{ opacity: 0, scale: 0.95 }}
              exitStyle={{ opacity: 0, scale: 0.95 }}
              onPointerDownOutside={preventOutsideDismiss}
              onInteractOutside={preventOutsideDismiss}
              accessibilityLabel="Dialog edit profil">
              <YStack gap="$3">
                <Dialog.Title>
                  {editingField === 'fullName' ? 'Edit Nama Lengkap' : 'Edit Nomor Telepon'}
                </Dialog.Title>
                <Dialog.Description>
                  {editingField === 'fullName'
                    ? 'Masukkan nama lengkap yang ingin ditampilkan pada profil Anda.'
                    : 'Masukkan nomor telepon aktif untuk kebutuhan kontak pesanan.'}
                </Dialog.Description>

                <Input
                  value={dialogValue}
                  onChangeText={setDialogValue}
                  autoFocus
                  autoCapitalize={editingField === 'fullName' ? 'words' : 'none'}
                  keyboardType={editingField === 'phoneNumber' ? 'phone-pad' : 'default'}
                  placeholder={editingField === 'phoneNumber' ? '08xx xxxx xxxx' : 'Nama lengkap'}
                  returnKeyType="done"
                  onSubmitEditing={handleSaveField}
                  editable={!dialogSaving}
                  accessibilityLabel={
                    editingField === 'fullName' ? 'Input nama lengkap' : 'Input nomor telepon'
                  }
                />

                <ErrorMessage message={dialogError} onDismiss={() => setDialogError(null)} />

                <XStack justifyContent="flex-end" gap="$2" paddingTop="$1">
                  <Dialog.Close asChild>
                    <Button
                      chromeless
                      disabled={dialogSaving}
                      accessibilityLabel="Batal edit profil">
                      Batal
                    </Button>
                  </Dialog.Close>
                  <Dialog.Close asChild>
                    <Button
                      backgroundColor="$primary"
                      color="$white"
                      onPress={handleSaveButtonPress}
                      disabled={dialogSaving}
                      accessibilityLabel="Simpan perubahan profil">
                      {dialogSaving ? 'Menyimpan...' : 'Simpan'}
                    </Button>
                  </Dialog.Close>
                </XStack>
              </YStack>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog>

        <AppAlertDialog
          open={successDialogOpen}
          onOpenChange={setSuccessDialogOpen}
          title="Berhasil"
          description="Profil berhasil diperbarui"
          confirmText="OK"
        />
      </YStack>
    </SafeAreaView>
  );
}
