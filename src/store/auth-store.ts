// ============================================
// AUTH STORE - Estado de autenticación con Zustand
// ============================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser, UserRole } from '../types';

// API Base URL
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

// Mock users para desarrollo sin backend
const MOCK_USERS: AuthUser[] = [
  {
    id: 'admin-001',
    email: 'admin@demo.com',
    firstName: 'Carlos',
    lastName: 'Administrador',
    role: 'ADMIN',
    isActive: true,
    accessToken: 'mock-token-admin',
  },
  {
    id: 'profesor-001',
    email: 'profesor@demo.com',
    firstName: 'María',
    lastName: 'González',
    role: 'PROFESOR',
    isActive: true,
    accessToken: 'mock-token-profesor',
  },
  {
    id: 'alumno-001',
    email: 'alumno@demo.com',
    firstName: 'Juan',
    lastName: 'Pérez',
    role: 'ALUMNO',
    isActive: true,
    accessToken: 'mock-token-alumno',
  },
];

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: AuthUser | null) => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

// Intentar login con backend, si falla usar mock
async function tryBackendLogin(email: string, password: string): Promise<AuthUser | null> {
  try {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }
    return null;
  } catch {
    // Backend no disponible, usar mock
    return null;
  }
}

function mockLogin(email: string, password: string): AuthUser | null {
  // Password demo: "demo123" o "123456"
  if (password !== 'demo123' && password !== '123456') {
    return null;
  }

  const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return user || null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      setUser: (user) => {
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        });
      },

      login: async (email: string, password: string) => {
        set({ isLoading: true });

        try {
          // Primero intentar con el backend
          let user = await tryBackendLogin(email, password);

          // Si no hay backend, usar mock
          if (!user) {
            user = mockLogin(email, password);
          }

          if (user) {
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
            });
            return true;
          }

          set({ isLoading: false });
          return false;
        } catch (error) {
          set({ isLoading: false });
          return false;
        }
      },

      logout: () => {
        // Intentar logout en backend (no bloquear si falla)
        fetch(`${API_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});

        set({
          user: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      checkAuth: async () => {
        const storedUser = get().user;
        if (storedUser) {
          set({ isLoading: false, isAuthenticated: true });
          return;
        }
        set({ isLoading: false });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helpers
export const useIsRole = (role: UserRole): boolean => {
  const user = useAuthStore((state) => state.user);
  return user?.role === role;
};

export const useIsProfesor = (): boolean => useIsRole('PROFESOR');
export const useIsAlumno = (): boolean => useIsRole('ALUMNO');
export const useIsAdmin = (): boolean => useIsRole('ADMIN');
