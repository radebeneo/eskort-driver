import AsyncStorage from '@react-native-async-storage/async-storage';

import { useDeliverySelectionStore } from '@/stores/delivery-selection-store';
import {
  DEFAULT_TRACKING_PREFERENCES,
  MAX_DISTANCE_INTERVAL_METERS,
  MIN_DISTANCE_INTERVAL_METERS,
  useTrackingPreferencesStore,
} from '@/stores/tracking-preferences-store';

describe('useDeliverySelectionStore', () => {
  beforeEach(() => useDeliverySelectionStore.getState().clearSelection());

  it('selects and clears a delivery id', () => {
    useDeliverySelectionStore.getState().selectDelivery('delivery-1');
    expect(useDeliverySelectionStore.getState().selectedDeliveryId).toBe('delivery-1');

    useDeliverySelectionStore.getState().clearSelection();
    expect(useDeliverySelectionStore.getState().selectedDeliveryId).toBeNull();
  });
});

describe('useTrackingPreferencesStore', () => {
  beforeEach(async () => {
    // Isolate storage and finish hydration so it cannot overwrite setter results mid-test.
    await AsyncStorage.clear();
    await useTrackingPreferencesStore.persist.rehydrate();
    useTrackingPreferencesStore.getState().resetPreferences();
  });

  const preferences = () => {
    const { highAccuracy, distanceIntervalMeters } = useTrackingPreferencesStore.getState();
    return { highAccuracy, distanceIntervalMeters };
  };

  it('starts with the defaults', () => {
    expect(preferences()).toEqual(DEFAULT_TRACKING_PREFERENCES);
  });

  it('updates high accuracy', () => {
    useTrackingPreferencesStore.getState().setHighAccuracy(false);
    expect(preferences().highAccuracy).toBe(false);
  });

  it('rounds and clamps the distance interval', () => {
    const { setDistanceIntervalMeters } = useTrackingPreferencesStore.getState();

    setDistanceIntervalMeters(42.6);
    expect(preferences().distanceIntervalMeters).toBe(43);

    setDistanceIntervalMeters(1);
    expect(preferences().distanceIntervalMeters).toBe(MIN_DISTANCE_INTERVAL_METERS);

    setDistanceIntervalMeters(10_000);
    expect(preferences().distanceIntervalMeters).toBe(MAX_DISTANCE_INTERVAL_METERS);

    setDistanceIntervalMeters(Number.NaN);
    expect(preferences().distanceIntervalMeters).toBe(MAX_DISTANCE_INTERVAL_METERS);
  });

  it('resets to the defaults', () => {
    useTrackingPreferencesStore.getState().setHighAccuracy(false);
    useTrackingPreferencesStore.getState().resetPreferences();
    expect(preferences()).toEqual(DEFAULT_TRACKING_PREFERENCES);
  });
});
