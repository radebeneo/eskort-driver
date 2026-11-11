import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isRecord, type UnknownRecord } from '@/lib/validation';

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

/** Rounds a finite interval and clamps it to the supported range. */
const normalizeDistanceInterval = (meters: number) =>
  clamp(Math.round(meters), MIN_DISTANCE_INTERVAL_METERS, MAX_DISTANCE_INTERVAL_METERS);

/**
 * Persisted state is untrusted input (older app versions, corruption, manual edits).
 * Only the known preference fields are read; a missing or invalid field falls back to its
 * default. Any other stored key, including action names, is ignored.
 */
function sanitizePersistedPreferences(persisted: unknown): TrackingPreferences {
  const record: UnknownRecord = isRecord(persisted) ? persisted : {};
  const { highAccuracy, distanceIntervalMeters } = record;
  const defaults = DEFAULT_TRACKING_PREFERENCES;

  return {
    highAccuracy: typeof highAccuracy === 'boolean' ? highAccuracy : defaults.highAccuracy,
    distanceIntervalMeters:
      typeof distanceIntervalMeters === 'number' && Number.isFinite(distanceIntervalMeters)
        ? normalizeDistanceInterval(distanceIntervalMeters)
        : defaults.distanceIntervalMeters,
  };
}

export const useTrackingPreferencesStore = create<TrackingPreferencesState>()(
  persist(
    (set) => ({
      ...DEFAULT_TRACKING_PREFERENCES,
      setHighAccuracy: (enabled) => set({ highAccuracy: enabled }),
      setDistanceIntervalMeters: (meters) => {
        if (!Number.isFinite(meters)) return;
        set({ distanceIntervalMeters: normalizeDistanceInterval(meters) });
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
      // Zustand's default merge spreads every stored key over the live state, which would let
      // stored data replace actions. Merge only sanitized preference fields instead. Zustand
      // passes `undefined` when nothing is stored or the stored version does not match.
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedPreferences(persistedState),
      }),
    },
  ),
);
