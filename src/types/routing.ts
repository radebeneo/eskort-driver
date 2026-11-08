import type { GeoPoint } from './geo';

export type RouteRequest = {
  origin: GeoPoint;
  destination: GeoPoint;
  waypoints?: GeoPoint[];
};

export type RouteSummary = {
  distanceMeters: number;
  durationSeconds: number;
  /** Google encoded polyline, for drawing the route on a map later. */
  encodedPolyline: string | null;
};

export type DistanceMatrixRequest = {
  origins: GeoPoint[];
  destinations: GeoPoint[];
};

export type DistanceMatrixElement = {
  originIndex: number;
  destinationIndex: number;
  status: 'ok' | 'unavailable';
  distanceMeters: number | null;
  durationSeconds: number | null;
};

export type DistanceMatrix = {
  elements: DistanceMatrixElement[];
};

export type PlaceAutocompleteRequest = {
  input: string;
  /** Groups autocomplete and details calls into one billable Places session. */
  sessionToken: string;
  near?: GeoPoint;
};

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string | null;
};

export type PlaceDetailsRequest = {
  placeId: string;
  sessionToken: string;
};

export type PlaceDetails = {
  placeId: string;
  formattedAddress: string;
  location: GeoPoint;
};
