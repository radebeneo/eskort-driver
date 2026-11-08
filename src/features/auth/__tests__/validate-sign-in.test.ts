import { hasErrors, validateSignIn } from '@/features/auth/validate-sign-in';

describe('validateSignIn', () => {
  it('accepts a valid email (with surrounding spaces) and password', () => {
    const errors = validateSignIn({ email: '  driver@example.com ', password: 'secret' });
    expect(errors).toEqual({});
    expect(hasErrors(errors)).toBe(false);
  });

  it('requires both fields', () => {
    expect(validateSignIn({ email: ' ', password: '' })).toEqual({
      email: 'Enter your email address.',
      password: 'Enter your password.',
    });
  });

  it('rejects malformed emails', () => {
    const errors = validateSignIn({ email: 'driver@example', password: 'secret' });
    expect(errors.email).toBe('Enter a valid email address.');
    expect(hasErrors(errors)).toBe(true);
  });
});
