import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { loginConPin } from '@/services/cumbreService';
import type { UsuarioSesion } from '@/types/database';

const AUTH_STORAGE_KEY = '@cumbre_user';

export interface AuthContextValue {
  user: UsuarioSesion | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, pin: string) => Promise<UsuarioSesion>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UsuarioSesion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function loadStoredSession() {
      try {
        const rawSession = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (rawSession && isMounted) {
          const parsed = JSON.parse(rawSession) as Record<string, unknown>;
          const candidate =
            parsed && typeof parsed.user === 'object' && parsed.user !== null
              ? (parsed.user as Record<string, unknown>)
              : parsed;

          if (candidate && typeof candidate.id === 'string' && typeof candidate.username === 'string') {
            setUser({
              id: candidate.id,
              nombre: String(candidate.nombre ?? candidate.username),
              username: candidate.username,
              rol: candidate.rol === 'admin' ? 'admin' : 'miembro',
            });
          }
        }
      } catch (error) {
        console.error('[AuthContext] Error al cargar sesión local:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadStoredSession();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (username: string, pin: string): Promise<UsuarioSesion> => {
    const loggedUser = await loginConPin(username, pin);
    await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      logout,
    }),
    [user, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider.');
  }
  return context;
}
