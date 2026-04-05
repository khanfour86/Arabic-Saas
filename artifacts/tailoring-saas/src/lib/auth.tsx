import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMe, CurrentUser } from '@workspace/api-client-react';

interface AuthContextType {
  user: CurrentUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: CurrentUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

const appHomeUrl = new URL(import.meta.env.BASE_URL, window.location.origin).toString();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const queryClient = useQueryClient();

  const { data: user, isLoading, error, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (error) {
      doLogout();
    }
  }, [error]);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  const login = (newToken: string, newUser: CurrentUser) => {
    localStorage.setItem('auth_token', newToken);
    setCurrentUser(newUser);
    setToken(newToken);
    refetch();
  };

  const doLogout = () => {
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    setToken(null);
    queryClient.clear();
  };

  const logout = () => {
    doLogout();
    window.location.href = appHomeUrl;
  };

  return (
    <AuthContext.Provider value={{ 
      user: currentUser, 
      token, 
      isLoading: token ? isLoading : false, 
      login, 
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
