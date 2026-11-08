/**
 * Client configuration.
 *
 * Only values that are safe to ship inside the app bundle may be read here.
 * Expo inlines `EXPO_PUBLIC_*` variables at build time, and only when they are
 * referenced with static dot access (`process.env.EXPO_PUBLIC_X`). Keep
 * `readProcessEnv` free of dynamic lookups such as `process.env[name]`.
 */

export const APP_ENVIRONMENTS = ['development', 'preview', 'production'] as const;
export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export type SupabaseConfig = {
  url: string;
  publishableKey: string;
};

export type AppConfig = {
  appEnv: AppEnvironment;
  /** When true, every backend integration is replaced by in-memory mocks. */
  useMocks: boolean;
  /** Always set in live mode; null in mock mode. */
  supabase: SupabaseConfig | null;
  /** Supabase Edge Function that proxies Google routing, distance matrix and places. */
  googleMapsFunctionName: string;
};

export type RawEnv = {
  EXPO_PUBLIC_APP_ENV?: string;
  EXPO_PUBLIC_USE_MOCKS?: string;
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION?: string;
};

export type ConfigResult = { ok: true; config: AppConfig } | { ok: false; issues: string[] };

export const DEFAULT_GOOGLE_MAPS_FUNCTION = 'google-maps';

const PLACEHOLDER_PATTERN = /your[-_]|replace[-_]?me|changeme|placeholder|<[^>]*>/i;
const BASE_URL_PATTERN = /^https?:\/\/[^\s/?#]+\/?$/i;
const FUNCTION_NAME_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isAppEnvironment(value: string): value is AppEnvironment {
  return (APP_ENVIRONMENTS as readonly string[]).includes(value);
}

function parseBoolean(name: string, value: string | undefined, issues: string[]): boolean {
  if (value === undefined) return false;
  const normalized = value.toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  issues.push(`${name} must be "true" or "false" (received "${value}").`);
  return false;
}

/** Reads the `role` claim from a JWT-shaped key without verifying it. */
function decodeJwtRole(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const decode = (globalThis as { atob?: (data: string) => string }).atob;
  if (!decode) return null;
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload: unknown = JSON.parse(decode(padded));
    if (typeof payload === 'object' && payload !== null && 'role' in payload) {
      const role = (payload as { role: unknown }).role;
      return typeof role === 'string' ? role : null;
    }
    return null;
  } catch {
    return null;
  }
}

function looksLikeServerSecret(key: string): boolean {
  return key.startsWith('sb_secret_') || decodeJwtRole(key) === 'service_role';
}

/** Pure validation, so it can be unit tested with any input. */
export function parseConfig(raw: RawEnv): ConfigResult {
  const issues: string[] = [];

  const appEnvValue = clean(raw.EXPO_PUBLIC_APP_ENV) ?? 'development';
  let appEnv: AppEnvironment = 'development';
  if (isAppEnvironment(appEnvValue)) {
    appEnv = appEnvValue;
  } else {
    issues.push(
      `EXPO_PUBLIC_APP_ENV must be one of ${APP_ENVIRONMENTS.join(', ')} (received "${appEnvValue}").`,
    );
  }

  const useMocks = parseBoolean('EXPO_PUBLIC_USE_MOCKS', clean(raw.EXPO_PUBLIC_USE_MOCKS), issues);
  if (useMocks && appEnv === 'production') {
    issues.push(
      'EXPO_PUBLIC_USE_MOCKS cannot be enabled when EXPO_PUBLIC_APP_ENV is "production".',
    );
  }

  const url = clean(raw.EXPO_PUBLIC_SUPABASE_URL);
  const key = clean(raw.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

  if (key && looksLikeServerSecret(key)) {
    issues.push(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY looks like a Supabase secret or service-role key. ' +
        'Server keys must never ship in the app; use the publishable (anon) key.',
    );
  }

  if (!useMocks) {
    if (!url) {
      issues.push('EXPO_PUBLIC_SUPABASE_URL is required (or set EXPO_PUBLIC_USE_MOCKS=true).');
    } else if (PLACEHOLDER_PATTERN.test(url)) {
      issues.push('EXPO_PUBLIC_SUPABASE_URL still contains the placeholder from .env.example.');
    } else if (!BASE_URL_PATTERN.test(url)) {
      issues.push(
        'EXPO_PUBLIC_SUPABASE_URL must be a base URL such as https://<project-ref>.supabase.co.',
      );
    } else if (url.toLowerCase().startsWith('http://') && appEnv !== 'development') {
      issues.push('EXPO_PUBLIC_SUPABASE_URL must use https outside development.');
    }

    if (!key) {
      issues.push(
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required (or set EXPO_PUBLIC_USE_MOCKS=true).',
      );
    } else if (PLACEHOLDER_PATTERN.test(key)) {
      issues.push(
        'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY still contains the placeholder from .env.example.',
      );
    }
  }

  const googleMapsFunctionName =
    clean(raw.EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION) ?? DEFAULT_GOOGLE_MAPS_FUNCTION;
  if (!FUNCTION_NAME_PATTERN.test(googleMapsFunctionName)) {
    issues.push(
      `EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION must be a Supabase Edge Function name (received "${googleMapsFunctionName}").`,
    );
  }

  if (issues.length > 0) return { ok: false, issues };

  const supabase: SupabaseConfig | null =
    !useMocks && url && key ? { url: url.replace(/\/$/, ''), publishableKey: key } : null;

  return { ok: true, config: { appEnv, useMocks, supabase, googleMapsFunctionName } };
}

export function readProcessEnv(): RawEnv {
  return {
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV,
    EXPO_PUBLIC_USE_MOCKS: process.env.EXPO_PUBLIC_USE_MOCKS,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION: process.env.EXPO_PUBLIC_GOOGLE_MAPS_FUNCTION,
  };
}

let cachedResult: ConfigResult | undefined;

/** Validated configuration for the running app (computed once). */
export function getConfigResult(): ConfigResult {
  if (!cachedResult) cachedResult = parseConfig(readProcessEnv());
  return cachedResult;
}
