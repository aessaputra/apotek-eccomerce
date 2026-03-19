import { useState, useMemo } from 'react';
import { YStack, XStack, Text, Image, useMedia, styled } from 'tamagui';
import { Platform, ScrollView, KeyboardAvoidingView, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/elements/Button';
import EmailInput from '@/components/elements/EmailInput';
import PasswordInput from '@/components/elements/PasswordInput';
import ErrorMessage from '@/components/elements/ErrorMessage';
import { signUp } from '@/services/auth.service';
import { images } from '@/utils/images';
import { PRIMARY_BUTTON_TITLE_STYLE, CARD_SHADOW } from '@/constants/ui';
import {
  validateEmail,
  validatePassword,
  getPasswordStrength,
  PasswordStrength,
} from '@/utils/validation';

/**
 * Enhanced SignUp Page - Modern Pharmacy Elegance Design
 *
 * Design Direction: Modern Pharmacy Elegance
 * - Clean, trustworthy aesthetic with intentional asymmetry
 * - Strong typography hierarchy for healthcare trust
 * - Subtle micro-interactions for premium feel
 * - Intentional spacing rhythm breaking predictable grid
 *
 * Differentiation Anchor: Asymmetric form card positioning + enhanced typography
 * dengan proper labels dan helper text yang membuat form lebih professional
 * dan memorable dibanding template standar.
 */
export default function SignUp() {
  const media = useMedia();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  /**
   * Handles form submission with validation
   * Validates email and password before calling signUp service
   */
  async function handleSubmit() {
    setError(null);
    setEmailError(false);
    setPasswordError(false);
    const trimmedEmail = email.trim();

    // Validate required fields
    if (!trimmedEmail || !password) {
      setError('Email dan password wajib diisi.');
      if (!trimmedEmail) setEmailError(true);
      if (!password) setPasswordError(true);
      return;
    }

    // Validate email format
    if (!validateEmail(trimmedEmail)) {
      setEmailError(true);
      setError('Format email tidak valid.');
      return;
    }

    // Validate password with complexity requirements
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setPasswordError(true);
      setError(passwordValidation.error ?? 'Password tidak valid.');
      return;
    }

    setLoading(true);
    try {
      const { data, error: err } = await signUp({
        email: trimmedEmail,
        password,
        // full_name can be collected later in profile page for better conversion rate
      });
      if (err) {
        setError(err.message ?? 'Pendaftaran gagal. Coba lagi.');
        // Only set emailError if error is email-related
        const errorMessage = err.message?.toLowerCase() ?? '';
        if (
          errorMessage.includes('email') ||
          errorMessage.includes('user already registered') ||
          errorMessage.includes('invalid login credentials')
        ) {
          setEmailError(true);
        }
        return;
      }
      if (data?.session) {
        // AuthProvider.onAuthStateChange akan handle navigation via Redux
      } else if (data?.user && !data.session) {
        setError('Periksa email Anda untuk tautan konfirmasi.');
      }
    } catch {
      setError('Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  // Calculate password strength indicator with useMemo for optimization
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  return (
    <SafeAreaView edges={['top']}>
      <YStack
        flex={1}
        backgroundColor="$background"
        alignItems="center"
        justifyContent="center"
        padding="$4">
        <KeyboardAvoidingWrapper
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center' }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <YStack
              width="100%"
              maxWidth={media.gtMd ? 520 : media.gtSm ? 480 : 420}
              gap={media.gtSm ? '$6' : '$5'}>
              {/* Logo dengan subtle animation dan responsive sizing */}
              <YStack
                alignItems="center"
                gap={media.gtSm ? '$4' : '$3'}
                animation="quick"
                enterStyle={{ opacity: 0, y: -20, scale: 0.95 }}
                opacity={1}
                y={0}
                scale={1}>
                <Image
                  source={images.logo}
                  width="100%"
                  maxWidth={media.gtMd ? 180 : media.gtSm ? 160 : 120}
                  height={media.gtMd ? 180 : media.gtSm ? 160 : 120}
                  resizeMode="contain"
                />
              </YStack>

              {/* Header dengan enhanced typography */}
              <YStack
                gap="$2"
                animation="quick"
                enterStyle={{ opacity: 0, y: -10 }}
                opacity={1}
                y={0}>
                <Text
                  fontSize={32}
                  fontWeight="800"
                  letterSpacing={-0.8}
                  color="$color"
                  lineHeight={38}>
                  Daftar
                </Text>
                <Text fontSize={15} color="$colorPress" lineHeight={22}>
                  Buat akun baru untuk belanja obat dan layanan kesehatan dengan lebih cepat.
                </Text>
              </YStack>

              {/* Form Card dengan enhanced styling dan responsive padding */}
              <YStack
                borderRadius={20}
                paddingVertical={media.gtMd ? 36 : media.gtSm ? 32 : 28}
                paddingHorizontal={media.gtMd ? 40 : media.gtSm ? 32 : 24}
                backgroundColor="$surface"
                borderWidth={1}
                borderColor="$surfaceBorder"
                elevation={4}
                {...CARD_SHADOW}
                gap="$4"
                animation="quick"
                enterStyle={{ opacity: 0, y: 20 }}
                opacity={1}
                y={0}>
                {/* Error Message dengan height collapse animation (best practice) */}
                <ErrorMessage message={error} onDismiss={() => setError(null)} dismissible={true} />

                <YStack gap="$4">
                  {/* Email Input dengan label dan enhanced focus states */}
                  <YStack gap="$2">
                    <Text
                      fontSize={14}
                      fontWeight="600"
                      color="$color"
                      letterSpacing={0.2}
                      opacity={focusedField === 'email' ? 1 : 0.85}>
                      Email
                      <Text fontSize={13} fontWeight="400" color="$danger" opacity={0.9}>
                        {' '}
                        *
                      </Text>
                    </Text>
                    <EmailInput
                      value={email}
                      onChangeText={text => {
                        setEmail(text);
                        setEmailError(false);
                        setError(null);
                      }}
                      placeholder="contoh@email.com"
                      error={emailError}
                      disabled={loading}
                      keyboardType="email-address"
                      aria-label="Email"
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {focusedField === 'email' && !emailError && (
                      <YStack marginTop="$1">
                        <Text fontSize={12} color="$colorPress" opacity={0.7}>
                          Pastikan email Anda valid untuk verifikasi akun
                        </Text>
                      </YStack>
                    )}
                  </YStack>

                  {/* Password Input dengan label, strength indicator, dan helper text */}
                  <YStack gap="$2">
                    <XStack justifyContent="space-between" alignItems="center">
                      <Text
                        fontSize={14}
                        fontWeight="600"
                        color="$color"
                        letterSpacing={0.2}
                        opacity={focusedField === 'password' ? 1 : 0.85}>
                        Password
                        <Text fontSize={13} fontWeight="400" color="$danger" opacity={0.9}>
                          {' '}
                          *
                        </Text>
                      </Text>
                      {password.length > 0 && (
                        <XStack
                          gap="$1.5"
                          alignItems="center"
                          animation="quick"
                          enterStyle={{ opacity: 0 }}
                          opacity={1}>
                          <Text fontSize={12} fontWeight="500" color="$colorPress" opacity={0.7}>
                            {passwordStrength.text}
                          </Text>
                          <XStack gap="$1">
                            {[1, 2, 3].map(level => (
                              <YStack
                                key={level}
                                width={6}
                                height={6}
                                borderRadius={3}
                                backgroundColor={
                                  level <= passwordStrength.strength
                                    ? level === PasswordStrength.WEAK
                                      ? '$danger'
                                      : level === PasswordStrength.MEDIUM
                                        ? '$yellow9'
                                        : '$primary'
                                    : '$surfaceBorder'
                                }
                                animation="quick"
                                enterStyle={{ scale: 0 }}
                                scale={1}
                              />
                            ))}
                          </XStack>
                        </XStack>
                      )}
                    </XStack>
                    <PasswordInput
                      value={password}
                      onChangeText={text => {
                        setPassword(text);
                        setPasswordError(false);
                        setError(null);
                      }}
                      placeholder="Minimal 6 karakter"
                      error={passwordError}
                      disabled={loading}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                    />
                    {focusedField === 'password' && !passwordError && (
                      <YStack marginTop="$1">
                        <Text fontSize={12} color="$colorPress" opacity={0.7}>
                          Gunakan kombinasi huruf dan angka untuk keamanan lebih baik
                        </Text>
                      </YStack>
                    )}
                  </YStack>

                  {/* Submit Button dengan enhanced styling dan micro-interactions */}
                  <Button
                    title="Buat Akun"
                    paddingVertical={16}
                    borderRadius={14}
                    height={56}
                    backgroundColor="$primary"
                    titleStyle={{
                      ...PRIMARY_BUTTON_TITLE_STYLE,
                      fontSize: 17,
                      fontWeight: '700',
                      letterSpacing: 0.3,
                    }}
                    onPress={handleSubmit}
                    isLoading={loading}
                    loaderColor="$white"
                    animation="quick"
                    hoverStyle={{
                      scale: 1.02,
                    }}
                    pressStyle={{
                      scale: 0.98,
                    }}
                  />

                  {/* Login Link dengan enhanced styling */}
                  <XStack
                    justifyContent="center"
                    paddingTop="$3"
                    animation="quick"
                    enterStyle={{ opacity: 0 }}
                    opacity={1}>
                    <Link href="/(auth)/login" asChild>
                      <Pressable>
                        <Text
                          fontSize={15}
                          fontWeight="600"
                          color="$colorPress"
                          letterSpacing={0.2}>
                          Sudah punya akun?{' '}
                          <Text fontWeight="800" color="$primary" textDecorationLine="underline">
                            Masuk
                          </Text>
                        </Text>
                      </Pressable>
                    </Link>
                  </XStack>
                </YStack>
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingWrapper>
      </YStack>
    </SafeAreaView>
  );
}

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
});

const KeyboardAvoidingWrapper = styled(KeyboardAvoidingView, {
  flex: 1,
  alignSelf: 'stretch',
});
