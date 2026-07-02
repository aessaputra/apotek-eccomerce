import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { getAuthErrorMessage, isUserAlreadyExistsError } from '@/constants/auth.errors';
import { signUp } from '@/services/auth.service';
import {
  getPasswordStrength,
  validateEmail,
  validateFullName,
  validatePhoneNumber,
} from '@/utils/validation';
import {
  buildVerifyEmailRouteParams,
  normalizeAuthEmail,
  validateAuthPassword,
} from './authForm.helpers';

const SIGN_UP_EXCEPTION_MESSAGE = 'Belum berhasil membuat akun. Silakan coba lagi.';

type SignUpField = 'email' | 'password' | 'fullName' | 'phoneNumber';

type SignUpFieldErrors = {
  fullName: boolean;
  phoneNumber: boolean;
  email: boolean;
  password: boolean;
};

type SignUpFormValues = {
  fullName: string;
  phoneNumber: string;
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
  fullName: false,
  phoneNumber: false,
  email: false,
  password: false,
};

function validateSignUpForm(values: SignUpFormValues): SignUpValidationResult {
  const trimmedEmail = normalizeAuthEmail(values.email);

  if (!values.fullName || !trimmedEmail || !values.password) {
    return {
      valid: false,
      message: 'Nama lengkap, email, dan password wajib diisi.',
      fieldErrors: {
        fullName: !values.fullName,
        phoneNumber: false,
        email: !trimmedEmail,
        password: !values.password,
      },
    };
  }

  if (!validateFullName(values.fullName)) {
    return {
      valid: false,
      message: 'Nama lengkap harus 2\u201360 karakter.',
      fieldErrors: {
        ...EMPTY_FIELD_ERRORS,
        fullName: true,
      },
    };
  }

  if (values.phoneNumber && !validatePhoneNumber(values.phoneNumber)) {
    return {
      valid: false,
      message: 'Nomor telepon tidak valid (hanya angka, 9-15 digit).',
      fieldErrors: {
        ...EMPTY_FIELD_ERRORS,
        phoneNumber: true,
      },
    };
  }

  if (!validateEmail(trimmedEmail)) {
    return {
      valid: false,
      message: 'Masukkan email yang valid, contoh: nama@email.com.',
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
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullNameError, setFullNameError] = useState(false);
  const [phoneNumberError, setPhoneNumberError] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [focusedField, setFocusedField] = useState<SignUpField | null>(null);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const handleFullNameChange = useCallback((text: string) => {
    setFullName(text);
    setFullNameError(false);
    setError(null);
  }, []);

  const handlePhoneNumberChange = useCallback((text: string) => {
    // Only allow digits
    const cleaned = text.replace(/[^0-9]/g, '');
    setPhoneNumber(cleaned);
    setPhoneNumberError(false);
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

  const handleFullNameFocus = useCallback(() => {
    setFocusedField('fullName');
  }, []);

  const handlePhoneNumberFocus = useCallback(() => {
    setFocusedField('phoneNumber');
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
    setFullNameError(fieldErrors.fullName);
    setPhoneNumberError(fieldErrors.phoneNumber);
    setEmailError(fieldErrors.email);
    setPasswordError(fieldErrors.password);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setFullNameError(false);
    setPhoneNumberError(false);
    setEmailError(false);
    setPasswordError(false);

    const validation = validateSignUpForm({ fullName, phoneNumber, email, password });

    if (!validation.valid) {
      applyValidationError(validation.message, validation.fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await signUp({
        email: validation.email,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            phone_number: phoneNumber ? phoneNumber : undefined,
          },
        },
      });

      if (signUpError) {
        setError(getAuthErrorMessage(signUpError, SIGN_UP_EXCEPTION_MESSAGE));

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
      setError(SIGN_UP_EXCEPTION_MESSAGE);
    } finally {
      setLoading(false);
    }
  }, [applyValidationError, fullName, phoneNumber, email, password, router]);

  return {
    fullName,
    phoneNumber,
    email,
    password,
    loading,
    error,
    fullNameError,
    phoneNumberError,
    emailError,
    passwordError,
    focusedField,
    passwordStrength,
    dismissError,
    handleFullNameChange,
    handlePhoneNumberChange,
    handleEmailChange,
    handlePasswordChange,
    handleFullNameFocus,
    handlePhoneNumberFocus,
    handleEmailFocus,
    handlePasswordFocus,
    handleFieldBlur,
    handleSubmit,
  };
}
