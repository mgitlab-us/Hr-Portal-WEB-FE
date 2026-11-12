/**
 * Shared password policy for the web console.
 *
 * Mirrors PasswordSchema in `Hr-Portal-BE/src/modules/auth/auth.validation.ts`.
 * Keep both in sync; the backend remains the source of truth and returns 400
 * VALIDATION_ERROR when a password does not match.
 */

export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export interface PasswordRuleStatus extends PasswordRule {
  met: boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: 'At least 8 characters', test: (password) => password.length >= 8 },
  { label: 'One uppercase letter (A-Z)', test: (password) => /[A-Z]/.test(password) },
  { label: 'One lowercase letter (a-z)', test: (password) => /[a-z]/.test(password) },
  { label: 'One number (0-9)', test: (password) => /[0-9]/.test(password) },
];

export function evaluatePassword(password: string): PasswordRuleStatus[] {
  return PASSWORD_RULES.map((rule) => ({ ...rule, met: rule.test(password) }));
}

export function unmetPasswordRules(password: string): string[] {
  return evaluatePassword(password)
    .filter((rule) => !rule.met)
    .map((rule) => rule.label);
}

/**
 * Returns a user-facing explanation of the rules still missing, or null when
 * the password satisfies the full policy.
 */
export function passwordFormatError(password: string): string | null {
  const unmet = unmetPasswordRules(password);
  if (unmet.length === 0) return null;
  return `Password does not meet the required format: ${unmet
    .map((label) => label.toLowerCase())
    .join(', ')}.`;
}
