export type GeoPoint = {
  latitude: number;
  longitude: number;
};

export type DevicePosition = GeoPoint & {
  /** Horizontal accuracy radius in metres, when the platform reports it. */
  accuracyMeters: number | null;
  /** Unix timestamp in milliseconds. */
  timestamp: number;
};
