import { useState, useCallback, useEffect, useRef } from 'react';
import {
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
} from 'react-native';
import { YStack, XStack, Text, Input, useTheme, Card } from 'tamagui';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from '@/components/elements/Button';
import Avatar from '@/components/elements/Avatar';
import AddressCard from '@/components/elements/AddressCard/AddressCard';
import { useAppSlice } from '@/slices';
import { useDataPersist, DataPersistKeys } from '@/hooks';
import { signOut as authSignOut } from '@/services/auth.service';
import { updateProfile, uploadAvatar } from '@/services/profile.service';
import { getAddresses } from '@/services/address.service';
import type { User } from '@/types';
import type { Address } from '@/types/address';
import { Spinner } from 'tamagui';
import { getThemeColor } from '@/utils/theme';
import { windowWidth } from '@/utils/deviceInfo';

export default function Profile() {
  const router = useRouter();
  const theme = useTheme();
  const { user, dispatch, setUser } = useAppSlice();
  const { removePersistData } = useDataPersist();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name ?? user?.name ?? '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number ?? '');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  // Form validation states
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Refs for focus management (accessibility)
  const nameInputRef = useRef<RNTextInput>(null);
  const phoneInputRef = useRef<RNTextInput>(null);

  // Responsive avatar size (mobile-first: smaller on small screens)
  const avatarSize = windowWidth < 375 ? 100 : 120;

  // Minimum touch target size: 44px (Apple HIG) / 48dp (Material Design)
  // Using 44px as safe minimum for both platforms
  const MIN_TOUCH_TARGET = 44;

  // Only use getThemeColor for non-Tamagui APIs (SafeAreaView style prop)
  const bgColor = getThemeColor(theme, 'background', '#f8fafc');

  // Format date untuk "Member since"
  const formatMemberSince = (dateString?: string): string => {
    if (!dateString) return '–';
    try {
      const date = new Date(dateString);
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      return date.toLocaleDateString('id-ID', options);
    } catch {
      return '–';
    }
  };

  // Get role display name dan styling info
  const getRoleInfo = (role: string | null) => {
    switch (role) {
      case 'admin':
        return { label: 'Admin', backgroundColorToken: '$dangerSoft', colorToken: '$danger' };
      case 'customer':
        return { label: 'Pelanggan', backgroundColorToken: '$successSoft', colorToken: '$success' };
      default:
        return {
          label: role || '–',
          backgroundColorToken: '$backgroundHover',
          colorToken: '$colorPress',
        };
    }
  };

  const roleInfo = getRoleInfo(user?.role ?? null);

  // Form validation functions
  const validateName = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setNameError(null); // Allow empty (optional field)
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
      setPhoneError(null); // Allow empty (optional field)
      return true;
    }
    // Basic phone validation: digits, spaces, +, -, parentheses allowed
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(trimmed)) {
      setPhoneError('Format nomor telepon tidak valid');
      return false;
    }
    // Remove non-digits for length check
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

  // Focus management: focus first input when entering edit mode
  useEffect(() => {
    if (editing && nameInputRef.current) {
      // Small delay to ensure keyboard is ready
      const timer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [editing]);

  // Load addresses on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      loadAddresses();
    }
  }, [user?.id]);

  // Refresh addresses when screen comes into focus (e.g., after adding/editing address)
  useFocusEffect(
    useCallback(() => {
      if (user?.id) {
        loadAddresses();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]),
  );

  const loadAddresses = useCallback(async () => {
    if (!user?.id) return;
    setLoadingAddresses(true);
    const { data, error: err } = await getAddresses(user.id);
    if (err) {
      // Error handling: addresses akan tetap empty array, user bisa retry dengan refresh
      // Tidak perlu console.error karena error sudah di-handle secara silent
      // User akan melihat empty state jika tidak ada data
    } else {
      setAddresses(data || []);
    }
    setLoadingAddresses(false);
  }, [user?.id]);

  const handleAvatarUpload = useCallback(
    async (uri: string) => {
      if (!user) return;
      setUploadingAvatar(true);
      setError(null);

      try {
        // Upload ke Supabase Storage
        const { url, error: uploadError } = await uploadAvatar(user.id, uri);
        if (uploadError || !url) {
          throw uploadError || new Error('Gagal mengupload avatar');
        }

        // Update profile dengan URL baru
        const { data, error: updateError } = await updateProfile(user.id, {
          avatar_url: url,
        });

        if (updateError || !data) {
          throw updateError || new Error('Gagal memperbarui profil');
        }

        // Update Redux state
        const updatedUser: User = {
          ...user,
          avatar_url: data.avatar_url,
        };
        dispatch(setUser(updatedUser));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Gagal mengupload avatar';
        setError(errorMessage);
        throw err;
      } finally {
        setUploadingAvatar(false);
      }
    },
    [user, dispatch, setUser],
  );

  const handleSave = useCallback(async () => {
    if (!user) return;

    // Validate form before saving
    const isNameValid = validateName(fullName);
    const isPhoneValid = validatePhone(phoneNumber);

    if (!isNameValid || !isPhoneValid) {
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

    if (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message ?? 'Gagal menyimpan profil.');
      return;
    }

    if (data) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const updatedUser: User = {
        ...user,
        full_name: data.full_name,
        name: data.full_name ?? user.email,
        phone_number: data.phone_number,
      };
      dispatch(setUser(updatedUser));
      setEditing(false);

      // Success feedback
      Alert.alert('Berhasil', 'Profil berhasil diperbarui', [{ text: 'OK' }]);
    }
  }, [user, fullName, phoneNumber, dispatch, setUser, validateName, validatePhone]);

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
          padding="$5"
          paddingBottom="$10"
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
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Header Section dengan Avatar */}
          <Card
            padding="$5"
            marginBottom="$5"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            borderRadius="$4"
            elevation={0}
            animation="quick"
            enterStyle={{ opacity: 0, y: -10 }}
            opacity={1}
            y={0}>
            <YStack alignItems="center" space="$4">
              <Avatar
                avatarUrl={user.avatar_url}
                name={user.full_name || user.name || user.email}
                size={avatarSize}
                editable={!editing}
                onUpload={handleAvatarUpload}
                uploading={uploadingAvatar}
              />

              <YStack alignItems="center" space="$2">
                <Text fontSize="$7" fontWeight="600" color="$color" fontFamily="$heading">
                  {user.full_name || user.name || 'Pengguna'}
                </Text>

                {/* Role Badge */}
                {user.role && (
                  <XStack
                    paddingHorizontal="$3"
                    paddingVertical="$1.5"
                    borderRadius="$10"
                    backgroundColor={roleInfo.backgroundColorToken}
                    borderWidth={1}
                    borderColor={roleInfo.colorToken}>
                    <Text fontSize="$2" fontWeight="600" color={roleInfo.colorToken}>
                      {roleInfo.label}
                    </Text>
                  </XStack>
                )}

                {/* Member Since */}
                {user.created_at && (
                  <Text fontSize="$3" color="$colorPress" marginTop="$1">
                    Member sejak {formatMemberSince(user.created_at)}
                  </Text>
                )}
              </YStack>
            </YStack>
          </Card>

          {/* Profile Information Section */}
          <Card
            padding="$4"
            marginBottom="$5"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            borderRadius="$4"
            elevation={0}>
            <YStack space="$4">
              <Text
                fontSize="$5"
                fontWeight="600"
                color="$color"
                marginBottom="$2"
                fontFamily="$heading">
                Informasi Profil
              </Text>

              {editing ? (
                <>
                  {error ? (
                    <YStack
                      padding="$3"
                      borderRadius="$2"
                      backgroundColor="$dangerSoft"
                      borderWidth={1}
                      borderColor="$danger"
                      marginBottom="$2">
                      <Text fontSize="$3" color="$danger">
                        {error}
                      </Text>
                    </YStack>
                  ) : null}

                  <YStack space="$3">
                    <YStack>
                      <Text fontSize="$3" color="$colorPress" marginBottom="$1.5" fontWeight="500">
                        Nama lengkap
                      </Text>
                      <XStack
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 18,
                          overflow: 'hidden',
                          backgroundColor: getThemeColor(theme, 'background', '#FFFFFF'),
                          borderWidth: nameError ? 2 : 1.5,
                          borderRadius: 14,
                          borderColor: nameError
                            ? getThemeColor(theme, 'danger', '#DC2626')
                            : getThemeColor(theme, 'borderColor', '#E2E8F0'),
                          height: 56,
                        }}>
                        <RNTextInput
                          ref={nameInputRef}
                          style={{
                            flex: 1,
                            height: '100%',
                            padding: 0,
                            margin: 0,
                            fontSize: 16,
                            fontFamily: theme.bodyFont?.val || 'System',
                            color: getThemeColor(theme, 'color', '#111827'),
                          }}
                          placeholderTextColor={getThemeColor(theme, 'colorPress', '#64748B')}
                          value={fullName}
                          onChangeText={text => {
                            setFullName(text);
                            if (nameError) {
                              validateName(text);
                            }
                          }}
                          onBlur={() => validateName(fullName)}
                          autoCapitalize="words"
                          editable={!saving}
                          returnKeyType="next"
                          onSubmitEditing={() => phoneInputRef.current?.focus()}
                          underlineColorAndroid="transparent"
                          textAlignVertical="center"
                          accessibilityLabel="Nama lengkap"
                          accessibilityHint="Masukkan nama lengkap Anda"
                          accessibilityLiveRegion="polite"
                        />
                      </XStack>
                      {nameError && (
                        <Text fontSize="$2" color="$danger" marginTop="$1">
                          {nameError}
                        </Text>
                      )}
                    </YStack>

                    <YStack>
                      <Text fontSize="$3" color="$colorPress" marginBottom="$1.5" fontWeight="500">
                        Nomor telepon
                      </Text>
                      <XStack
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          paddingHorizontal: 18,
                          overflow: 'hidden',
                          backgroundColor: getThemeColor(theme, 'background', '#FFFFFF'),
                          borderWidth: phoneError ? 2 : 1.5,
                          borderRadius: 14,
                          borderColor: phoneError
                            ? getThemeColor(theme, 'danger', '#DC2626')
                            : getThemeColor(theme, 'borderColor', '#E2E8F0'),
                          height: 56,
                        }}>
                        <RNTextInput
                          ref={phoneInputRef}
                          style={{
                            flex: 1,
                            height: '100%',
                            padding: 0,
                            margin: 0,
                            fontSize: 16,
                            fontFamily: theme.bodyFont?.val || 'System',
                            color: getThemeColor(theme, 'color', '#111827'),
                          }}
                          placeholder="08xx xxxx xxxx"
                          placeholderTextColor={getThemeColor(theme, 'colorPress', '#64748B')}
                          value={phoneNumber}
                          onChangeText={text => {
                            setPhoneNumber(text);
                            if (phoneError) {
                              validatePhone(text);
                            }
                          }}
                          onBlur={() => validatePhone(phoneNumber)}
                          keyboardType="phone-pad"
                          editable={!saving}
                          returnKeyType="done"
                          underlineColorAndroid="transparent"
                          textAlignVertical="center"
                          accessibilityLabel="Nomor telepon"
                          accessibilityHint="Masukkan nomor telepon Anda"
                          accessibilityLiveRegion="polite"
                        />
                      </XStack>
                      {phoneError && (
                        <Text fontSize="$2" color="$danger" marginTop="$1">
                          {phoneError}
                        </Text>
                      )}
                    </YStack>

                    <YStack>
                      <Text fontSize="$3" color="$colorPress" marginBottom="$1.5" fontWeight="500">
                        Email
                      </Text>
                      <Input
                        size="$4"
                        borderColor="$borderColor"
                        backgroundColor="$background"
                        color="$colorPress"
                        value={user.email}
                        editable={false}
                        opacity={0.7}
                        accessibilityLabel="Email"
                        accessibilityHint="Email tidak dapat diubah"
                      />
                      <Text fontSize="$2" color="$colorPress" marginTop="$1">
                        Email tidak dapat diubah
                      </Text>
                    </YStack>

                    <XStack space="$3" marginTop="$2">
                      <Button
                        title="Simpan"
                        flex={1}
                        paddingVertical="$3"
                        borderRadius="$2"
                        height={MIN_TOUCH_TARGET}
                        minHeight={MIN_TOUCH_TARGET}
                        backgroundColor="$primary"
                        titleStyle={{ color: '$white', fontSize: 16 }}
                        onPress={handleSave}
                        isLoading={saving}
                        accessibilityLabel="Simpan perubahan profil"
                        accessibilityHint="Menyimpan perubahan informasi profil"
                      />
                      <Button
                        title="Batal"
                        flex={1}
                        paddingVertical="$3"
                        borderRadius="$2"
                        height={MIN_TOUCH_TARGET}
                        minHeight={MIN_TOUCH_TARGET}
                        backgroundColor="transparent"
                        borderWidth={1}
                        borderColor="$primary"
                        titleStyle={{ color: '$primary', fontSize: 16 }}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEditing(false);
                          setError(null);
                          setNameError(null);
                          setPhoneError(null);
                          setFullName(user.full_name ?? user.name ?? '');
                          setPhoneNumber(user.phone_number ?? '');
                        }}
                        disabled={saving}
                        accessibilityLabel="Batal edit profil"
                        accessibilityHint="Membatalkan perubahan dan kembali ke tampilan profil"
                      />
                    </XStack>
                  </YStack>
                </>
              ) : (
                <YStack space="$4">
                  <YStack>
                    <Text fontSize="$3" color="$colorPress" marginBottom="$1" fontWeight="500">
                      Email
                    </Text>
                    <Text fontSize="$4" color="$color">
                      {user.email}
                    </Text>
                  </YStack>

                  <YStack>
                    <Text fontSize="$3" color="$colorPress" marginBottom="$1" fontWeight="500">
                      Nama lengkap
                    </Text>
                    <Text fontSize="$4" color="$color">
                      {user.full_name || user.name || '–'}
                    </Text>
                  </YStack>

                  <YStack>
                    <Text fontSize="$3" color="$colorPress" marginBottom="$1" fontWeight="500">
                      Nomor telepon
                    </Text>
                    <Text fontSize="$4" color="$color">
                      {user.phone_number || '–'}
                    </Text>
                  </YStack>

                  <Button
                    title="Edit Profil"
                    paddingVertical="$3"
                    borderRadius="$2"
                    height={MIN_TOUCH_TARGET}
                    minHeight={MIN_TOUCH_TARGET}
                    backgroundColor="$primary"
                    marginTop="$2"
                    titleStyle={{ color: '$white', fontSize: 16 }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      setEditing(true);
                      setFullName(user.full_name ?? user.name ?? '');
                      setPhoneNumber(user.phone_number ?? '');
                      setError(null);
                      setNameError(null);
                      setPhoneError(null);
                    }}
                    accessibilityLabel="Edit profil"
                    accessibilityHint="Mengedit informasi profil Anda"
                  />
                </YStack>
              )}
            </YStack>
          </Card>

          {/* Alamat Pengiriman Section */}
          <Card
            padding="$4"
            marginBottom="$5"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            borderRadius="$4"
            elevation={0}>
            <YStack space="$3">
              <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
                <Text fontSize="$5" fontWeight="600" color="$color" fontFamily="$heading">
                  Alamat Pengiriman
                </Text>
                {/* Hanya tampilkan button "Kelola" jika sudah ada alamat */}
                {!loadingAddresses && addresses.length > 0 && (
                  <Button
                    title="Kelola"
                    paddingVertical="$2"
                    paddingHorizontal="$3"
                    borderRadius="$2"
                    height={MIN_TOUCH_TARGET}
                    minHeight={MIN_TOUCH_TARGET}
                    backgroundColor="transparent"
                    borderWidth={1}
                    borderColor="$primary"
                    titleStyle={{ color: '$primary', fontSize: 14 }}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push('/(main)/(tabs)/profile/addresses');
                    }}
                    accessibilityLabel="Kelola alamat pengiriman"
                    accessibilityHint="Membuka halaman untuk mengelola alamat pengiriman"
                  />
                )}
              </XStack>

              {loadingAddresses ? (
                <YStack alignItems="center" paddingVertical="$4">
                  <Spinner size="small" color="$primary" />
                </YStack>
              ) : addresses.length === 0 ? (
                <Card
                  padding="$4"
                  backgroundColor="$backgroundHover"
                  borderWidth={1}
                  borderColor="$surfaceBorder"
                  borderStyle="dashed"
                  borderRadius="$4">
                  <YStack alignItems="center" space="$3">
                    <YStack
                      width={64}
                      height={64}
                      borderRadius="$10"
                      backgroundColor="$primarySoft"
                      alignItems="center"
                      justifyContent="center">
                      <Ionicons
                        name="location-outline"
                        size={32}
                        color={getThemeColor(theme, 'primary', '#0D9488')}
                      />
                    </YStack>
                    <YStack alignItems="center" space="$1">
                      <Text fontSize="$4" fontWeight="600" color="$color" textAlign="center">
                        Belum ada alamat pengiriman
                      </Text>
                      <Text fontSize="$3" color="$colorPress" textAlign="center">
                        Tambahkan alamat untuk memudahkan pengiriman
                      </Text>
                    </YStack>
                    <Button
                      title="Tambah Alamat"
                      paddingVertical="$3"
                      paddingHorizontal="$4"
                      borderRadius="$2"
                      height={MIN_TOUCH_TARGET}
                      minHeight={MIN_TOUCH_TARGET}
                      backgroundColor="$primary"
                      titleStyle={{ color: '$white', fontSize: 14, fontWeight: '600' }}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        router.push('/(main)/(tabs)/profile/address-form');
                      }}
                      accessibilityLabel="Tambah alamat pengiriman"
                      accessibilityHint="Membuka form untuk menambahkan alamat pengiriman baru"
                    />
                  </YStack>
                </Card>
              ) : (
                <YStack space="$2">
                  {addresses.slice(0, 2).map(address => (
                    <AddressCard
                      key={address.id}
                      address={address}
                      isDefault={address.is_default ?? false}
                      onPress={() => router.push('/(main)/(tabs)/profile/addresses')}
                    />
                  ))}
                  {addresses.length > 2 && (
                    <Text fontSize="$2" color="$colorPress" textAlign="center" marginTop="$1">
                      +{addresses.length - 2} alamat lainnya
                    </Text>
                  )}
                </YStack>
              )}
            </YStack>
          </Card>

          {/* Account Actions Section */}
          <Card
            padding="$4"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            borderRadius="$4"
            elevation={0}>
            <YStack space="$3">
              <Text
                fontSize="$5"
                fontWeight="600"
                color="$color"
                marginBottom="$1"
                fontFamily="$heading">
                Akun
              </Text>
              <Button
                title="Keluar"
                paddingVertical="$3"
                borderRadius="$2"
                height={MIN_TOUCH_TARGET}
                minHeight={MIN_TOUCH_TARGET}
                backgroundColor="$error"
                titleStyle={{ color: '$white', fontSize: 16 }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  handleLogout();
                }}
                accessibilityLabel="Keluar dari akun"
                accessibilityHint="Keluar dari aplikasi dan kembali ke halaman login"
              />
            </YStack>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
