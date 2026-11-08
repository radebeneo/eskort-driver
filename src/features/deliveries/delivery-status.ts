import type { TextTone } from '@/components/ui/text';
import type { DeliveryStatus } from '@/types/delivery';

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  assigned: 'Assigned',
  picked_up: 'Picked up',
  en_route: 'On the way',
  delivered: 'Delivered',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

export const DELIVERY_STATUS_TONES: Record<DeliveryStatus, TextTone> = {
  assigned: 'primary',
  picked_up: 'warning',
  en_route: 'warning',
  delivered: 'success',
  failed: 'danger',
  cancelled: 'muted',
};
