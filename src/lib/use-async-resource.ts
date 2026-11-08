import { useCallback, useEffect, useState } from 'react';

import { type AppError, toAppError } from '@/lib/errors';

export type AsyncResourceState<T> =
  | { status: 'loading'; data: undefined; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: T | undefined; error: AppError };

export type AsyncResource<T> = {
  state: AsyncResourceState<T>;
  /** True while a pull-to-refresh request is in flight. Existing data stays visible. */
  isRefreshing: boolean;
  /** Reload while keeping existing data (pull-to-refresh). */
  refetch: () => void;
  /** Reset to the loading state and reload (after an error). */
  retry: () => void;
};

const LOADING_STATE = { status: 'loading', data: undefined, error: null } as const;

/**
 * Minimal async loader for read-only service calls.
 * `load` must be memoised (for example with `useCallback`) so it only changes
 * when its inputs change.
 */
export function useAsyncResource<T>(load: () => Promise<T>): AsyncResource<T> {
  const [state, setState] = useState<AsyncResourceState<T>>(LOADING_STATE);
  const [requestId, setRequestId] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let active = true;
    load()
      .then(
        (data) => {
          if (active) setState({ status: 'success', data, error: null });
        },
        (error: unknown) => {
          if (active) {
            setState((previous) => ({
              status: 'error',
              data: previous.data,
              error: toAppError(error),
            }));
          }
        },
      )
      .finally(() => {
        if (active) setIsRefreshing(false);
      });
    return () => {
      active = false;
    };
  }, [load, requestId]);

  const refetch = useCallback(() => {
    setIsRefreshing(true);
    setRequestId((id) => id + 1);
  }, []);

  const retry = useCallback(() => {
    setState(LOADING_STATE);
    setRequestId((id) => id + 1);
  }, []);

  return { state, isRefreshing, refetch, retry };
}
