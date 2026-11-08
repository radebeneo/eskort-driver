import { Button } from '@/components/ui/button';

import { StateLayout } from './state-layout';

export type StateAction = {
  label: string;
  onPress: () => void;
};

export type EmptyStateProps = {
  title: string;
  message?: string;
  action?: StateAction;
};

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <StateLayout title={title} message={message} testID="empty-state">
      {action ? <Button label={action.label} variant="secondary" onPress={action.onPress} /> : null}
    </StateLayout>
  );
}
