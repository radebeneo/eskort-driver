import {
  expectRecord,
  readBoolean,
  readId,
  readNullableString,
  readString,
} from '@/lib/validation';
import type { DriverProfile } from '@/types/driver';

/** Columns selected from the assumed `drivers` table (placeholder schema). */
export const DRIVER_COLUMNS = 'id, user_id, full_name, phone, vehicle_registration, is_active';

const DRIVER = 'driver profile';

export function parseDriverRow(value: unknown): DriverProfile {
  const row = expectRecord(value, DRIVER);
  return {
    id: readId(row, 'id', DRIVER),
    userId: readString(row, 'user_id', DRIVER),
    fullName: readString(row, 'full_name', DRIVER),
    phone: readNullableString(row, 'phone', DRIVER),
    vehicleRegistration: readNullableString(row, 'vehicle_registration', DRIVER),
    isActive: readBoolean(row, 'is_active', DRIVER),
  };
}
