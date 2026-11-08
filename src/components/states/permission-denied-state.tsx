import { Button } from '@/components/ui/button';

import { StateLayout } from './state-layout';

export type PermissionDeniedStateProps = {
  /** Human-readable permission name, for example "Location". */
  permissionName: string;
  /** Why the app needs the permission. */
  message: string;
  /** When false the OS will not prompt again, so the driver is sent to Settings. */
  canAskAgain: boolean;
  onRequestPermission: () => void;
  onOpenSettings: () => void;
  title?: string;
};

export function PermissionDeniedState({
  permissionName,
  message,
  canAskAgain,
  onRequestPermission,
  onOpenSettings,
  title = `${permissionName} access is off`,
}: PermissionDeniedStateProps) {
  return (
    <StateLayout title={title} message={message} testID="permission-denied-state">
      {canAskAgain ? (
        <Button
          label={`Allow ${permissionName.toLowerCase()} access`}
          onPress={onRequestPermission}
        />
      ) : (
        <Button label="Open settings" onPress={onOpenSettings} />
      )}
    </StateLayout>
  );
}
