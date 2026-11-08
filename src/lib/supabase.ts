import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import type { SupabaseConfig } from '@/config/env';
import { chunkedSecureStorage } from '@/lib/secure-storage';

/**
 * Creates the Supabase client. Only services in `src/services` should use it;
 * screens and hooks go through the typed services instead.
 *
 * The client is untyped on purpose. Rows are validated at runtime by the
 * repository mappers. Once the schema is final, generate types with
 * `supabase gen types typescript` and pass them as a generic here.
 */
export function createSupabaseClient(config: SupabaseConfig): SupabaseClient {
  return createClient(config.url, config.publishableKey, {
    auth: {
      // SecureStore is unavailable on web, so web uses localStorage via AsyncStorage.
      storage: Platform.OS === 'web' ? AsyncStorage : chunkedSecureStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
}
