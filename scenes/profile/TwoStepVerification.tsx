import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { YStack, Text, Card, Button, Spinner, styled, Input, XStack, Dialog } from 'tamagui';
import { SafeAreaView as RNSafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  createMfaChallenge,
  enrollTotpFactor,
  listMfaFactors,
  reauthenticateWithPassword,
  refreshAuthSession,
  unenrollMfaFactor,
  verifyMfaChallenge,
} from '@/services/auth.service';
import { useAppSlice } from '@/slices';
import { copyTextToClipboard } from '@/utils/clipboard';
import { StatusBadge } from '@/components/elements/StatusBadge';
import { FORM_SCROLL_PADDING } from '@/constants/ui';
import { useAndroidKeyboardInset } from './useAndroidKeyboardInset';

const SafeAreaView = styled(RNSafeAreaView, {
  flex: 1,
  backgroundColor: '$background',
});

const KeyboardAvoidingWrapper = styled(KeyboardAvoidingView, {
  flex: 1,
  width: '100%',
  alignItems: 'center',
  justifyContent: 'center',
});

interface MfaFactor {
  id: string;
  friendly_name?: string;
  status?: string;
}

interface FactorsState {
  loading: boolean;
  factors: MfaFactor[];
  error: string | null;
}

type EnrollmentMode =
  | 'idle'
  | 'enrolling-password'
  | 'enrolling-qr'
  | 'enrolling-verify'
  | 'disabling-password';

interface EnrollmentData {
  factorId: string | null;
  qrCode: string | null;
  secret: string | null;
  uri: string | null;
  challengeId: string | null;
}

const EMPTY_ENROLLMENT_DATA: EnrollmentData = {
  factorId: null,
  qrCode: null,
  secret: null,
  uri: null,
  challengeId: null,
};

function getVerifiedTotpFactors(data: unknown): MfaFactor[] {
  if (typeof data !== 'object' || data === null || !('totp' in data)) {
    return [];
  }

  const totp = (data as { totp?: MfaFactor[] }).totp ?? [];
  return totp.filter(factor => !factor.status || factor.status === 'verified');
}

function getChallengeId(data: unknown) {
  if (typeof data !== 'object' || data === null || !('id' in data)) {
    return null;
  }

  const id = (data as { id?: unknown }).id;
  return typeof id === 'string' ? id : null;
}

function normalizeTotpCode(value: string) {
  return value.replace(/\D/g, '').slice(0, 6);
}

