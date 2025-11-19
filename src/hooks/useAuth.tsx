import { useState, useEffect, useCallback } from 'react';
import { getSupabaseClient } from '../utils/supabase/client';

// ✅ Singleton Supabase client
const supabase = getSupabaseClient();

type AuthState = {
  isAuthenticated: boolean;
  currentUser: any;
  token: string | null;
  isInitializing: boolean;
};

type AuthListener = (state: AuthState) => void;

const defaultState: AuthState = {
  isAuthenticated: false,
  currentUser: null,
  token: null,
  isInitializing: true,
};

let authState: AuthState = { ...defaultState };
const listeners = new Set<AuthListener>();
let initializePromise: Promise<void> | null = null;
let lastLoggedToken: string | null = null;
let hasWarnedNoToken = false;

const env = typeof import.meta !== 'undefined' ? import.meta.env : undefined;
const DEBUG_AUTH = Boolean(env?.DEV) && env?.VITE_DEBUG_AUTH === 'true';

const logAuth = (message: string, data?: unknown) => {
  if (!DEBUG_AUTH) return;
  if (typeof data === 'undefined') {
    console.log(message);
  } else {
    console.log(message, data);
  }
};

const logTokenOnce = (token: string | null, prefixMessage: string) => {
  if (!DEBUG_AUTH || !token) {
    if (!token) {
      lastLoggedToken = null;
    }
    return;
  }

  if (lastLoggedToken === token) return;
  lastLoggedToken = token;
  console.log(`${prefixMessage} ${token.substring(0, 20)}...`);
};

const persistToken = (token: string | null) => {
  if (typeof window === 'undefined') return;

  if (token) {
    localStorage.setItem('supabase_access_token', token);
  } else {
    localStorage.removeItem('supabase_access_token');
  }
};

const updateAuthState = (partial: Partial<AuthState>) => {
  let shouldUpdate = false;
  for (const key of Object.keys(partial) as (keyof AuthState)[]) {
    if (authState[key] !== partial[key]) {
      shouldUpdate = true;
      break;
    }
  }

  if (!shouldUpdate) {
    return;
  }

  authState = { ...authState, ...partial };
  listeners.forEach((listener) => listener(authState));
};

const initializeAuthState = async () => {
  if (initializePromise) return initializePromise;

  initializePromise = (async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.access_token) {
        logAuth('✅ Found existing session');
        persistToken(session.access_token);
        logTokenOnce(session.access_token, '🔑 Auth token initialized');
        updateAuthState({
          isAuthenticated: true,
          currentUser: session.user,
          token: session.access_token,
        });
        hasWarnedNoToken = false;
      } else {
        logAuth('⚠️ No existing session');
        persistToken(null);
        logTokenOnce(null, '');
        updateAuthState({
          isAuthenticated: false,
          currentUser: null,
          token: null,
        });
      }
    } catch (error) {
      console.error('❌ Error initializing auth:', error);
      updateAuthState({
        isAuthenticated: false,
        currentUser: null,
        token: null,
      });
    } finally {
      updateAuthState({ isInitializing: false });
    }
  })();

  return initializePromise;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>(authState);

  useEffect(() => {
    const listener: AuthListener = (nextState) => setState(nextState);
    listeners.add(listener);
    initializeAuthState();

    // Listen to Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        logAuth(`🔄 Auth state changed: ${event}`);

        if (event === 'SIGNED_IN' && session) {
          logAuth('✅ User signed in via auth listener');
          persistToken(session.access_token);
          updateAuthState({
            isAuthenticated: true,
            currentUser: session.user,
            token: session.access_token,
            isInitializing: false,
          });
        } else if (event === 'SIGNED_OUT') {
          logAuth('🚪 User signed out via auth listener');
          persistToken(null);
          updateAuthState({
            isAuthenticated: false,
            currentUser: null,
            token: null,
            isInitializing: false,
          });
        } else if (event === 'TOKEN_REFRESHED' && session) {
          logAuth('🔄 Token refreshed via auth listener');
          persistToken(session.access_token);
          updateAuthState({
            token: session.access_token,
          });
        }
      }
    );

    return () => {
      listeners.delete(listener);
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback((user: any, token: string) => {
    logAuth('✅ Login: Setting user and token');
    persistToken(token);
    logTokenOnce(token, '🔐 Auth token updated');
    hasWarnedNoToken = false;
    updateAuthState({
      isAuthenticated: true,
      currentUser: user,
      token,
      isInitializing: false,
    });
  }, []);

  const logout = useCallback(() => {
    logAuth('🚪 Logging out...');
    supabase.auth.signOut();
    persistToken(null);
    logTokenOnce(null, '');
    updateAuthState({
      isAuthenticated: false,
      currentUser: null,
      token: null,
      isInitializing: false,
    });
  }, []);

  const getAuthToken = useCallback(() => {
    // Return current token from state
    if (state.token) {
      return state.token;
    }

    if (typeof window === 'undefined') {
      return null;
    }

    // Try to get token from localStorage as fallback
    const token = localStorage.getItem('supabase_access_token');

    if (!token) {
      if (!hasWarnedNoToken) {
        logAuth('⚠️ No auth token available');
        hasWarnedNoToken = true;
      }
      return null;
    }

    // Don't auto-restore from localStorage if state says not authenticated
    // This prevents using stale tokens
    if (!state.isAuthenticated) {
      if (!hasWarnedNoToken) {
        logAuth('⚠️ Token in localStorage but not authenticated');
        hasWarnedNoToken = true;
      }
      return null;
    }

    logTokenOnce(token, '🔑 Auth token restored');
    hasWarnedNoToken = false;
    return token;
  }, [state.token, state.isAuthenticated]);

  return {
    isAuthenticated: state.isAuthenticated,
    currentUser: state.currentUser,
    isInitializing: state.isInitializing,
    login,
    logout,
    getAuthToken,
    supabase,
  };
}
