import { Button } from '@/components/ui/button';
import { appErrorMessages, type AppError } from '@/lib/errors';

import type { StateAction } from './empty-state';
import { StateLayout } from './state-layout';

export type ErrorStateProps = {
  title?: string;
  /** Overrides the error's own message. */
  message?: string;
  error?: AppError | null;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryAction?: StateAction;
};

export function ErrorState({
  title = 'Something went wrong',
  message,
  error,
  onRetry,
  retryLabel = 'Try again',
  secondaryAction,
}: ErrorStateProps) {
  return (
    <StateLayout
      title={title}
      message={message ?? error?.message ?? appErrorMessages.fallback}
      isAlert
      testID="error-state">
      {onRetry ? <Button label={retryLabel} onPress={onRetry} /> : null}
      {secondaryAction ? (
        <Button
          label={secondaryAction.label}
          variant="secondary"
          onPress={secondaryAction.onPress}
        />
      ) : null}
    </StateLayout>
  );
}
