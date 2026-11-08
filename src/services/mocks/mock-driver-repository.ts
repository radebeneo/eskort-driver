/**
 * ⚠️ MOCK DRIVER PROFILE. Returns `MOCK_DRIVER` for the mock user. Development use only.
 */
import type { DriverRepository } from '@/services/drivers/driver-repository';

import { MOCK_DRIVER } from './mock-data';
import { simulateLatency } from './mock-utils';

export function createMockDriverRepository(): DriverRepository {
  return {
    async getByUserId(userId) {
      await simulateLatency(200);
      return userId === MOCK_DRIVER.userId ? { ...MOCK_DRIVER } : null;
    },
  };
}
