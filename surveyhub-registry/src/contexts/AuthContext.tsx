import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AuthUser, 
  getAuthUser, 
  getAuthToken, 
  clearAuthData, 
  loginUser, 
  signupUser 
} from '@/lib/storage';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (email: string, password: string, name: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore user from localStorage on mount
    const storedUser = getAuthUser();
    const token = getAuthToken();

    // Only restore if both user data and token exist
    if (storedUser && token) {
      setUser(storedUser);
    } else {
      // Clear stale data if token is missing
      clearAuthData();
    }
    setIsLoading(false);
  }, []);

  // Listen for token expiry events from apiFetch
  useEffect(() => {
    const handleExpiry = () => {
      clearAuthData();
      setUser(null);
    };
    window.addEventListener('auth:expired', handleExpiry);
    return () => window.removeEventListener('auth:expired', handleExpiry);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const validUser = await loginUser(email, password);
    if (validUser) {
      setUser(validUser);
      return true;
    }
    return false;
  };

  const signup = async (email: string, password: string, name: string): Promise<boolean> => {
    const newUser = await signupUser(email, password, name);
    if (newUser) {
      setUser(newUser);
      return true;
    }
    return false;
  };

  const logout = () => {
    clearAuthData();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const RequireAuth: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
