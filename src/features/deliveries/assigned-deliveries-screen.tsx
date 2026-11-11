import { router } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';

import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Screen, Text, useTheme } from '@/components/ui';
import { useAuth } from '@/providers/auth-provider';
import { useDeliverySelectionStore } from '@/stores/delivery-selection-store';

import { DeliveryCard } from './delivery-card';
import { useAssignedDeliveries } from './use-deliveries';

function AssignedDeliveriesList({ driverId }: { driverId: string }) {
  const { state, isRefreshing, refetch, retry } = useAssignedDeliveries(driverId);
  const selectedDeliveryId = useDeliverySelectionStore((store) => store.selectedDeliveryId);
  const selectDelivery = useDeliverySelectionStore((store) => store.selectDelivery);
  const { colors, spacing } = useTheme();

  if (state.status === 'loading') {
    return (
      <Screen>
        <LoadingState label="Loading deliveries…" />
      </Screen>
    );
  }
  if (state.status === 'error' && !state.data) {
    return (
      <Screen>
        <ErrorState title="Couldn't load deliveries" error={state.error} onRetry={retry} />
      </Screen>
    );
  }

  const deliveries = state.data ?? [];
  const openDelivery = (id: string) => {
    selectDelivery(id);
    router.push({ pathname: '/deliveries/[id]', params: { id } });
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={deliveries}
        keyExtractor={(delivery) => delivery.id}
        contentContainerStyle={[
          { padding: spacing.lg, gap: spacing.md },
          deliveries.length === 0 && styles.grow,
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListHeaderComponent={
          state.status === 'error' ? (
            <Text tone="danger" accessibilityRole="alert">
              {state.error.message}
            </Text>
          ) : undefined
        }
        ListEmptyComponent={
          <EmptyState
            title="No deliveries assigned"
            message="Deliveries assigned to you will appear here. Pull down to refresh."
            action={{ label: 'Refresh', onPress: refetch }}
          />
        }
        renderItem={({ item }) => (
          <DeliveryCard
            delivery={item}
            isSelected={item.id === selectedDeliveryId}
            onPress={() => openDelivery(item.id)}
          />
        )}
      />
    </Screen>
  );
}

export function AssignedDeliveriesScreen() {
  const { driverProfile, reloadDriverProfile, signOut } = useAuth();

  if (driverProfile.status === 'loading') {
    return (
      <Screen>
        <LoadingState label="Loading your profile…" />
      </Screen>
    );
  }
  if (driverProfile.status === 'error') {
    return (
      <Screen>
        <ErrorState
          title="Profile unavailable"
          error={driverProfile.error}
          onRetry={reloadDriverProfile}
          secondaryAction={{ label: 'Sign out', onPress: () => void signOut() }}
        />
      </Screen>
    );
  }
  if (!driverProfile.driver.isActive) {
    return (
      <Screen>
        <EmptyState
          title="Account inactive"
          message="Your driver account is not active, so no deliveries are shown. Contact your dispatcher."
        />
      </Screen>
    );
  }
  return <AssignedDeliveriesList driverId={driverProfile.driver.id} />;
}

const styles = StyleSheet.create({
  grow: { flexGrow: 1 },
});
