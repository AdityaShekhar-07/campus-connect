import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { api, getToken, clearToken, setToken } from '../lib/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStudent: boolean;
  isOrganizer: boolean;
  login: (email: string, password: string) => Promise<User>;
  switchDemo: (role: Role) => Promise<User>;
  instantLogin: (name: string, role?: Role) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      const storedToken = getToken();
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.getMe();
        if (response.success && response.user) {
          setUser(response.user);
          setTokenState(storedToken);
        } else {
          clearToken();
          setUser(null);
          setTokenState(null);
        }
      } catch (err) {
        clearToken();
        setUser(null);
        setTokenState(null);
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const res = await api.login(email, password);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const switchDemo = async (role: Role): Promise<User> => {
    const res = await api.switchDemo(role);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const instantLogin = async (name: string, role: Role = 'STUDENT'): Promise<User> => {
    const res = await api.instantLogin(name, role);
    setToken(res.token);
    setTokenState(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Continue cleanup regardless
    }
    clearToken();
    setUser(null);
    setTokenState(null);
  };

  const isStudent = user?.role === 'STUDENT';
  const isOrganizer = user?.role === 'ORGANIZER';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user,
        isStudent,
        isOrganizer,
        login,
        switchDemo,
        instantLogin,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
