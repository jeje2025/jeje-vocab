import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// ✅ Create a single Supabase client instance (singleton pattern)
const supabaseUrl = `https://${projectId}.supabase.co`;

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: {
          getItem: (key) => {
            if (typeof window === 'undefined') return null;
            return localStorage.getItem(key);
          },
          setItem: (key, value) => {
            if (typeof window === 'undefined') return;
            localStorage.setItem(key, value);
          },
          removeItem: (key) => {
            if (typeof window === 'undefined') return;
            localStorage.removeItem(key);
          },
        },
      },
    });
    console.log('✅ Supabase client initialized');
  }
  return supabaseInstance;
}
