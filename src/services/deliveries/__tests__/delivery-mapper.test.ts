import { isAppError } from '@/lib/errors';
import { parseDeliveryRow } from '@/services/deliveries/delivery-mapper';

const ROW = {
  id: 'b7d1c1c2-0000-4000-8000-000000000001',
  order_number: 10042,
  status: 'assigned',
  customer_name: 'Test Customer',
  customer_phone: '',
  address_line1: '1 Example Street',
  address_line2: null,
  suburb: 'Example Suburb',
  city: 'Johannesburg',
  postal_code: '2000',
  latitude: '-26.2041',
  longitude: 28.0473,
  scheduled_for: '2026-11-07T10:00:00Z',
  notes: null,
  updated_at: '2026-11-07T08:00:00Z',
  delivery_items: [{ id: 1, name: 'Example item', quantity: 2 }],
};

function captureError(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error('Expected function to throw');
}

describe('parseDeliveryRow', () => {
  it('maps a database row to a Delivery', () => {
    expect(parseDeliveryRow(ROW)).toEqual({
      id: ROW.id,
      orderNumber: '10042',
      status: 'assigned',
      customerName: 'Test Customer',
      customerPhone: null,
      address: {
        line1: '1 Example Street',
        line2: null,
        suburb: 'Example Suburb',
        city: 'Johannesburg',
        postalCode: '2000',
        location: { latitude: -26.2041, longitude: 28.0473 },
      },
      scheduledFor: '2026-11-07T10:00:00Z',
      notes: null,
      items: [{ id: '1', name: 'Example item', quantity: 2 }],
      updatedAt: '2026-11-07T08:00:00Z',
    });
  });

  it('drops incomplete or out-of-range coordinates', () => {
    expect(parseDeliveryRow({ ...ROW, latitude: null }).address.location).toBeNull();
    expect(parseDeliveryRow({ ...ROW, latitude: 123 }).address.location).toBeNull();
  });

  it('defaults to no items when the relation is absent', () => {
    const { delivery_items: _ignored, ...withoutItems } = ROW;
    expect(parseDeliveryRow(withoutItems).items).toEqual([]);
  });

  it.each([
    ['an unknown status', { ...ROW, status: 'teleported' }],
    ['a missing customer name', { ...ROW, customer_name: null }],
    ['a non-numeric coordinate', { ...ROW, longitude: 'east' }],
    ['a non-object row', 'not a row'],
  ])('rejects %s with a validation error', (_label, row) => {
    const error = captureError(() => parseDeliveryRow(row));
    expect(isAppError(error) && error.code).toBe('validation');
  });
});
