import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, User } from '../config/supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        try {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile);
        } catch (error) {
          console.error('Failed to fetch user profile on session check:', error);
          // Don't throw here, just log the error and continue without profile
        }
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.id);
      
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        try {
          const profile = await fetchUserProfile(session.user.id);
          setUser(profile);
        } catch (error) {
          console.error('Failed to fetch user profile on sign in:', error);
          // Set a minimal user object if profile fetch fails
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            first_name: '',
            last_name: '',
            role: ['student'], // Garantir role padrão
            document_type: 'dni',
            document_number: '',
            social_networks: {},
            street_address: '',
            street_number: '',
            locality: '',
            department: '',
            province: '',
            postal_code: '',
            country: 'Argentina',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
    try {
      console.log('Fetching user profile for ID:', userId);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Database error fetching user profile:', error);
        throw error;
      }

      console.log('User profile fetched successfully:', data);
      setUser(data);
      return data;
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network connection failed. Please check your internet connection and Supabase configuration.');
      }
      
      // Check if it's a Supabase configuration error
      if (error.message?.includes('Invalid API key') || error.message?.includes('Project not found')) {
        throw new Error('Supabase configuration error. Please check your environment variables.');
      }
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        await fetchUserProfile(data.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      setUser(null);
      setSession(null);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const value = {
    user,
    session,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!session && !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};