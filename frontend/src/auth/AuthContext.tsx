import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/endpoints.js';
import { clearToken, getToken } from '../api/client.js';

interface AuthState {
  isAuthenticated: boolean;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Validate any stored token on mount.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    authApi
      .me()
      .then(() => setAuthenticated(true))
      .catch(() => {
        clearToken();
        setAuthenticated(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    await authApi.login(username, password);
    setAuthenticated(true);
  };

  const logout = () => {
    clearToken();
    setAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
