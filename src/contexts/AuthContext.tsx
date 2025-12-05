import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, FranchiseeUser } from '@/types/user';
import { supabase } from '@/lib/supabase';
import { comparePassword } from '@/lib/password';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Fetch user from Supabase
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !userData) {
        return false;
      }

      // Verify password
      const passwordMatch = await comparePassword(password, userData.password_hash);
      if (!passwordMatch) {
        return false;
      }

      // Check if franchisee is active
      if (userData.role === 'franchisee') {
        const { data: franchiseeData } = await supabase
          .from('franchisees')
          .select('status')
          .eq('id', userData.id)
          .single();

        if (franchiseeData && franchiseeData.status !== 'aktywny') {
          return false;
        }
      }

      // Map database user to app user
      const appUser: User = {
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        role: userData.role as 'admin' | 'worker' | 'franchisee',
      };

      setUser(appUser);
      localStorage.setItem('currentUser', JSON.stringify(appUser));
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('currentUser');
  };

  const updateUser = (userData: Partial<User | FranchiseeUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData } as User | FranchiseeUser;
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
