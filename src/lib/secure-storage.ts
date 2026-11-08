import * as SecureStore from 'expo-secure-store';

/**
 * Keychain/Keystore-backed storage for the Supabase session.
 *
 * SecureStore values should stay under ~2 KB, but a Supabase session (access
 * token, refresh token and user object) can be larger, so values are split
 * into chunks plus a count entry.
 */

export const SECURE_STORE_CHUNK_SIZE = 1024;

// AFTER_FIRST_UNLOCK lets token refresh run while a driver's phone is locked.
const WRITE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
};

// SecureStore keys may only contain alphanumerics, ".", "-" and "_".
const sanitizeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');
const countKey = (key: string) => `${sanitizeKey(key)}.chunks`;
const chunkKey = (key: string, index: number) => `${sanitizeKey(key)}.${index}`;

async function readChunkCount(key: string): Promise<number> {
  const raw = await SecureStore.getItemAsync(countKey(key));
  const count = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(count) && count > 0 ? count : 0;
}

async function getItem(key: string): Promise<string | null> {
  const count = await readChunkCount(key);
  if (count === 0) return null;
  const parts: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const part = await SecureStore.getItemAsync(chunkKey(key, index));
    // A missing chunk means the value is corrupt; treat it as absent.
    if (part === null) return null;
    parts.push(part);
  }
  return parts.join('');
}

async function removeItem(key: string): Promise<void> {
  const count = await readChunkCount(key);
  const deletions: Promise<void>[] = [];
  for (let index = 0; index < count; index += 1) {
    deletions.push(SecureStore.deleteItemAsync(chunkKey(key, index)));
  }
  await Promise.all(deletions);
  await SecureStore.deleteItemAsync(countKey(key));
}

async function setItem(key: string, value: string): Promise<void> {
  await removeItem(key);
  const chunks: string[] = [];
  for (let start = 0; start < value.length; start += SECURE_STORE_CHUNK_SIZE) {
    chunks.push(value.slice(start, start + SECURE_STORE_CHUNK_SIZE));
  }
  await Promise.all(
    chunks.map((chunk, index) =>
      SecureStore.setItemAsync(chunkKey(key, index), chunk, WRITE_OPTIONS),
    ),
  );
  // Written last, so a partially written value is never read back.
  await SecureStore.setItemAsync(countKey(key), String(chunks.length), WRITE_OPTIONS);
}

export const chunkedSecureStorage = { getItem, setItem, removeItem };
