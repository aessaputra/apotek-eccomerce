import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { getAuthErrorMessage, isUserAlreadyExistsError } from '@/constants/auth.errors';
import { signUp } from '@/services/auth.service';
import { getPasswordStrength, validateEmail } from '@/utils/validation';
import {
  buildVerifyEmailRouteParams,
  normalizeAuthEmail,
  validateAuthPassword,
} from './authForm.helpers';

type SignUpField = 'email' | 'password';

type SignUpFieldErrors = {
  email: boolean;
  password: boolean;
};

type SignUpFormValues = {
  email: string;
  password: string;
};

type SignUpValidationResult =
  | {
      valid: true;
      email: string;
    }
  | {
      valid: false;
      message: string;
      fieldErrors: SignUpFieldErrors;
    };

const EMPTY_FIELD_ERRORS: SignUpFieldErrors = {
  email: false,
  password: false,
};

function validateSignUpForm(values: SignUpFormValues): SignUpValidationResult {
  const trimmedEmail = normalizeAuthEmail(values.email);

  if (!trimmedEmail || !values.password) {
    return {
      valid: false,
      message: 'Email dan password wajib diisi.',
      fieldErrors: {
        email: !trimmedEmail,
        password: !values.password,
      },
    };
  }

  if (!validateEmail(trimmedEmail)) {
    return {
      valid: false,
      message: 'Format email tidak valid.',
      fieldErrors: {
        ...EMPTY_FIELD_ERRORS,
        email: true,
      },
    };
  }

  const passwordValidation = validateAuthPassword(values.password);

  if (!passwordValidation.valid) {
    return {
      valid: false,
      message: passwordValidation.error ?? 'Password tidak valid.',
      fieldErrors: {
        ...EMPTY_FIELD_ERRORS,
        password: true,
      },
    };
  }

  return {
    valid: true,
    email: trimmedEmail,
  };
}

export function useSignUpForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [focusedField, setFocusedField] = useState<SignUpField | null>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const handleEmailChange = useCallback((text: string) => {
    setEmail(text);
    setEmailError(false);
    setError(null);
  }, []);

  const handlePasswordChange = useCallback((text: string) => {
    setPassword(text);
    setPasswordError(false);
    setError(null);
  }, []);

  const handleEmailFocus = useCallback(() => {
    setFocusedField('email');
  }, []);

  const handlePasswordFocus = useCallback(() => {
    setFocusedField('password');
  }, []);

  const handleFieldBlur = useCallback(() => {
    setFocusedField(null);
  }, []);

  const applyValidationError = useCallback((message: string, fieldErrors: SignUpFieldErrors) => {
    setError(message);
    setEmailError(fieldErrors.email);
    setPasswordError(fieldErrors.password);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setEmailError(false);
    setPasswordError(false);

    const validation = validateSignUpForm({ email, password });

    if (!validation.valid) {
      applyValidationError(validation.message, validation.fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await signUp({
        email: validation.email,
        password,
      });

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError));

        if (isUserAlreadyExistsError(signUpError)) {
          setEmailError(true);
        }

        return;
      }

      if (data?.user && !data.session) {
        router.push({
          pathname: '/(auth)/verify-email',
          params: buildVerifyEmailRouteParams(validation.email),
        });
      }
    } catch {
      setError('Terjadi kesalahan saat mendaftar. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [applyValidationError, email, password, router]);

  return {
    email,
    password,
    loading,
    error,
    emailError,
    passwordError,
    focusedField,
    passwordStrength,
    dismissError,
    handleEmailChange,
    handlePasswordChange,
    handleEmailFocus,
    handlePasswordFocus,
    handleFieldBlur,
    handleSubmit,
  };
}
