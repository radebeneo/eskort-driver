import { useCallback } from 'react';

import { useAsyncResource } from '@/lib/use-async-resource';
import { useServices } from '@/providers/services-provider';

/** Active deliveries assigned to the driver, loaded from the delivery repository. */
export function useAssignedDeliveries(driverId: string) {
  const { deliveries } = useServices();
  const load = useCallback(() => deliveries.listAssigned(driverId), [deliveries, driverId]);
  return useAsyncResource(load);
}

/** One delivery. Resolves to null when it does not exist or is not visible to the driver. */
export function useDelivery(deliveryId: string) {
  const { deliveries } = useServices();
  const load = useCallback(() => deliveries.getById(deliveryId), [deliveries, deliveryId]);
  return useAsyncResource(load);
}
