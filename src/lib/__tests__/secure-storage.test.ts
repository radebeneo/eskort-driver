import * as SecureStore from 'expo-secure-store';

import { chunkedSecureStorage, SECURE_STORE_CHUNK_SIZE } from '@/lib/secure-storage';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK: 0,
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      store.delete(key);
    }),
    __store: store,
  };
});

const backing = (SecureStore as unknown as { __store: Map<string, string> }).__store;
const KEY = 'sb-project-auth-token';

beforeEach(() => backing.clear());

describe('chunkedSecureStorage', () => {
  it('returns null for missing keys', async () => {
    await expect(chunkedSecureStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('round-trips values larger than a single SecureStore entry', async () => {
    const value = 'x'.repeat(SECURE_STORE_CHUNK_SIZE * 2 + 10);
    await chunkedSecureStorage.setItem(KEY, value);

    await expect(chunkedSecureStorage.getItem(KEY)).resolves.toBe(value);
    expect(backing.size).toBe(4); // 3 chunks + count
    for (const stored of backing.values()) {
      expect(stored.length).toBeLessThanOrEqual(SECURE_STORE_CHUNK_SIZE);
    }
  });

  it('removes stale chunks when a value shrinks', async () => {
    await chunkedSecureStorage.setItem(KEY, 'y'.repeat(SECURE_STORE_CHUNK_SIZE * 3));
    await chunkedSecureStorage.setItem(KEY, 'short');

    await expect(chunkedSecureStorage.getItem(KEY)).resolves.toBe('short');
    expect(backing.size).toBe(2);
  });

  it('removes every entry', async () => {
    await chunkedSecureStorage.setItem(KEY, 'z'.repeat(SECURE_STORE_CHUNK_SIZE + 1));
    await chunkedSecureStorage.removeItem(KEY);
    expect(backing.size).toBe(0);
  });

  it('treats a value with a missing chunk as absent', async () => {
    await chunkedSecureStorage.setItem(KEY, 'w'.repeat(SECURE_STORE_CHUNK_SIZE + 1));
    backing.delete(`${KEY}.1`);
    await expect(chunkedSecureStorage.getItem(KEY)).resolves.toBeNull();
  });

  it('only writes keys that SecureStore accepts', async () => {
    await chunkedSecureStorage.setItem('scope:user/token', 'value');
    for (const key of backing.keys()) {
      expect(key).toMatch(/^[A-Za-z0-9._-]+$/);
    }
    await expect(chunkedSecureStorage.getItem('scope:user/token')).resolves.toBe('value');
  });
});
