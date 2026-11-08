/**
 * ⚠️ MOCK DATA. Fictional records for local development and UI work only.
 * These are not real Eskort customers, addresses, orders or products.
 * They are only loaded when EXPO_PUBLIC_USE_MOCKS=true.
 */
import type { Delivery } from '@/types/delivery';
import type { DriverProfile } from '@/types/driver';
import type { PlaceDetails } from '@/types/routing';

export const MOCK_USER_ID = 'mock-user-0001';

export const MOCK_DRIVER: DriverProfile = {
  id: 'mock-driver-0001',
  userId: MOCK_USER_ID,
  fullName: 'Mock Driver',
  phone: '+27 00 000 0000',
  vehicleRegistration: 'MOCK 001 GP',
  isActive: true,
};

type MockDeliveryRecord = { driverId: string; delivery: Delivery };

export const MOCK_DELIVERY_RECORDS: readonly MockDeliveryRecord[] = [
  {
    driverId: MOCK_DRIVER.id,
    delivery: {
      id: 'mock-delivery-0001',
      orderNumber: 'MOCK-1001',
      status: 'assigned',
      customerName: 'Mock Customer A',
      customerPhone: '+27 00 000 0001',
      address: {
        line1: '1 Mock Street',
        line2: 'Unit 4',
        suburb: 'Sandton',
        city: 'Johannesburg',
        postalCode: '0000',
        location: { latitude: -26.1076, longitude: 28.0567 },
      },
      scheduledFor: '2026-11-07T09:30:00+02:00',
      notes: 'Mock note: ring the bell at the gate.',
      items: [
        { id: 'mock-item-1', name: 'Mock item (frozen)', quantity: 2 },
        { id: 'mock-item-2', name: 'Mock item (chilled)', quantity: 1 },
      ],
      updatedAt: '2026-11-07T07:00:00+02:00',
    },
  },
  {
    driverId: MOCK_DRIVER.id,
    delivery: {
      id: 'mock-delivery-0002',
      orderNumber: 'MOCK-1002',
      status: 'en_route',
      customerName: 'Mock Customer B',
      customerPhone: null,
      address: {
        line1: '22 Example Avenue',
        line2: null,
        suburb: 'Rosebank',
        city: 'Johannesburg',
        postalCode: '0000',
        location: { latitude: -26.1452, longitude: 28.0436 },
      },
      scheduledFor: '2026-11-07T11:00:00+02:00',
      notes: null,
      items: [{ id: 'mock-item-3', name: 'Mock item (ambient)', quantity: 3 }],
      updatedAt: '2026-11-07T07:05:00+02:00',
    },
  },
  {
    driverId: MOCK_DRIVER.id,
    delivery: {
      id: 'mock-delivery-0003',
      orderNumber: 'MOCK-1003',
      status: 'assigned',
      customerName: 'Mock Customer C',
      customerPhone: '+27 00 000 0003',
      address: {
        line1: '7 Placeholder Road',
        line2: null,
        suburb: 'Randburg',
        city: 'Johannesburg',
        postalCode: null,
        // No coordinates, to exercise the "not geocoded" UI path.
        location: null,
      },
      scheduledFor: null,
      notes: 'Mock note: address not geocoded.',
      items: [],
      updatedAt: '2026-11-07T07:10:00+02:00',
    },
  },
];

export const MOCK_PLACES: readonly PlaceDetails[] = [
  {
    placeId: 'mock-place-sandton',
    formattedAddress: '1 Mock Street, Sandton, Johannesburg (mock)',
    location: { latitude: -26.1076, longitude: 28.0567 },
  },
  {
    placeId: 'mock-place-rosebank',
    formattedAddress: '22 Example Avenue, Rosebank, Johannesburg (mock)',
    location: { latitude: -26.1452, longitude: 28.0436 },
  },
];
