import { isValidGeoPoint } from '@/lib/geo';
import {
  expectRecord,
  invalidData,
  readId,
  readNullableNumber,
  readNullableString,
  readNumber,
  readString,
} from '@/lib/validation';
import { isDeliveryStatus, type Delivery, type DeliveryItem } from '@/types/delivery';
import type { GeoPoint } from '@/types/geo';

/**
 * Columns selected from the assumed `deliveries` table and its
 * `delivery_items` relation. Keep this in sync with `parseDeliveryRow`.
 * The schema is a placeholder until the real Eskort schema is confirmed.
 */
export const DELIVERY_COLUMNS = [
  'id',
  'order_number',
  'status',
  'customer_name',
  'customer_phone',
  'address_line1',
  'address_line2',
  'suburb',
  'city',
  'postal_code',
  'latitude',
  'longitude',
  'scheduled_for',
  'notes',
  'updated_at',
  'delivery_items(id, name, quantity)',
].join(', ');

const DELIVERY = 'delivery';
const ITEM = 'delivery item';

function parseDeliveryItem(value: unknown): DeliveryItem {
  const row = expectRecord(value, ITEM);
  return {
    id: readId(row, 'id', ITEM),
    name: readString(row, 'name', ITEM),
    quantity: readNumber(row, 'quantity', ITEM),
  };
}

export function parseDeliveryRow(value: unknown): Delivery {
  const row = expectRecord(value, DELIVERY);

  const status = readString(row, 'status', DELIVERY);
  if (!isDeliveryStatus(status)) throw invalidData(DELIVERY, 'status');

  const latitude = readNullableNumber(row, 'latitude', DELIVERY);
  const longitude = readNullableNumber(row, 'longitude', DELIVERY);
  let location: GeoPoint | null = null;
  if (latitude !== null && longitude !== null && isValidGeoPoint({ latitude, longitude })) {
    location = { latitude, longitude };
  }

  const itemsValue = row.delivery_items;
  const items = Array.isArray(itemsValue) ? itemsValue.map(parseDeliveryItem) : [];

  return {
    id: readId(row, 'id', DELIVERY),
    orderNumber: readId(row, 'order_number', DELIVERY),
    status,
    customerName: readString(row, 'customer_name', DELIVERY),
    customerPhone: readNullableString(row, 'customer_phone', DELIVERY),
    address: {
      line1: readString(row, 'address_line1', DELIVERY),
      line2: readNullableString(row, 'address_line2', DELIVERY),
      suburb: readNullableString(row, 'suburb', DELIVERY),
      city: readString(row, 'city', DELIVERY),
      postalCode: readNullableString(row, 'postal_code', DELIVERY),
      location,
    },
    scheduledFor: readNullableString(row, 'scheduled_for', DELIVERY),
    notes: readNullableString(row, 'notes', DELIVERY),
    items,
    updatedAt: readString(row, 'updated_at', DELIVERY),
  };
}
