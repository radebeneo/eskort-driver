import type { DevicePosition } from '@/types/geo';

export type LocationPermission = {
  status: 'granted' | 'denied' | 'undetermined';
  /** False when the OS will not show the prompt again; send the driver to Settings instead. */
  canAskAgain: boolean;
};

export type PositionOptions = {
  highAccuracy: boolean;
};

export type WatchOptions = PositionOptions & {
  distanceIntervalMeters: number;
};

/** Foreground device location. Background tracking is not implemented yet. */
export interface LocationService {
  getPermission(): Promise<LocationPermission>;
  requestPermission(): Promise<LocationPermission>;
  getCurrentPosition(options: PositionOptions): Promise<DevicePosition>;
  /** Resolves to an unsubscribe function. */
  watchPosition(
    options: WatchOptions,
    onPosition: (position: DevicePosition) => void,
  ): Promise<() => void>;
}
