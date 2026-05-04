import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  listMfaFactors,
  createMfaChallenge,
  verifyMfaChallenge,
  signOut,
  refreshAuthSession,
} from '@/services/auth.service';
import { useAppSlice } from '@/slices';
import type { AuthFormStatus } from './authForm.helpers';

type MfaFactor = {
  id: string;
  type: string;
  status: string;
};

const INVALID_CODE_MESSAGE = 'Kode verifikasi tidak valid. Coba lagi.';
const MISSING_FACTOR_MESSAGE = 'Verifikasi 2 langkah belum siap. Silakan masuk ulang.';
const CHALLENGE_EXCEPTION_MESSAGE = 'Terjadi kesalahan saat memverifikasi. Silakan coba lagi.';

export function useVerifyMfa() {
  const router = useRouter();
  const { dispatch, setAuthPhase } = useAppSlice();
  const [status, setStatus] = useState<AuthFormStatus>('idle');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [factors, setFactors] = useState<MfaFactor[]>([]);
  const [selectedFactorId, setSelectedFactorId] = useState<string | null>(null);
  const challengeIdRef = useRef<string | null>(null);

  // Load verified TOTP factors on mount
  useEffect(() => {
    let cancelled = false;

    async function loadFactors() {
      setStatus('submitting');
      setError(null);

      const { data, error: factorError } = await listMfaFactors();

      if (cancelled) return;

      if (factorError || !data) {
        setError(MISSING_FACTOR_MESSAGE);
        setStatus('error');
        return;
      }

      const allFactors = data as { totp: MfaFactor[] } | null;
      const totpFactors: MfaFactor[] = allFactors?.totp ?? [];
      const verifiedFactors = totpFactors.filter(f => f.status === 'verified');

      if (verifiedFactors.length === 0) {
        setError(MISSING_FACTOR_MESSAGE);
        setStatus('error');
        return;
      }

      setFactors(verifiedFactors);

      // Auto-select and challenge if exactly one factor
      if (verifiedFactors.length === 1) {
        const factor = verifiedFactors[0];
        setSelectedFactorId(factor.id);
        void challengeFactor(factor.id);
      } else {
        // Multiple factors — wait for user selection
        setStatus('idle');
      }
    }

    async function challengeFactor(factorId: string) {
      const { data: challengeData, error: challengeError } = await createMfaChallenge(factorId);

      if (cancelled) return;

      if (challengeError || !challengeData) {
        setError(MISSING_FACTOR_MESSAGE);
        setStatus('error');
        return;
      }

      const challenge = challengeData as { id: string } | null;
      challengeIdRef.current = challenge?.id ?? null;
      setStatus('idle');
    }

    loadFactors();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelectFactor = useCallback(async (factorId: string) => {
    setSelectedFactorId(factorId);
    setStatus('submitting');
    setError(null);

    const { data, error: challengeError } = await createMfaChallenge(factorId);

    if (challengeError || !data) {
      setError(MISSING_FACTOR_MESSAGE);
      setStatus('error');
      return;
    }

    const challenge = data as { id: string } | null;
    challengeIdRef.current = challenge?.id ?? null;
    setStatus('idle');
  }, []);

  const handleCodeChange = useCallback((text: string) => {
    setCode(text);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedFactorId || !challengeIdRef.current) {
      setError(MISSING_FACTOR_MESSAGE);
      return;
    }

    const trimmedCode = code.trim();

    if (!trimmedCode) {
      setError(INVALID_CODE_MESSAGE);
      return;
    }

    setStatus('submitting');
    setError(null);

    try {
      const { error: verifyError } = await verifyMfaChallenge({
        factorId: selectedFactorId,
        challengeId: challengeIdRef.current,
        code: trimmedCode,
      });

      if (verifyError) {
        setError(INVALID_CODE_MESSAGE);
        setStatus('error');
        return;
      }

      const refreshResult = await refreshAuthSession();

      if (refreshResult.error) {
        setError('Gagal memperbarui sesi. Silakan coba lagi.');
        setStatus('error');
        return;
      }

      dispatch(setAuthPhase('authenticated'));
      setStatus('success');
      router.replace('/home');
    } catch {
      setError(CHALLENGE_EXCEPTION_MESSAGE);
      setStatus('error');
    }
  }, [code, selectedFactorId, router, dispatch, setAuthPhase]);

  const handleCancel = useCallback(async () => {
    try {
      await signOut({ scope: 'local' });
    } catch {
      // Best-effort sign-out; proceed to login regardless
    }

    router.replace('/(auth)/login');
  }, [router]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    status,
    code,
    error,
    factors,
    selectedFactorId,
    loading: status === 'submitting',
    handleCodeChange,
    handleSubmit,
    handleCancel,
    handleSelectFactor,
    dismissError,
  };
}
