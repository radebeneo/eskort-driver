import type { SupabaseClient } from '@supabase/supabase-js';

import { fromPostgrestError } from '@/services/supabase/postgrest-error';
import { ACTIVE_DELIVERY_STATUSES } from '@/types/delivery';

import { DELIVERY_COLUMNS, parseDeliveryRow } from './delivery-mapper';
import type { DeliveryRepository } from './delivery-repository';

const TABLE = 'deliveries';

/**
 * Supabase-backed deliveries. Row Level Security must restrict drivers to
 * their own deliveries. The `driver_id` filter is for clarity, not access control.
 */
export function createSupabaseDeliveryRepository(client: SupabaseClient): DeliveryRepository {
  return {
    async listAssigned(driverId) {
      const { data, error } = await client
        .from(TABLE)
        .select(DELIVERY_COLUMNS)
        .eq('driver_id', driverId)
        .in('status', [...ACTIVE_DELIVERY_STATUSES])
        .order('scheduled_for', { ascending: true, nullsFirst: false });
      if (error) throw fromPostgrestError(error, 'load your deliveries');
      return (data ?? []).map(parseDeliveryRow);
    },

    async getById(deliveryId) {
      const { data, error } = await client
        .from(TABLE)
        .select(DELIVERY_COLUMNS)
        .eq('id', deliveryId)
        .maybeSingle();
      if (error) throw fromPostgrestError(error, 'load this delivery');
      return data ? parseDeliveryRow(data) : null;
    },

    async updateStatus(deliveryId, status) {
      const { data, error } = await client
        .from(TABLE)
        .update({ status })
        .eq('id', deliveryId)
        .select(DELIVERY_COLUMNS)
        .single();
      if (error) throw fromPostgrestError(error, 'update this delivery');
      return parseDeliveryRow(data);
    },
  };
}
