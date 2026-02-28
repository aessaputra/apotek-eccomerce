import { useState, useEffect, useCallback, useRef } from 'react';
import { ScrollView, Alert, Pressable, TextInput as RNTextInput } from 'react-native';
import { YStack, XStack, Text, Card, Spinner, Checkbox, useTheme } from 'tamagui';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import FormInput from '@/components/elements/FormInput';
import ErrorMessage from '@/components/elements/ErrorMessage';
import BottomActionBar from '@/components/layouts/BottomActionBar';
import { useAppSlice } from '@/slices';
import { getAddress, createAddress, updateAddress } from '@/services/address.service';
import type { AddressInsert } from '@/types/address';
import { getThemeColor } from '@/utils/theme';
import { MIN_TOUCH_TARGET, BOTTOM_BAR_HEIGHT, FORM_SCROLL_PADDING } from '@/constants/ui';

export default function AddressForm() {
  const router = useRouter();
  const theme = useTheme();
  const { user } = useAppSlice();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [receiverName, setReceiverName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [province, setProvince] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  // Field-specific error states for inline validation
  const [receiverNameError, setReceiverNameError] = useState<string | null>(null);
  const [phoneNumberError, setPhoneNumberError] = useState<string | null>(null);
  const [streetAddressError, setStreetAddressError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);

  // Refs for focus management (accessibility)
  const receiverNameRef = useRef<RNTextInput>(null);
  const phoneNumberRef = useRef<RNTextInput>(null);
  const streetAddressRef = useRef<RNTextInput>(null);
  const cityRef = useRef<RNTextInput>(null);
  const postalCodeRef = useRef<RNTextInput>(null);
  const provinceRef = useRef<RNTextInput>(null);

  const insets = useSafeAreaInsets();
  // Use theme-aware background with light mode default fallback (#FFFFFF)
  const bgColor = getThemeColor(theme, 'background');
  const bottomBarHeight = BOTTOM_BAR_HEIGHT + insets.bottom;
  // Extra gap so "Jadikan alamat default" card stays above the sticky Simpan button
  const scrollPaddingBottom = bottomBarHeight + FORM_SCROLL_PADDING.SPACIOUS;

  // Validation functions
  const validateReceiverName = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setReceiverNameError('Nama penerima wajib diisi');
      return false;
    }
    if (trimmed.length < 2) {
      setReceiverNameError('Nama penerima minimal 2 karakter');
      return false;
    }
    if (trimmed.length > 100) {
      setReceiverNameError('Nama penerima maksimal 100 karakter');
      return false;
    }
    setReceiverNameError(null);
    return true;
  }, []);

  const validatePhoneNumber = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setPhoneNumberError('Nomor telepon wajib diisi');
      return false;
    }
    const phoneRegex = /^[\d\s\+\-\(\)]+$/;
    if (!phoneRegex.test(trimmed)) {
      setPhoneNumberError('Format nomor telepon tidak valid');
      return false;
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      setPhoneNumberError('Nomor telepon minimal 8 digit');
      return false;
    }
    if (digitsOnly.length > 15) {
      setPhoneNumberError('Nomor telepon maksimal 15 digit');
      return false;
    }
    setPhoneNumberError(null);
    return true;
  }, []);

  const validateStreetAddress = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setStreetAddressError('Alamat lengkap wajib diisi');
      return false;
    }
    if (trimmed.length < 10) {
      setStreetAddressError('Alamat lengkap minimal 10 karakter');
      return false;
    }
    setStreetAddressError(null);
    return true;
  }, []);

  const validateCity = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setCityError('Kota wajib diisi');
      return false;
    }
    if (trimmed.length < 2) {
      setCityError('Nama kota minimal 2 karakter');
      return false;
    }
    setCityError(null);
    return true;
  }, []);

  const validatePostalCode = useCallback((value: string): boolean => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setPostalCodeError('Kode pos wajib diisi');
      return false;
    }
    if (!/^\d+$/.test(trimmed)) {
      setPostalCodeError('Kode pos harus berupa angka');
      return false;
    }
    if (trimmed.length < 5) {
      setPostalCodeError('Kode pos minimal 5 digit');
      return false;
    }
    if (trimmed.length > 10) {
      setPostalCodeError('Kode pos maksimal 10 digit');
      return false;
    }
    setPostalCodeError(null);
    return true;
  }, []);

  // Auto-focus first input on mount
  useEffect(() => {
    if (!loading && receiverNameRef.current) {
      const timer = setTimeout(() => {
        receiverNameRef.current?.focus();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  const loadAddress = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error: err } = await getAddress(id);
      setLoading(false);
      if (err || !data) {
        Alert.alert('Error', 'Gagal memuat alamat');
        router.back();
        return;
      }
      setReceiverName(data.receiver_name);
      setPhoneNumber(data.phone_number);
      setStreetAddress(data.street_address);
      setCity(data.city);
      setPostalCode(data.postal_code);
      setProvince(data.province || '');
      setIsDefault(data.is_default ?? false);
    } catch {
      setLoading(false);
      Alert.alert('Error', 'Gagal memuat alamat');
      router.back();
    }
  }, [id, router]);

  useEffect(() => {
    if (isEdit && id && user?.id) {
      loadAddress();
    }
  }, [isEdit, id, user?.id, loadAddress]);

  const validateForm = (): boolean => {
    const isReceiverNameValid = validateReceiverName(receiverName);
    const isPhoneValid = validatePhoneNumber(phoneNumber);
    const isStreetValid = validateStreetAddress(streetAddress);
    const isCityValid = validateCity(city);
    const isPostalValid = validatePostalCode(postalCode);

    return isReceiverNameValid && isPhoneValid && isStreetValid && isCityValid && isPostalValid;
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setError(null);

    if (!validateForm()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError('Mohon perbaiki kesalahan pada form');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    const payload: AddressInsert = {
      receiver_name: receiverName.trim(),
      phone_number: phoneNumber.trim(),
      street_address: streetAddress.trim(),
      city: city.trim(),
      postal_code: postalCode.trim(),
      province: province.trim() || null,
      is_default: isDefault,
    };

    try {
      if (isEdit && id) {
        const { error: err } = await updateAddress(id, user.id, payload);
        if (err) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err.message);
          setSaving(false);
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSaving(false);
        Alert.alert('Berhasil', 'Alamat berhasil diperbarui', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        const { error: err } = await createAddress(user.id, payload);
        if (err) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setError(err.message);
          setSaving(false);
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSaving(false);
        Alert.alert('Berhasil', 'Alamat berhasil ditambahkan', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      }
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: bgColor }} edges={['top']}>
        <YStack flex={1} alignItems="center" justifyContent="center">
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
            padding: 20,
            paddingBottom: scrollPaddingBottom,
            flexGrow: 1,
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          {/* Header Section */}
          <YStack gap="$4" marginBottom="$4">
            <Text fontSize="$7" fontWeight="700" color="$color" fontFamily="$heading">
              {isEdit ? 'Edit Alamat' : 'Tambah Alamat'}
            </Text>
            <Text fontSize="$3" color="$colorPress">
              {isEdit
                ? 'Perbarui informasi alamat pengiriman Anda'
                : 'Lengkapi informasi alamat pengiriman untuk memudahkan proses checkout'}
            </Text>
          </YStack>

          {/* General Error Message */}
          <ErrorMessage message={error} onDismiss={() => setError(null)} marginBottom="$4" />

          {/* Informasi Penerima Section */}
          <Card
            padding="$4"
            marginBottom="$4"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            borderRadius="$4"
            elevation={0}>
            <YStack gap="$4">
              <XStack gap="$2" alignItems="center" marginBottom="$2">
                <Ionicons name="person-outline" size={20} color={getThemeColor(theme, 'primary')} />
                <Text fontSize="$5" fontWeight="600" color="$color" fontFamily="$heading">
                  Informasi Penerima
                </Text>
              </XStack>

              <YStack gap="$3">
                <FormInput
                  ref={receiverNameRef}
                  label="Nama Penerima"
                  required
                  value={receiverName}
                  onChangeText={text => {
                    setReceiverName(text);
                    if (receiverNameError) {
                      validateReceiverName(text);
                    }
                  }}
                  onBlur={() => validateReceiverName(receiverName)}
                  error={receiverNameError}
                  autoCapitalize="words"
                  editable={!saving}
                  returnKeyType="next"
                  onSubmitEditing={() => phoneNumberRef.current?.focus()}
                  accessibilityLabel="Nama penerima"
                  accessibilityHint="Masukkan nama lengkap penerima paket"
                />

                <FormInput
                  ref={phoneNumberRef}
                  label="Nomor Telepon"
                  required
                  value={phoneNumber}
                  onChangeText={text => {
                    setPhoneNumber(text);
                    if (phoneNumberError) {
                      validatePhoneNumber(text);
                    }
                  }}
                  onBlur={() => validatePhoneNumber(phoneNumber)}
                  error={phoneNumberError}
                  placeholder="08xx xxxx xxxx"
                  keyboardType="phone-pad"
                  editable={!saving}
                  returnKeyType="next"
                  onSubmitEditing={() => streetAddressRef.current?.focus()}
                  accessibilityLabel="Nomor telepon"
                  accessibilityHint="Masukkan nomor telepon penerima"
                />
              </YStack>
            </YStack>
          </Card>

          {/* Alamat Pengiriman Section */}
          <Card
            padding="$4"
            marginBottom="$4"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            borderRadius="$4"
            elevation={0}>
            <YStack gap="$4">
              <XStack gap="$2" alignItems="center" marginBottom="$2">
                <Ionicons
                  name="location-outline"
                  size={20}
                  color={getThemeColor(theme, 'primary')}
                />
                <Text fontSize="$5" fontWeight="600" color="$color" fontFamily="$heading">
                  Alamat Pengiriman
                </Text>
              </XStack>

              <YStack gap="$3">
                <FormInput
                  ref={streetAddressRef}
                  label="Alamat Lengkap"
                  required
                  value={streetAddress}
                  onChangeText={text => {
                    setStreetAddress(text);
                    if (streetAddressError) {
                      validateStreetAddress(text);
                    }
                  }}
                  onBlur={() => validateStreetAddress(streetAddress)}
                  error={streetAddressError}
                  placeholder="Jalan, RT/RW, Nomor rumah"
                  autoCapitalize="words"
                  editable={!saving}
                  multiline
                  numberOfLines={3}
                  minHeight={100}
                  returnKeyType="next"
                  onSubmitEditing={() => cityRef.current?.focus()}
                  accessibilityLabel="Alamat lengkap"
                  accessibilityHint="Masukkan alamat lengkap termasuk jalan, RT/RW, dan nomor rumah"
                />

                <XStack gap="$3">
                  <YStack flex={1}>
                    <FormInput
                      ref={cityRef}
                      label="Kota"
                      required
                      value={city}
                      onChangeText={text => {
                        setCity(text);
                        if (cityError) {
                          validateCity(text);
                        }
                      }}
                      onBlur={() => validateCity(city)}
                      error={cityError}
                      autoCapitalize="words"
                      editable={!saving}
                      returnKeyType="next"
                      onSubmitEditing={() => postalCodeRef.current?.focus()}
                      accessibilityLabel="Kota"
                      accessibilityHint="Masukkan nama kota"
                    />
                  </YStack>

                  <YStack flex={1}>
                    <FormInput
                      ref={postalCodeRef}
                      label="Kode Pos"
                      required
                      value={postalCode}
                      onChangeText={text => {
                        setPostalCode(text);
                        if (postalCodeError) {
                          validatePostalCode(text);
                        }
                      }}
                      onBlur={() => validatePostalCode(postalCode)}
                      error={postalCodeError}
                      placeholder="5 digit"
                      keyboardType="numeric"
                      editable={!saving}
                      returnKeyType="next"
                      onSubmitEditing={() => provinceRef.current?.focus()}
                      accessibilityLabel="Kode pos"
                      accessibilityHint="Masukkan kode pos 5 digit"
                    />
                  </YStack>
                </XStack>

                <FormInput
                  ref={provinceRef}
                  label="Provinsi"
                  value={province}
                  onChangeText={setProvince}
                  autoCapitalize="words"
                  editable={!saving}
                  returnKeyType="done"
                  accessibilityLabel="Provinsi"
                  accessibilityHint="Masukkan nama provinsi (opsional)"
                />
              </YStack>
            </YStack>
          </Card>

          {/* Set as Default Section */}
          <Card
            padding="$4"
            marginBottom="$4"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor={isDefault ? '$primary' : '$surfaceBorder'}
            borderRadius="$4"
            elevation={0}>
            <Pressable
              onPress={() => {
                if (!saving) {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setIsDefault(!isDefault);
                }
              }}
              disabled={saving}
              style={{ minHeight: MIN_TOUCH_TARGET }}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isDefault }}
              accessibilityLabel="Jadikan alamat default"
              accessibilityHint="Mengatur alamat ini sebagai alamat pengiriman default yang akan digunakan otomatis saat checkout">
              <XStack gap="$3" alignItems="center">
                <Checkbox
                  checked={isDefault}
                  onCheckedChange={checked => setIsDefault(checked as boolean)}
                  size="$5"
                  disabled={saving}
                  borderColor={isDefault ? '$primary' : '$borderColor'}
                  backgroundColor={isDefault ? '$primary' : '$background'}
                  borderWidth={isDefault ? 2 : 1.5}
                  accessibilityLabel="Jadikan alamat default">
                  <Checkbox.Indicator>
                    <AntDesign name="check" size={16} color={getThemeColor(theme, 'white')} />
                  </Checkbox.Indicator>
                </Checkbox>
                <YStack flex={1} gap="$1">
                  <Text fontSize="$4" color="$color" fontWeight="600">
                    Jadikan alamat default
                  </Text>
                  <Text fontSize="$3" color="$colorPress">
                    Alamat ini akan digunakan secara otomatis saat checkout
                  </Text>
                </YStack>
              </XStack>
            </Pressable>
          </Card>
        </ScrollView>

        {/* Bottom action bar — uses measureInWindow for adjustResize-agnostic positioning */}
        <BottomActionBar
          buttonTitle={isEdit ? 'Simpan Perubahan' : 'Simpan Alamat'}
          onPress={handleSave}
          isLoading={saving}
          disabled={saving}
          accessibilityLabel={isEdit ? 'Simpan perubahan alamat' : 'Simpan alamat baru'}
          accessibilityHint="Menyimpan data alamat pengiriman"
        />
      </YStack>
    </SafeAreaView>
  );
}
