import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_TRACKING_PREFERENCES,
  MAX_DISTANCE_INTERVAL_METERS,
  MIN_DISTANCE_INTERVAL_METERS,
  useTrackingPreferencesStore,
} from '@/stores/tracking-preferences-store';

const STORAGE_KEY = 'eskort-driver.tracking-preferences';
const STORAGE_VERSION = 1;

const store = useTrackingPreferencesStore;

function preferences() {
  const { highAccuracy, distanceIntervalMeters } = store.getState();
  return { highAccuracy, distanceIntervalMeters };
}

/** Stores a raw string, exactly as AsyncStorage would return it, then rehydrates. */
async function hydrateFromRaw(raw: string) {
  await AsyncStorage.setItem(STORAGE_KEY, raw);
  await store.persist.rehydrate();
}

/** Stores a state envelope in the store's own format, then rehydrates. */
async function hydrateFromState(state: unknown) {
  await hydrateFromRaw(JSON.stringify({ state, version: STORAGE_VERSION }));
}

/** Moves the in-memory preferences away from the defaults so fallbacks are observable. */
function moveAwayFromDefaults() {
  store.getState().setHighAccuracy(false);
  store.getState().setDistanceIntervalMeters(300);
  expect(preferences()).toEqual({ highAccuracy: false, distanceIntervalMeters: 300 });
}

