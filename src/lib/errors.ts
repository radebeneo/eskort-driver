export type AppErrorCode =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'config'
  | 'location_unavailable'
  | 'unknown';

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';
const NETWORK_MESSAGE = 'We could not reach the server. Check your connection and try again.';

/**
 * Error type shared by services and UI. `message` is always safe to show to a
 * driver; `details` keeps the original error for debugging.
 */
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly details?: unknown;

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.details = details;
  }
}

/** Duck-typed so it also works when class identity is lost by transpilation. */
export function isAppError(value: unknown): value is AppError {
  if (value instanceof AppError) return true;
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { name?: unknown; code?: unknown; message?: unknown };
  return (
    candidate.name === 'AppError' &&
    typeof candidate.code === 'string' &&
    typeof candidate.message === 'string'
  );
}

export function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /network request failed|failed to fetch|fetch failed|network error/i.test(error.message);
}

export function toAppError(error: unknown, fallbackMessage: string = DEFAULT_MESSAGE): AppError {
  if (isAppError(error)) return error;
  if (isNetworkFailure(error)) return new AppError('network', NETWORK_MESSAGE, error);
  return new AppError('unknown', fallbackMessage, error);
}

export const appErrorMessages = {
  network: NETWORK_MESSAGE,
  fallback: DEFAULT_MESSAGE,
} as const;
