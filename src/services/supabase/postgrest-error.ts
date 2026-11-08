import { AppError, appErrorMessages } from '@/lib/errors';

type PostgrestLikeError = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

/**
 * Maps PostgREST errors to `AppError`s with driver-friendly messages.
 * `action` completes "We could not ...", for example "load your deliveries".
 */
export function fromPostgrestError(error: PostgrestLikeError, action: string): AppError {
  if (/network request failed|failed to fetch|fetch failed/i.test(error.message)) {
    return new AppError('network', appErrorMessages.network, error);
  }
  switch (error.code) {
    case 'PGRST301':
    case 'PGRST303':
      return new AppError('unauthorized', 'Your session has expired. Please sign in again.', error);
    case '42501':
      return new AppError('forbidden', `You don't have permission to ${action}.`, error);
    case 'PGRST116':
      return new AppError('not_found', 'The requested record was not found.', error);
    default:
      return new AppError('unknown', `We could not ${action}. Please try again.`, error);
  }
}
