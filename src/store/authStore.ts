import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface UserPermissions {
  companyWide: boolean;
  readAllEmployees: boolean;
  manageCompany: boolean;
  manageAllDepartments: boolean;
  canManageEmployees: boolean;
  canManagePayroll: boolean;
  canApproveManager: boolean;
  canApproveHr: boolean;
  canViewAuditLogs: boolean;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' | 'SUPER_ADMIN';
  companyId: string;
  departmentId?: string | null;
  department?: string | null;
  employeeCode?: string | null;
  designation?: string | null;
  adminDepartmentIds?: string[];
  managerDepartmentIds?: string[];
  permissions?: UserPermissions;
  company?: {
    name: string;
    timezone: string;
    logo?: string | null;
  };
  mustChangePassword?: boolean;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      setAuth: (user, accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          // Set cookie for middleware
          document.cookie = "isAuthenticated=true; path=/; max-age=604800; samesite=lax";
        }
        set({ user, accessToken, refreshToken });
      },
      setUser: (user) => set({ user }),
      logout: () => {
        set({ user: null, accessToken: null, refreshToken: null });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          // Zustand persist rewrites this key on `set`, so remove it after the
          // state update. A stale persisted user makes protected layouts think
          // the session is still valid and immediately re-fetch with no tokens.
          localStorage.removeItem('auth-storage');
          // Clear cookie for middleware
          document.cookie = "isAuthenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => (typeof window !== 'undefined' ? localStorage : ({} as Storage))),
    }
  )
);
