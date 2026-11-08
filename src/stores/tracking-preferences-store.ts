import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Device-level location tracking preferences, persisted with AsyncStorage
 * (not sensitive). These are not auth state; keep auth in AuthProvider.
 */
export type TrackingPreferences = {
  /** Used for current-position lookups (route estimates). */
  highAccuracy: boolean;
  /** Minimum movement between updates, for `LocationService.watchPosition` (live tracking). */
  distanceIntervalMeters: number;
};

export const DEFAULT_TRACKING_PREFERENCES: TrackingPreferences = {
  highAccuracy: true,
  distanceIntervalMeters: 25,
};

export const MIN_DISTANCE_INTERVAL_METERS = 5;
export const MAX_DISTANCE_INTERVAL_METERS = 500;

type TrackingPreferencesState = TrackingPreferences & {
  setHighAccuracy: (enabled: boolean) => void;
  setDistanceIntervalMeters: (meters: number) => void;
  resetPreferences: () => void;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const useTrackingPreferencesStore = create<TrackingPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_TRACKING_PREFERENCES,
      setHighAccuracy: (enabled) => set({ highAccuracy: enabled }),
      setDistanceIntervalMeters: (meters) => {
        if (!Number.isFinite(meters)) return;
        set({
          distanceIntervalMeters: clamp(
            Math.round(meters),
            MIN_DISTANCE_INTERVAL_METERS,
            MAX_DISTANCE_INTERVAL_METERS,
          ),
        });
      },
      resetPreferences: () => set(DEFAULT_TRACKING_PREFERENCES),
    }),
    {
      name: 'eskort-driver.tracking-preferences',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ highAccuracy, distanceIntervalMeters }) => ({
        highAccuracy,
        distanceIntervalMeters,
      }),
    },
  ),
);
