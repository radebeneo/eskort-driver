import type { DriverProfile } from '@/types/driver';

export interface DriverRepository {
  /** Resolves null when the auth user has no driver profile. */
  getByUserId(userId: string): Promise<DriverProfile | null>;
}
