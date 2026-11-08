import type { SupabaseClient } from '@supabase/supabase-js';

import { fromPostgrestError } from '@/services/supabase/postgrest-error';

import { DRIVER_COLUMNS, parseDriverRow } from './driver-mapper';
import type { DriverRepository } from './driver-repository';

export function createSupabaseDriverRepository(client: SupabaseClient): DriverRepository {
  return {
    async getByUserId(userId) {
      const { data, error } = await client
        .from('drivers')
        .select(DRIVER_COLUMNS)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) throw fromPostgrestError(error, 'load your driver profile');
      return data ? parseDriverRow(data) : null;
    },
  };
}
