'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, removeToken, setToken, setUser, canAccess } from '@/utils/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Load user from localStorage
    const storedUser = getUser();
    setUserState(storedUser);
    setLoading(false);

    // Check if user needs to be on login page
    const isLoginPage = pathname === '/login';
    if (!storedUser && !isLoginPage && pathname) {
      router.push('/login');
    } else if (storedUser && isLoginPage) {
      router.push('/dashboard');
    }
  }, [pathname]);

  const login = (token, userData) => {
    setToken(token);
    setUser(userData);
    setUserState(userData);
  };

  const logout = () => {
    removeToken();
    setUserState(null);
    router.push('/login');
  };

  const hasPermission = (permission) => {
    if (!user || !user.permissions) return false;
    if (user.permissions.all === true) return true;
    return user.permissions[permission] === true;
  };

  const canAccessResource = (resource) => {
    return canAccess(user, resource);
  };

  const canEditResource = (resource) => {
    if (!user || !user.permissions) return false;
    if (user.permissions.all === true) return true;
    // Check if user has explicit permission for this resource
    // Users with only "view" permission cannot edit
    if (user.permissions[resource] === true) {
      return true;
    }
    // If user only has view permission, they cannot edit
    if (user.permissions.view === true && user.permissions[resource] !== true) {
      return false;
    }
    return false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, canAccessResource, canEditResource }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

