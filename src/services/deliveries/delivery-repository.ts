import type { Delivery, DeliveryStatus } from '@/types/delivery';

/**
 * Supabase is the source of truth for deliveries. Implementations must not
 * cache beyond a single call; screens reload through the repository.
 */
export interface DeliveryRepository {
  /** Active deliveries assigned to the driver, soonest first. */
  listAssigned(driverId: string): Promise<Delivery[]>;
  /** Resolves null when the delivery does not exist or is not visible to the driver. */
  getById(deliveryId: string): Promise<Delivery | null>;
  updateStatus(deliveryId: string, status: DeliveryStatus): Promise<Delivery>;
}
