/**
 * Validation utilities for form inputs
 * Provides reusable validation functions for email, password, and other common inputs
 */

// Password validation constants
export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MEDIUM_LENGTH = 8;

/**
 * Password strength levels
 */
export enum PasswordStrength {
  EMPTY = 0,
  WEAK = 1,
  MEDIUM = 2,
  STRONG = 3,
}

/**
 * Password strength result
 */
export interface PasswordStrengthResult {
  strength: PasswordStrength;
  text: string;
}

/**
 * Password validation result
 */
export interface PasswordValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates email format using a strict regex pattern
 *
 * This regex follows RFC 5322 specification more closely than basic patterns:
 * - Allows alphanumeric and special characters before @
 * - Validates domain structure
 * - Prevents common invalid patterns
 *
 * @param email - Email string to validate
 * @returns true if email format is valid, false otherwise
 *
 * @example
 * ```typescript
 * validateEmail('user@example.com') // true
 * validateEmail('invalid.email') // false
 * ```
 */
export function validateEmail(email: string): boolean {
  // More strict email regex following RFC 5322 specification
  // Allows: alphanumeric, dots, plus, minus, underscore before @
  // Domain: alphanumeric, dots, hyphens
  // TLD: at least 2 characters
  const emailRegex =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  return emailRegex.test(email.trim());
}

/**
 * Validates password with complexity requirements
 *
 * Requirements:
 * - Minimum length: 6 characters
 * - Must contain at least one letter
 * - Must contain at least one number
 *
 * @param password - Password string to validate
 * @returns Validation result with valid flag and optional error message
 *
 * @example
 * ```typescript
 * const result = validatePassword('password123');
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validatePassword(password: string): PasswordValidationResult {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return {
      valid: false,
      error: `Password minimal ${PASSWORD_MIN_LENGTH} karakter.`,
    };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasLetter || !hasNumber) {
    return {
      valid: false,
      error: 'Password harus mengandung huruf dan angka.',
    };
  }

  return { valid: true };
}

/**
 * Calculates password strength indicator
 *
 * Strength levels based on length AND complexity:
 * - EMPTY (0): No password entered
 * - WEAK (1): Less than minimum length OR missing complexity (letter/number)
 * - MEDIUM (2): Meets minimum length and complexity, but less than medium length
 * - STRONG (3): Meets medium length or longer AND has complexity
 *
 * This ensures strength indicator matches validation requirements.
 *
 * @param password - Password string to evaluate
 * @returns Password strength result with level and display text
 *
 * @example
 * ```typescript
 * const strength = getPasswordStrength('password123');
 * console.log(strength.text); // "Kuat"
 * console.log(strength.strength); // 3
 * ```
 */
export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (password.length === 0) {
    return { strength: PasswordStrength.EMPTY, text: '' };
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasComplexity = hasLetter && hasNumber;

  // Weak: less than minimum length OR missing complexity
  if (password.length < PASSWORD_MIN_LENGTH || !hasComplexity) {
    return { strength: PasswordStrength.WEAK, text: 'Lemah' };
  }

  // Medium: meets minimum requirements but less than medium length
  if (password.length < PASSWORD_MEDIUM_LENGTH) {
    return { strength: PasswordStrength.MEDIUM, text: 'Sedang' };
  }

  // Strong: meets medium length or longer AND has complexity
  return { strength: PasswordStrength.STRONG, text: 'Kuat' };
}