describe('useTrackingPreferencesStore hydration', () => {
  beforeEach(async () => {
    // Isolate storage and supersede any pending hydration from earlier tests.
    await AsyncStorage.clear();
    await store.persist.rehydrate();
  });

  afterAll(async () => {
    await AsyncStorage.clear();
  });

  it('keeps the existing persistence key and version', () => {
    expect(store.persist.getOptions().name).toBe(STORAGE_KEY);
    expect(store.persist.getOptions().version).toBe(STORAGE_VERSION);
  });

  it('restores valid persisted preferences', async () => {
    await hydrateFromState({ highAccuracy: false, distanceIntervalMeters: 120 });

    expect(store.persist.hasHydrated()).toBe(true);
    expect(preferences()).toEqual({ highAccuracy: false, distanceIntervalMeters: 120 });
  });

  it('round-trips preferences written by the setters', async () => {
    store.getState().setHighAccuracy(false);
    store.getState().setDistanceIntervalMeters(75);

    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === null) throw new Error('Expected the setters to persist preferences.');
    expect(JSON.parse(saved)).toEqual({
      state: { highAccuracy: false, distanceIntervalMeters: 75 },
      version: STORAGE_VERSION,
    });

    store.getState().resetPreferences();
    expect(preferences()).toEqual(DEFAULT_TRACKING_PREFERENCES);

    await hydrateFromRaw(saved);
    expect(preferences()).toEqual({ highAccuracy: false, distanceIntervalMeters: 75 });
  });

  it.each<[string, unknown]>([
    ['a string', 'false'],
    ['a number', 0],
    ['null', null],
    ['an object', {}],
    ['an array', [false]],
  ])('falls back to the default when highAccuracy is %s', async (_label, value) => {
    moveAwayFromDefaults();

    await hydrateFromState({ highAccuracy: value, distanceIntervalMeters: 120 });

    expect(preferences()).toEqual({
      highAccuracy: DEFAULT_TRACKING_PREFERENCES.highAccuracy,
      distanceIntervalMeters: 120,
    });
  });

  it.each<[string, unknown]>([
    ['a numeric string', '120'],
    ['null', null],
    ['a boolean', true],
    ['an object', {}],
    ['an array', [120]],
  ])('falls back to the default when distanceIntervalMeters is %s', async (_label, value) => {
    moveAwayFromDefaults();

    await hydrateFromState({ highAccuracy: false, distanceIntervalMeters: value });

    expect(preferences()).toEqual({
      highAccuracy: false,
      distanceIntervalMeters: DEFAULT_TRACKING_PREFERENCES.distanceIntervalMeters,
    });
  });

  it.each([
    ['Infinity', '1e999'],
    ['-Infinity', '-1e999'],
  ])('falls back to the default when distanceIntervalMeters is %s', async (_label, literal) => {
    moveAwayFromDefaults();

    // JSON.parse turns out-of-range literals into non-finite numbers.
    await hydrateFromRaw(
      `{"state":{"highAccuracy":false,"distanceIntervalMeters":${literal}},"version":${STORAGE_VERSION}}`,
    );

    expect(preferences()).toEqual({
      highAccuracy: false,
      distanceIntervalMeters: DEFAULT_TRACKING_PREFERENCES.distanceIntervalMeters,
    });
  });

  it.each([
    [2.4, MIN_DISTANCE_INTERVAL_METERS],
    [-30, MIN_DISTANCE_INTERVAL_METERS],
    [42.6, 43],
    [499.5, MAX_DISTANCE_INTERVAL_METERS],
    [10_000, MAX_DISTANCE_INTERVAL_METERS],
    [MIN_DISTANCE_INTERVAL_METERS, MIN_DISTANCE_INTERVAL_METERS],
    [MAX_DISTANCE_INTERVAL_METERS, MAX_DISTANCE_INTERVAL_METERS],
  ])('rounds and clamps a persisted interval of %p to %p', async (stored, expected) => {
    await hydrateFromState({ highAccuracy: false, distanceIntervalMeters: stored });

    expect(preferences()).toEqual({ highAccuracy: false, distanceIntervalMeters: expected });
  });

  it.each<[string, unknown, { highAccuracy: boolean; distanceIntervalMeters: number }]>([
    ['both fields', {}, DEFAULT_TRACKING_PREFERENCES],
    [
      'distanceIntervalMeters',
      { highAccuracy: false },
      {
        highAccuracy: false,
        distanceIntervalMeters: DEFAULT_TRACKING_PREFERENCES.distanceIntervalMeters,
      },
    ],
    [
      'highAccuracy',
      { distanceIntervalMeters: 80 },
      { highAccuracy: DEFAULT_TRACKING_PREFERENCES.highAccuracy, distanceIntervalMeters: 80 },
    ],
  ])('fills missing %s with defaults', async (_label, state, expected) => {
    moveAwayFromDefaults();

    await hydrateFromState(state);

    expect(preferences()).toEqual(expected);
  });

  it.each<[string, unknown]>([
    ['null', null],
    ['an empty array', []],
    ['an array of preferences', [{ highAccuracy: false, distanceIntervalMeters: 300 }]],
    ['a string', 'preferences'],
    ['a number', 42],
    ['a boolean', true],
  ])('uses the defaults when the persisted state is %s', async (_label, state) => {
    moveAwayFromDefaults();

    await hydrateFromState(state);

    expect(preferences()).toEqual(DEFAULT_TRACKING_PREFERENCES);
  });

  it.each([
    ['null', 'null'],
    ['an array', '[]'],
    ['a string', '"preferences"'],
    ['a number', '42'],
    ['an object without state', `{"version":${STORAGE_VERSION}}`],
  ])('uses the defaults when the stored value is %s', async (_label, raw) => {
    moveAwayFromDefaults();

    await hydrateFromRaw(raw);

    expect(preferences()).toEqual(DEFAULT_TRACKING_PREFERENCES);
  });

  it('does not let persisted action or unexpected fields replace the store', async () => {
    await hydrateFromState({
      highAccuracy: false,
      distanceIntervalMeters: 100,
      setHighAccuracy: 'replaced',
      setDistanceIntervalMeters: null,
      resetPreferences: {},
      unexpected: 'value',
    });

    const state = store.getState();
    expect(Object.keys(state).sort()).toEqual(
      [
        'distanceIntervalMeters',
        'highAccuracy',
        'resetPreferences',
        'setDistanceIntervalMeters',
        'setHighAccuracy',
      ].sort(),
    );
    expect(typeof state.setHighAccuracy).toBe('function');
    expect(typeof state.setDistanceIntervalMeters).toBe('function');
    expect(typeof state.resetPreferences).toBe('function');
    expect(preferences()).toEqual({ highAccuracy: false, distanceIntervalMeters: 100 });

    // The real actions still work and persist only the known fields.
    state.setHighAccuracy(true);
    state.setDistanceIntervalMeters(42.6);
    expect(preferences()).toEqual({ highAccuracy: true, distanceIntervalMeters: 43 });

    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    expect(saved === null ? null : JSON.parse(saved)).toEqual({
      state: { highAccuracy: true, distanceIntervalMeters: 43 },
      version: STORAGE_VERSION,
    });

    state.resetPreferences();
    expect(preferences()).toEqual(DEFAULT_TRACKING_PREFERENCES);
  });
});
