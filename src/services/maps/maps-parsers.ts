import {
  expectRecord,
  readArray,
  readNullableNumber,
  readNullableString,
  readNumber,
  readString,
} from '@/lib/validation';
import type {
  DistanceMatrix,
  DistanceMatrixElement,
  PlaceDetails,
  PlaceSuggestion,
  RouteSummary,
} from '@/types/routing';

export function parseRouteSummary(value: unknown): RouteSummary {
  const record = expectRecord(value, 'route');
  return {
    distanceMeters: readNumber(record, 'distanceMeters', 'route'),
    durationSeconds: readNumber(record, 'durationSeconds', 'route'),
    encodedPolyline: readNullableString(record, 'encodedPolyline', 'route'),
  };
}

function parseMatrixElement(value: unknown): DistanceMatrixElement {
  const context = 'distance matrix';
  const record = expectRecord(value, context);
  return {
    originIndex: readNumber(record, 'originIndex', context),
    destinationIndex: readNumber(record, 'destinationIndex', context),
    status: record.status === 'ok' ? 'ok' : 'unavailable',
    distanceMeters: readNullableNumber(record, 'distanceMeters', context),
    durationSeconds: readNullableNumber(record, 'durationSeconds', context),
  };
}

export function parseDistanceMatrix(value: unknown): DistanceMatrix {
  const record = expectRecord(value, 'distance matrix');
  return { elements: readArray(record, 'elements', 'distance matrix').map(parseMatrixElement) };
}

function parseSuggestion(value: unknown): PlaceSuggestion {
  const context = 'place suggestion';
  const record = expectRecord(value, context);
  return {
    placeId: readString(record, 'placeId', context),
    primaryText: readString(record, 'primaryText', context),
    secondaryText: readNullableString(record, 'secondaryText', context),
  };
}

export function parsePlaceSuggestions(value: unknown): PlaceSuggestion[] {
  const record = expectRecord(value, 'place suggestions');
  return readArray(record, 'suggestions', 'place suggestions').map(parseSuggestion);
}

export function parsePlaceDetails(value: unknown): PlaceDetails {
  const context = 'place details';
  const record = expectRecord(value, context);
  const location = expectRecord(record.location, context);
  return {
    placeId: readString(record, 'placeId', context),
    formattedAddress: readString(record, 'formattedAddress', context),
    location: {
      latitude: readNumber(location, 'latitude', context),
      longitude: readNumber(location, 'longitude', context),
    },
  };
}
