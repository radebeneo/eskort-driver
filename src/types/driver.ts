export type DriverProfile = {
  id: string;
  /** Supabase auth user id (`auth.users.id`). */
  userId: string;
  fullName: string;
  phone: string | null;
  vehicleRegistration: string | null;
  isActive: boolean;
};
