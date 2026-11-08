import { parseConfig, type RawEnv } from '@/config/env';

const LIVE_ENV: RawEnv = {
  EXPO_PUBLIC_APP_ENV: 'development',
  EXPO_PUBLIC_USE_MOCKS: 'false',
  EXPO_PUBLIC_SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co/',
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key_123',
};

// JWT whose payload is {"role":"service_role"}; the signature is irrelevant.
const SERVICE_ROLE_JWT =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.signature';

function issuesFor(raw: RawEnv): string[] {
  const result = parseConfig(raw);
  return result.ok ? [] : result.issues;
}

describe('parseConfig', () => {
  it('accepts a complete live configuration and normalises the URL', () => {
    const result = parseConfig(LIVE_ENV);
    expect(result).toEqual({
      ok: true,
      config: {
        appEnv: 'development',
        useMocks: false,
        supabase: {
          url: 'https://abcdefghijklmnop.supabase.co',
          publishableKey: 'sb_publishable_test_key_123',
        },
        googleMapsFunctionName: 'google-maps',
      },
    });
  });

  it('allows mock mode without Supabase values', () => {
    const result = parseConfig({ EXPO_PUBLIC_USE_MOCKS: 'true' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.config.useMocks).toBe(true);
      expect(result.config.supabase).toBeNull();
    }
  });

  it('reports every missing required value', () => {
    const issues = issuesFor({});
    expect(issues).toHaveLength(2);
    expect(issues.join('\n')).toMatch(/EXPO_PUBLIC_SUPABASE_URL is required/);
    expect(issues.join('\n')).toMatch(/EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required/);
  });

  it('rejects the placeholders from .env.example', () => {
    const issues = issuesFor({
      EXPO_PUBLIC_SUPABASE_URL: 'https://your-project-ref.supabase.co',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'your-publishable-key',
    });
    expect(issues).toHaveLength(2);
    expect(issues.every((issue) => issue.includes('placeholder'))).toBe(true);
  });

  it.each([['sb_secret_abc123'], [SERVICE_ROLE_JWT]])(
    'refuses server secrets as the publishable key (%s)',
    (key) => {
      const issues = issuesFor({ ...LIVE_ENV, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key });
      expect(issues.join('\n')).toMatch(/secret or service-role key/);
    },
  );

  it('refuses server secrets even in mock mode', () => {
    const issues = issuesFor({
      EXPO_PUBLIC_USE_MOCKS: 'true',
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_abc123',
    });
    expect(issues).toHaveLength(1);
  });

  it('does not allow mocks in production', () => {
    const issues = issuesFor({ EXPO_PUBLIC_APP_ENV: 'production', EXPO_PUBLIC_USE_MOCKS: 'true' });
    expect(issues.join('\n')).toMatch(/cannot be enabled/);
  });

  it('allows http only for local development', () => {
    const local = { ...LIVE_ENV, EXPO_PUBLIC_SUPABASE_URL: 'http://192.168.1.10:54321' };
    expect(parseConfig(local).ok).toBe(true);
    expect(issuesFor({ ...local, EXPO_PUBLIC_APP_ENV: 'preview' }).join('\n')).toMatch(
      /must use https/,
    );
  });

  it('rejects URLs with paths, invalid booleans and unknown environments', () => {
    const issues = issuesFor({
      ...LIVE_ENV,
      EXPO_PUBLIC_APP_ENV: 'staging',
      EXPO_PUBLIC_USE_MOCKS: 'yes',
      EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co/rest/v1',
      EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION: 'bad name!',
    });
    expect(issues).toHaveLength(4);
  });
});
