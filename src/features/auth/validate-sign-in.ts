export type SignInInput = {
  email: string;
  password: string;
};

export type SignInFieldErrors = Partial<Record<keyof SignInInput, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Client-side checks only; Supabase decides whether the credentials are valid. */
export function validateSignIn({ email, password }: SignInInput): SignInFieldErrors {
  const errors: SignInFieldErrors = {};
  const trimmedEmail = email.trim();
  if (!trimmedEmail) errors.email = 'Enter your email address.';
  else if (!EMAIL_PATTERN.test(trimmedEmail)) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Enter your password.';
  return errors;
}

export function hasErrors(errors: SignInFieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}
