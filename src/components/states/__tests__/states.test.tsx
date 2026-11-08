import { fireEvent, render, screen } from '@testing-library/react-native';

import { EmptyState, ErrorState, LoadingState, PermissionDeniedState } from '@/components/states';
import { AppError } from '@/lib/errors';

describe('LoadingState', () => {
  it('exposes an accessible label', async () => {
    await render(<LoadingState label="Loading deliveries…" />);
    expect(screen.getByLabelText('Loading deliveries…')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders the message and optional action', async () => {
    const onPress = jest.fn();
    await render(
      <EmptyState
        title="No deliveries"
        message="New deliveries will appear here."
        action={{ label: 'Refresh', onPress }}
      />,
    );
    expect(screen.getByText('New deliveries will appear here.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Refresh' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('ErrorState', () => {
  it('shows the error message and retries', async () => {
    const onRetry = jest.fn();
    await render(
      <ErrorState error={new AppError('network', 'No connection.')} onRetry={onRetry} />,
    );

    expect(screen.getByRole('header', { name: 'Something went wrong' })).toBeTruthy();
    expect(screen.getByText('No connection.')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('falls back to a generic message and hides retry without a handler', async () => {
    await render(<ErrorState />);
    expect(screen.getByText('Something went wrong. Please try again.')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('PermissionDeniedState', () => {
  const baseProps = {
    permissionName: 'Location',
    message: 'Location is used to navigate to deliveries.',
  };

  it('asks again when the OS allows it', async () => {
    const onRequestPermission = jest.fn();
    const onOpenSettings = jest.fn();
    await render(
      <PermissionDeniedState
        {...baseProps}
        canAskAgain
        onRequestPermission={onRequestPermission}
        onOpenSettings={onOpenSettings}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Allow location access' }));
    expect(onRequestPermission).toHaveBeenCalledTimes(1);
    expect(onOpenSettings).not.toHaveBeenCalled();
  });

  it('sends the driver to Settings when it cannot ask again', async () => {
    const onRequestPermission = jest.fn();
    const onOpenSettings = jest.fn();
    await render(
      <PermissionDeniedState
        {...baseProps}
        canAskAgain={false}
        onRequestPermission={onRequestPermission}
        onOpenSettings={onOpenSettings}
      />,
    );
    expect(screen.getByText('Location access is off')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Open settings' }));
    expect(onOpenSettings).toHaveBeenCalledTimes(1);
    expect(onRequestPermission).not.toHaveBeenCalled();
  });
});
