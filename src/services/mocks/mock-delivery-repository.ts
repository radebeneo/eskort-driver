/**
 * ⚠️ MOCK DELIVERIES. In-memory copy of `MOCK_DELIVERY_RECORDS`.
 * Status updates last until the app reloads. Development use only.
 */
import { AppError } from '@/lib/errors';
import type { DeliveryRepository } from '@/services/deliveries/delivery-repository';
import { ACTIVE_DELIVERY_STATUSES, type Delivery } from '@/types/delivery';

import { MOCK_DELIVERY_RECORDS } from './mock-data';
import { simulateLatency } from './mock-utils';

const clone = (delivery: Delivery): Delivery => ({
  ...delivery,
  address: {
    ...delivery.address,
    location: delivery.address.location ? { ...delivery.address.location } : null,
  },
  items: delivery.items.map((item) => ({ ...item })),
});

export function createMockDeliveryRepository(): DeliveryRepository {
  const records = MOCK_DELIVERY_RECORDS.map((record) => ({
    driverId: record.driverId,
    delivery: clone(record.delivery),
  }));

  return {
    async listAssigned(driverId) {
      await simulateLatency();
      return records
        .filter(
          (record) =>
            record.driverId === driverId &&
            ACTIVE_DELIVERY_STATUSES.includes(record.delivery.status),
        )
        .map((record) => clone(record.delivery));
    },

    async getById(deliveryId) {
      await simulateLatency(200);
      const record = records.find((candidate) => candidate.delivery.id === deliveryId);
      return record ? clone(record.delivery) : null;
    },

    async updateStatus(deliveryId, status) {
      await simulateLatency(200);
      const record = records.find((candidate) => candidate.delivery.id === deliveryId);
      if (!record) throw new AppError('not_found', 'The requested record was not found.');
      record.delivery = { ...record.delivery, status, updatedAt: new Date().toISOString() };
      return clone(record.delivery);
    },
  };
}
