import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, FranchiseeUser } from '@/types/user';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sprawdź istniejącą sesję
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        loadUserFromSession(session);
      }
      setLoading(false);
    });

    // Nasłuchuj zmian w autentykacji
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        loadUserFromSession(session);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserFromSession = async (session: Session) => {
    try {
      // Pobierz dane użytkownika z tabeli users używając auth_user_id lub email
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .or(`auth_user_id.eq.${session.user.id},email.eq.${session.user.email}`)
        .single();

      if (error || !userData) {
        console.error('Error loading user data:', error);
        return;
      }

      // Sprawdź czy franczyzobiorca jest aktywny
      if (userData.role === 'franchisee') {
        const { data: franchiseeData } = await supabase
          .from('franchisees')
          .select('status')
          .eq('id', userData.id)
          .single();

        if (franchiseeData && franchiseeData.status !== 'aktywny') {
          await supabase.auth.signOut();
          return;
        }
      }

      // Mapuj dane z bazy na obiekt User
      const appUser: User = {
        id: userData.id,
        name: userData.name,
        phone: userData.phone,
        role: userData.role as 'admin' | 'worker' | 'franchisee',
      };

      setUser(appUser);
    } catch (error) {
      console.error('Error loading user from session:', error);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (data.session) {
        await loadUserFromSession(data.session);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const updateUser = (userData: Partial<User | FranchiseeUser>) => {
    if (user) {
      const updatedUser = { ...user, ...userData } as User | FranchiseeUser;
      setUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      updateUser, 
      isAuthenticated: !!user,
      loading 
    }}>
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
