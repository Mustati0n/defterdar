'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api-client';
import {
  clearSession,
  getRefreshToken,
  hasPersistedSession,
  setSession,
} from '@/lib/session';
import type { LoginInput, RegisterInput, User } from '@/lib/types';

interface AuthContextValue {
  user: User | null;
  isBootstrapping: boolean;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (!hasPersistedSession()) {
        if (active) setIsBootstrapping(false);
        return;
      }

      try {
        const currentUser = await api.users.me();
        if (active) setUser(currentUser);
      } catch {
        clearSession();
      } finally {
        if (active) setIsBootstrapping(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const response = await api.auth.login(input);
    setSession(response);
    setUser(response.user);
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await api.auth.register(input);
    setSession(response);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getRefreshToken();
    clearSession();
    setUser(null);
    if (refreshToken) {
      try {
        await api.auth.logout(refreshToken);
      } catch {
        // The local session is already closed; remote revocation is best effort.
      }
    }
  }, []);

  const value = useMemo(
    () => ({ user, isBootstrapping, login, register, logout }),
    [user, isBootstrapping, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
