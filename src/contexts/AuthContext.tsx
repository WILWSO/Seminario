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

  // Função robusta para buscar perfil com timeout
  const fetchUserProfile = async (userId: string) => {
    return Promise.race([
      (async () => {
        try {
          console.log('Fetching user profile for ID:', userId);
          const { data, error } = await supabase
            .from('users')
            .select('id, name, first_name, last_name, email, role, profile_photo_url')
            .eq('id', userId)
            .single();

          if (error) {
            console.error('Database error fetching user profile:', error);
            if (error.code === 'PGRST116') {
              console.log('User profile not found in database - this is normal for new users');
              return null;
            }
            throw error;
          }
          console.log('User profile fetched successfully:', data);
          return data;
        } catch (error: any) {
          console.error('Error in fetchUserProfile:', error);
          if (error instanceof TypeError && error.message?.includes('fetch')) {
            setError('Erro de conexão com o banco de dados.');
            return null;
          }
          if (error.message?.includes('Invalid API key') || error.message?.includes('Project not found')) {
            setError('Erro de configuração do Supabase.');
            return null;
          }
          setError('Erro desconhecido ao buscar perfil.');
          return null;
        }
      })(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout ao buscar perfil')), 10000))
    ]);
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isMounted) return;
      setSession(session);

      if (session?.user) {
        // 1. Carrega do cache imediatamente
        const cachedProfile = localStorage.getItem('user_profile');
        if (cachedProfile) {
          setUser(JSON.parse(cachedProfile));
          setIsLoading(false); // Libera a interface rapidamente
        }

        // 2. Atualiza do servidor em paralelo
        fetchUserProfile(session.user.id).then(profile => {
          if (profile && JSON.stringify(profile) !== JSON.stringify(user)) {
            setUser(profile);
            localStorage.setItem('user_profile', JSON.stringify(profile));
          }
          setIsLoading(false);
        }).catch(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    });

    return () => { isMounted = false; };
  }, []);

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
        setSession(data.session); // <-- Certifique-se que está atualizando a sessão!
        const profile = await fetchUserProfile(data.user.id);
        setUser(profile);
        if (!profile) setError('Perfil não encontrado.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao iniciar sessão');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      console.error('Logout error:', err);
      throw err;
    } finally {
      setIsLoading(false);
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

  console.log('AuthContext:', { user, session, isLoading, error });

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};