import type { GeoPoint } from './geo';

export const DELIVERY_STATUSES = [
  'assigned',
  'picked_up',
  'en_route',
  'delivered',
  'failed',
  'cancelled',
] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

/** Statuses shown in the assigned deliveries list. */
export const ACTIVE_DELIVERY_STATUSES: readonly DeliveryStatus[] = [
  'assigned',
  'picked_up',
  'en_route',
];

export function isDeliveryStatus(value: string): value is DeliveryStatus {
  return (DELIVERY_STATUSES as readonly string[]).includes(value);
}

export type DeliveryAddress = {
  line1: string;
  line2: string | null;
  suburb: string | null;
  city: string;
  postalCode: string | null;
  /** Null when the order has not been geocoded. */
  location: GeoPoint | null;
};

export type DeliveryItem = {
  id: string;
  name: string;
  quantity: number;
};

export type Delivery = {
  id: string;
  orderNumber: string;
  status: DeliveryStatus;
  customerName: string;
  customerPhone: string | null;
  address: DeliveryAddress;
  /** ISO 8601 timestamp. */
  scheduledFor: string | null;
  notes: string | null;
  items: DeliveryItem[];
  /** ISO 8601 timestamp. */
  updatedAt: string;
};