export default function TwoStepVerification() {
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useAndroidKeyboardInset();
  const { user } = useAppSlice();
  const [{ loading, factors, error }, setFactorsState] = useState<FactorsState>({
    loading: true,
    factors: [],
    error: null,
  });
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>('idle');
  const [enrollmentData, setEnrollmentData] = useState<EnrollmentData>(EMPTY_ENROLLMENT_DATA);
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const [enrollmentError, setEnrollmentError] = useState<string | null>(null);
  const [enrollmentNotice, setEnrollmentNotice] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const unverifiedFactorIdRef = useRef<string | null>(null);
  const isNarrowScreen = windowWidth < 360;
  const keyboardGap = 16;
  const extraBottomOffset = Platform.OS === 'android' ? keyboardHeight : 0;
  const dialogBottomPadding = insets.bottom + FORM_SCROLL_PADDING.COMPACT + extraBottomOffset;
  const dialogKeyboardOffset = Platform.OS === 'ios' ? 64 : 0;
  const availableDialogHeight = Math.max(
    280,
    windowHeight - insets.top - insets.bottom - extraBottomOffset - 32,
  );
  const mainScrollContentContainerStyle = useMemo(
    () => ({
      padding: 16,
      paddingBottom: insets.bottom + FORM_SCROLL_PADDING.SPACIOUS + keyboardHeight + keyboardGap,
      flexGrow: 1 as const,
    }),
    [insets.bottom, keyboardHeight],
  );

  const loadFactors = useCallback(async () => {
    setFactorsState({ loading: true, factors: [], error: null });
    const result = await listMfaFactors();

    if (result.error) {
      setFactorsState({
        loading: false,
        factors: [],
        error: result.error.message,
      });
      return;
    }

    const verifiedTotp = getVerifiedTotpFactors(result.data);
    setFactorsState({ loading: false, factors: verifiedTotp, error: null });
  }, []);

  const clearEnrollmentState = useCallback(() => {
    unverifiedFactorIdRef.current = null;
    setEnrollmentMode('idle');
    setEnrollmentData(EMPTY_ENROLLMENT_DATA);
    setPassword('');
    setTotpCode('');
    setSelectedFactorId(null);
    setEnrollmentError(null);
    setSecretCopied(false);
    setSubmitting(false);
  }, []);

  const cleanupUnverifiedEnrollment = useCallback(async () => {
    const factorId = unverifiedFactorIdRef.current;
    if (!factorId) {
      return;
    }

    unverifiedFactorIdRef.current = null;
    await unenrollMfaFactor(factorId);
  }, []);

  const cancelEnrollment = useCallback(async () => {
    setSubmitting(true);
    await cleanupUnverifiedEnrollment();
    clearEnrollmentState();
  }, [cleanupUnverifiedEnrollment, clearEnrollmentState]);

  const startEnrollment = useCallback(() => {
    setEnrollmentNotice(null);
    setEnrollmentError(null);
    setEnrollmentMode('enrolling-password');
  }, []);

  const startDisable = useCallback(() => {
    setEnrollmentNotice(null);
    setEnrollmentError(null);
    setSelectedFactorId(factors[0]?.id ?? null);
    setEnrollmentMode('disabling-password');
  }, [factors]);

  const getFactorLabel = useCallback((factor: MfaFactor) => {
    return factor.friendly_name || 'Metode verifikasi tersimpan';
  }, []);

  const handleDisableUnenroll = useCallback(
    async (factorId: string) => {
      const unenrollResult = await unenrollMfaFactor(factorId);

      if (unenrollResult.error) {
        setSubmitting(false);
        setEnrollmentError(unenrollResult.error.message);
        return;
      }

      const refreshResult = await refreshAuthSession();

      if (refreshResult.error) {
        setSubmitting(false);
        setEnrollmentError(refreshResult.error.message);
        return;
      }

      await loadFactors();
      clearEnrollmentState();
      setEnrollmentNotice('Berhasil dinonaktifkan.');
    },
    [clearEnrollmentState, loadFactors],
  );

  const handlePasswordConfirmation = useCallback(async () => {
    if (!user?.email) {
      setEnrollmentError('Email tidak ditemukan. Masuk ulang lalu coba lagi.');
      return;
    }

    setSubmitting(true);
    setEnrollmentError(null);
    setEnrollmentNotice(null);

    const authResult = await reauthenticateWithPassword({
      email: user.email,
      password,
    });

    if (authResult.error) {
      setSubmitting(false);
      setEnrollmentError(
        authResult.error.name === 'InvalidLoginCredentialsError'
          ? 'Password salah. Coba lagi.'
          : 'Gagal memverifikasi password. Coba lagi.',
      );
      return;
    }

    if (enrollmentMode === 'disabling-password') {
      if (!selectedFactorId) {
        setSubmitting(false);
        setEnrollmentError('Aplikasi autentikator tidak ditemukan. Muat ulang halaman.');
        return;
      }

      await handleDisableUnenroll(selectedFactorId);
      return;
    }

    const factorsResult = await listMfaFactors();

    if (factorsResult.error) {
      setSubmitting(false);
      setEnrollmentError(factorsResult.error.message);
      return;
    }

    const verifiedFactors = getVerifiedTotpFactors(factorsResult.data);
    if (verifiedFactors.length > 0) {
      setFactorsState({ loading: false, factors: verifiedFactors, error: null });
      clearEnrollmentState();
      setEnrollmentNotice('Sudah aktif.');
      return;
    }

    const enrollResult = await enrollTotpFactor({
      friendlyName: 'Aplikasi Autentikator',
      issuer: 'Apotek Ecommerce',
    });

    if (enrollResult.error || !enrollResult.data) {
      setSubmitting(false);
      setEnrollmentError(enrollResult.error?.message ?? 'Gagal membuat verifikasi. Coba lagi.');
      return;
    }

    unverifiedFactorIdRef.current = enrollResult.data.id;
    setEnrollmentData({
      factorId: enrollResult.data.id,
      qrCode: enrollResult.data.totp.qr_code,
      secret: enrollResult.data.totp.secret,
      uri: enrollResult.data.totp.uri,
      challengeId: null,
    });
    setPassword('');
    setSubmitting(false);
    setEnrollmentMode('enrolling-qr');
  }, [
    password,
    user?.email,
    clearEnrollmentState,
    enrollmentMode,
    selectedFactorId,
    handleDisableUnenroll,
  ]);

  const submitPasswordConfirmation = useCallback(() => {
    if (submitting || password.length === 0) {
      return;
    }

    Keyboard.dismiss();
    void handlePasswordConfirmation();
  }, [handlePasswordConfirmation, password.length, submitting]);

  const handleCreateChallenge = useCallback(async () => {
    if (!enrollmentData.factorId) {
      setEnrollmentError('Aplikasi autentikator tidak ditemukan. Mulai ulang aktivasi.');
      return;
    }

    setSubmitting(true);
    setEnrollmentError(null);
    const challengeResult = await createMfaChallenge(enrollmentData.factorId);
    const challengeId = getChallengeId(challengeResult.data);

    if (challengeResult.error || !challengeId) {
      await cleanupUnverifiedEnrollment();
      clearEnrollmentState();
      setEnrollmentNotice(null);
      setEnrollmentError(challengeResult.error?.message ?? 'Gagal memulai verifikasi. Coba lagi.');
      return;
    }

    setEnrollmentData(current => ({ ...current, challengeId }));
    setSecretCopied(false);
    setSubmitting(false);
    setEnrollmentMode('enrolling-verify');
  }, [enrollmentData.factorId, cleanupUnverifiedEnrollment, clearEnrollmentState]);

  const submitCreateChallenge = useCallback(() => {
    if (submitting) {
      return;
    }

    Keyboard.dismiss();
    void handleCreateChallenge();
  }, [handleCreateChallenge, submitting]);

  const handleVerifyCode = useCallback(async () => {
    if (!enrollmentData.factorId || !enrollmentData.challengeId) {
      setEnrollmentError('Sesi verifikasi tidak ditemukan. Mulai ulang aktivasi.');
      return;
    }

    setSubmitting(true);
    setEnrollmentError(null);

    const verifyResult = await verifyMfaChallenge({
      factorId: enrollmentData.factorId,
      challengeId: enrollmentData.challengeId,
      code: totpCode,
    });

    if (verifyResult.error) {
      setSubmitting(false);
      setEnrollmentError('Kode salah. Coba lagi.');
      return;
    }

    unverifiedFactorIdRef.current = null;
    const refreshResult = await refreshAuthSession();

    if (refreshResult.error) {
      setSubmitting(false);
      setEnrollmentError('Sesi belum diperbarui. Coba lagi.');
      return;
    }

    await loadFactors();
    clearEnrollmentState();
    setEnrollmentNotice('Berhasil diaktifkan.');
  }, [
    enrollmentData.factorId,
    enrollmentData.challengeId,
    totpCode,
    loadFactors,
    clearEnrollmentState,
  ]);

  const submitVerifyCode = useCallback(() => {
    if (submitting || totpCode.length !== 6) {
      return;
    }

    Keyboard.dismiss();
    void handleVerifyCode();
  }, [handleVerifyCode, submitting, totpCode.length]);

  const handleSecretCopy = useCallback(async () => {
    if (!enrollmentData.secret) {
      setEnrollmentError('Kode manual tidak tersedia.');
      return;
    }

    try {
      const copied = await copyTextToClipboard(enrollmentData.secret);
      if (!copied) {
        setEnrollmentError('Gagal menyalin. Salin kode manual.');
        return;
      }

      setEnrollmentError(null);
      setSecretCopied(true);
    } catch {
      setEnrollmentError('Gagal menyalin. Salin kode manual.');
    }
  }, [enrollmentData.secret]);

  const handleTotpCodeChange = useCallback((value: string) => {
    setTotpCode(normalizeTotpCode(value));
    setEnrollmentError(null);
  }, []);

  const cancelEnrollmentWithKeyboardDismiss = useCallback(() => {
    Keyboard.dismiss();
    void cancelEnrollment();
  }, [cancelEnrollment]);

  const handlePasswordDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open || submitting) {
        return;
      }

      void cancelEnrollment();
    },
    [cancelEnrollment, submitting],
  );

  const handleSetupDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open || submitting) {
        return;
      }

      void cancelEnrollment();
    },
    [cancelEnrollment, submitting],
  );

  useEffect(() => {
    loadFactors();
  }, [loadFactors]);

  useEffect(() => {
    return () => {
      const factorId = unverifiedFactorIdRef.current;
      if (factorId) {
        unverifiedFactorIdRef.current = null;
        void unenrollMfaFactor(factorId);
      }
    };
  }, []);

  const isEnabled = factors.length > 0;

  const renderEnrollmentError = () => {
    if (!enrollmentError) {
      return null;
    }

    return (
      <Text fontSize="$3" color="$danger" testID="mfa-enrollment-error" aria-live="polite">
        {enrollmentError}
      </Text>
    );
  };

  const renderEnrollmentNotice = () => {
    if (!enrollmentNotice) {
      return null;
    }

    return (
      <Text fontSize="$3" color="$primary" testID="mfa-enrollment-notice" aria-live="polite">
        {enrollmentNotice}
      </Text>
    );
  };

  const renderEnrollmentFlow = () => {
    if (enrollmentMode === 'idle') {
      return null;
    }

    if (enrollmentMode === 'enrolling-password' || enrollmentMode === 'disabling-password') {
      return null;
    }

    if (enrollmentMode === 'enrolling-qr') {
      return null;
    }

    return (
      <Card
        padding="$4"
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$surfaceBorder"
        borderRadius="$4">
        <YStack gap="$3">
          <Text fontSize="$5" fontWeight="600" color="$color">
            Masukkan kode 6 digit
          </Text>
          <Text fontSize="$3" color="$colorPress">
            Masukkan 6 digit kode dari aplikasi autentikator.
          </Text>
          <Input
            value={totpCode}
            onChangeText={handleTotpCodeChange}
            keyboardType="number-pad"
            maxLength={12}
            placeholder="123456"
            autoComplete="one-time-code"
            textContentType="oneTimeCode"
            returnKeyType="done"
            submitBehavior="blurAndSubmit"
            onSubmitEditing={submitVerifyCode}
            aria-label="Kode autentikator"
          />
          {renderEnrollmentError()}
          <XStack gap="$2" flexDirection={isNarrowScreen ? 'column' : 'row'}>
            <Button
              flex={1}
              backgroundColor="$primary"
              color="$onPrimary"
              disabled={submitting || totpCode.length !== 6}
              onPress={submitVerifyCode}
              aria-disabled={submitting || totpCode.length !== 6}
              aria-label="Aktifkan dengan kode autentikator">
              {submitting ? 'Memverifikasi...' : 'Verifikasi'}
            </Button>
            <Button
              flex={1}
              disabled={submitting}
              onPress={cancelEnrollmentWithKeyboardDismiss}
              aria-disabled={submitting}
              aria-label="Batalkan aktivasi">
              Batalkan
            </Button>
          </XStack>
        </YStack>
      </Card>
    );
  };

  const renderPasswordDialog = () => {
    const isDisabling = enrollmentMode === 'disabling-password';
    const isOpen = enrollmentMode === 'enrolling-password' || isDisabling;

    if (!isOpen) {
      return null;
    }

    return (
      <Dialog modal open={isOpen} onOpenChange={handlePasswordDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="password-overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <KeyboardAvoidingWrapper
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={dialogKeyboardOffset}>
            <Dialog.Content
              key="password-content"
              bordered
              elevate
              width="92%"
              maxWidth={440}
              maxHeight={availableDialogHeight}
              padding="$5"
              gap="$5"
              backgroundColor="$surface"
              borderColor="$surfaceBorder"
              borderRadius="$6"
              animation={['quick', { opacity: { overshootClamping: true } }]}
              animateOnly={['transform', 'opacity']}
              enterStyle={{ y: -20, opacity: 0, scale: 0.95 }}
              exitStyle={{ y: 10, opacity: 0, scale: 0.95 }}>
              <ScrollView
                style={{ maxHeight: availableDialogHeight }}
                contentContainerStyle={{ paddingBottom: dialogBottomPadding }}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                showsVerticalScrollIndicator={false}>
                <YStack gap="$4">
                  <YStack gap="$1">
                    <Dialog.Title fontSize="$6" fontWeight="700" color="$color">
                      Masukkan password akun
                    </Dialog.Title>
                    <Dialog.Description fontSize="$3" color="$colorPress">
                      {isDisabling
                        ? 'Konfirmasi identitas sebelum menonaktifkan verifikasi 2 langkah.'
                        : 'Konfirmasi identitas sebelum mengaktifkan verifikasi 2 langkah.'}
                    </Dialog.Description>
                  </YStack>

                  {isDisabling && factors.length > 1 ? (
                    <YStack gap="$2" padding="$3" backgroundColor="$background" borderRadius="$4">
                      <Text fontSize="$3" fontWeight="600" color="$color">
                        Pilih aplikasi autentikator
                      </Text>
                      {factors.map(factor => {
                        const isSelected = factor.id === selectedFactorId;

                        return (
                          <Button
                            key={factor.id}
                            justifyContent="flex-start"
                            minHeight={44}
                            backgroundColor={isSelected ? '$primary' : '$background'}
                            color={isSelected ? '$onPrimary' : '$color'}
                            borderWidth={1}
                            borderColor={isSelected ? '$primary' : '$surfaceBorder'}
                            disabled={submitting}
                            onPress={() => setSelectedFactorId(factor.id)}
                            role="radio"
                            aria-selected={isSelected}
                            aria-disabled={submitting}
                            aria-label={`Pilih aplikasi autentikator ${getFactorLabel(factor)}`}>
                            {isSelected ? '● ' : '○ '}
                            {getFactorLabel(factor)}
                          </Button>
                        );
                      })}
                    </YStack>
                  ) : null}

                  <YStack gap="$2">
                    <Text fontSize="$3" fontWeight="600" color="$color">
                      Password
                    </Text>
                    <Input
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCapitalize="none"
                      autoComplete="password"
                      returnKeyType="done"
                      submitBehavior="blurAndSubmit"
                      onSubmitEditing={submitPasswordConfirmation}
                      minHeight={48}
                      borderRadius="$4"
                      borderColor="$surfaceBorder"
                      backgroundColor="$background"
                      placeholder="Masukkan password"
                      aria-label={
                        isDisabling
                          ? 'Password akun untuk menonaktifkan verifikasi 2 langkah'
                          : 'Password akun untuk mengaktifkan verifikasi 2 langkah'
                      }
                    />
                  </YStack>
                  {renderEnrollmentError()}
                  <XStack gap="$3" marginTop="$1" flexDirection={isNarrowScreen ? 'column' : 'row'}>
                    <Button
                      flex={1}
                      backgroundColor="$primary"
                      color="$onPrimary"
                      minHeight={48}
                      borderRadius="$4"
                      disabled={submitting || password.length === 0}
                      onPress={submitPasswordConfirmation}
                      aria-disabled={submitting || password.length === 0}
                      aria-label={
                        isDisabling
                          ? 'Lanjutkan penonaktifan verifikasi 2 langkah'
                          : 'Lanjutkan aktivasi verifikasi 2 langkah'
                      }>
                      {submitting ? 'Memproses...' : 'Lanjutkan'}
                    </Button>
                    <Button
                      flex={1}
                      minHeight={48}
                      borderRadius="$4"
                      disabled={submitting}
                      onPress={cancelEnrollmentWithKeyboardDismiss}
                      aria-disabled={submitting}
                      aria-label={isDisabling ? 'Batalkan penonaktifan' : 'Batalkan aktivasi'}>
                      Batalkan
                    </Button>
                  </XStack>
                </YStack>
              </ScrollView>
            </Dialog.Content>
          </KeyboardAvoidingWrapper>
        </Dialog.Portal>
      </Dialog>
    );
  };

  const renderSetupDialog = () => {
    const isOpen = enrollmentMode === 'enrolling-qr';
    const setupDialogMaxHeight = Math.min(
      availableDialogHeight,
      Math.max(320, Math.floor(windowHeight * 0.72)),
    );
    const setupDialogBodyMaxHeight = Math.max(160, setupDialogMaxHeight - 300);
    const qrCodeSize = Math.min(210, Math.max(180, Math.floor(windowWidth * 0.5)));

    if (!isOpen) {
      return null;
    }

    return (
      <Dialog modal open={isOpen} onOpenChange={handleSetupDialogOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay
            key="setup-overlay"
            animation="quick"
            opacity={0.5}
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <KeyboardAvoidingWrapper
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={dialogKeyboardOffset}>
            <Dialog.Content
              key="setup-content"
              bordered
              elevate
              width="94%"
              maxWidth={500}
              maxHeight={setupDialogMaxHeight}
              overflow="hidden"
              padding="$5"
              gap="$5"
              backgroundColor="$surface"
              borderColor="$surfaceBorder"
              borderRadius="$6"
              x={0}
              y={0}
              scale={1}
              opacity={1}
              animation={['quick', { opacity: { overshootClamping: true } }]}
              animateOnly={['transform', 'opacity']}
              enterStyle={{ opacity: 0, scale: 0.98 }}
              exitStyle={{ opacity: 0, scale: 0.98 }}>
              <YStack gap="$4">
                <YStack gap="$1">
                  <Dialog.Title fontSize="$6" fontWeight="700" color="$color">
                    Hubungkan aplikasi autentikator
                  </Dialog.Title>
                  <Dialog.Description fontSize="$3" color="$colorPress">
                    Pindai kode QR, atau salin kode manual jika aplikasi autentikator memintanya.
                  </Dialog.Description>
                </YStack>

                <ScrollView
                  style={{ maxHeight: setupDialogBodyMaxHeight }}
                  contentContainerStyle={{ flexGrow: 0 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}>
                  <YStack gap="$4">
                    {enrollmentData.qrCode ? (
                      <YStack
                        width="100%"
                        alignItems="center"
                        justifyContent="center"
                        padding="$3"
                        borderRadius="$5"
                        borderWidth={1}
                        borderColor="$surfaceBorder"
                        backgroundColor="white"
                        testID="mfa-qr-code">
                        <SvgXml
                          xml={enrollmentData.qrCode}
                          width={qrCodeSize}
                          height={qrCodeSize}
                        />
                      </YStack>
                    ) : (
                      <Text fontSize="$3" color="$colorPress" testID="mfa-uri-fallback">
                        {enrollmentData.uri}
                      </Text>
                    )}

                    <Card
                      padding="$3"
                      backgroundColor="$background"
                      borderRadius="$4"
                      borderWidth={1}
                      borderColor="$surfaceBorder">
                      <YStack gap="$2">
                        <Text fontSize="$3" fontWeight="600" color="$color">
                          Kode manual
                        </Text>
                        <Text fontSize="$4" color="$color" selectable testID="mfa-manual-secret">
                          {enrollmentData.secret}
                        </Text>
                        <Button
                          minHeight={44}
                          borderRadius="$4"
                          backgroundColor={secretCopied ? '$success' : '$primarySoft'}
                          borderWidth={1}
                          borderColor={secretCopied ? '$success' : '$primary'}
                          color={secretCopied ? '$onPrimary' : '$primary'}
                          onPress={handleSecretCopy}
                          aria-label={
                            secretCopied ? 'Kode manual sudah disalin' : 'Salin kode manual'
                          }>
                          {secretCopied ? 'Kode disalin' : 'Salin kode'}
                        </Button>
                      </YStack>
                    </Card>

                    {renderEnrollmentError()}
                    {renderEnrollmentNotice()}
                  </YStack>
                </ScrollView>

                <YStack gap="$2">
                  <Button
                    backgroundColor="$primary"
                    color="$onPrimary"
                    minHeight={48}
                    borderRadius="$4"
                    disabled={submitting}
                    onPress={submitCreateChallenge}
                    aria-disabled={submitting}
                    aria-busy={submitting}
                    aria-label="Saya sudah menambahkan aplikasi autentikator">
                    {submitting ? 'Memproses...' : 'Saya sudah menambahkan aplikasi'}
                  </Button>
                  <Button
                    backgroundColor="$danger"
                    color="$onDanger"
                    minHeight={48}
                    borderRadius="$4"
                    disabled={submitting}
                    onPress={cancelEnrollmentWithKeyboardDismiss}
                    aria-disabled={submitting}
                    aria-label="Batalkan setup aktivasi">
                    Batalkan
                  </Button>
                </YStack>
              </YStack>
            </Dialog.Content>
          </KeyboardAvoidingWrapper>
        </Dialog.Portal>
      </Dialog>
    );
  };

  if (loading) {
    return (
      <SafeAreaView edges={['bottom']}>
        <YStack
          flex={1}
          alignItems="center"
          justifyContent="center"
          aria-label="Memuat verifikasi"
          aria-live="polite">
          <Spinner size="large" color="$primary" />
        </YStack>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView edges={['bottom']}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={mainScrollContentContainerStyle}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}>
          <YStack flex={1} alignItems="center" justifyContent="center" gap="$4">
            <Text fontSize="$5" fontWeight="600" color="$danger" textAlign="center">
              Gagal memuat pengaturan verifikasi
            </Text>
            <Text fontSize="$3" color="$colorPress" textAlign="center">
              {error}
            </Text>
            <Button
              backgroundColor="$primary"
              color="$onPrimary"
              onPress={loadFactors}
              aria-label="Muat ulang pengaturan verifikasi">
              Muat ulang
            </Button>
          </YStack>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['bottom']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={mainScrollContentContainerStyle}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}>
        <YStack gap="$4">
          <Card
            padding="$4"
            backgroundColor="$surface"
            borderWidth={1}
            borderColor="$surfaceBorder"
            borderRadius="$4">
            <YStack gap="$4">
              <XStack
                gap="$3"
                alignItems="flex-start"
                justifyContent="space-between"
                flexWrap="wrap">
                <YStack flex={1} minWidth={220} gap="$1">
                  <Text fontSize="$3" color="$colorPress">
                    {isEnabled
                      ? 'Anda akan diminta memasukkan kode tambahan saat masuk.'
                      : 'Tambahkan kode verifikasi untuk membantu menjaga akun Anda.'}
                  </Text>
                </YStack>
                <StatusBadge variant={isEnabled ? 'success' : 'neutral'} size="compact">
                  {isEnabled ? 'Aktif' : 'Nonaktif'}
                </StatusBadge>
              </XStack>

              {isEnabled ? (
                <YStack gap="$2">
                  {factors.map(factor => (
                    <Text key={factor.id} fontSize="$4" color="$color" testID="mfa-factor-name">
                      {getFactorLabel(factor)}
                    </Text>
                  ))}
                </YStack>
              ) : (
                <Text fontSize="$4" color="$colorPress">
                  Belum ada metode verifikasi yang aktif.
                </Text>
              )}

              <Button
                backgroundColor={isEnabled ? '$danger' : '$primary'}
                color={isEnabled ? '$onDanger' : '$onPrimary'}
                disabled={enrollmentMode !== 'idle'}
                onPress={isEnabled ? startDisable : startEnrollment}
                aria-disabled={enrollmentMode !== 'idle'}
                aria-label={
                  isEnabled ? 'Nonaktifkan verifikasi 2 langkah' : 'Aktifkan verifikasi 2 langkah'
                }>
                {isEnabled ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>
            </YStack>
          </Card>

          {renderEnrollmentNotice()}
          {renderEnrollmentFlow()}
          <Text fontSize="$3" color="$colorHover">
            Kode cadangan belum tersedia. Pastikan Anda tetap dapat membuka aplikasi autentikator.
          </Text>
        </YStack>
      </ScrollView>
      {renderPasswordDialog()}
      {renderSetupDialog()}
    </SafeAreaView>
  );
}
