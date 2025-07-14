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

  // Función robusta para buscar perfil con timeout optimizado y cache
  const fetchUserProfile = async (userId: string, retryCount = 0): Promise<User | null> => {
    const maxRetries = 2;
    const timeoutMs = retryCount > 0 ? 20000 : 15000; // Timeout más generoso en reintentos
    
    return Promise.race([
      (async (): Promise<User | null> => {
        try {
          console.log(`Fetching user profile for ID: ${userId} (attempt ${retryCount + 1})`);
          
          // Usar AbortController para mejor control de cancelación
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeoutMs - 1000);
          
          const { data, error } = await supabase
            .from('users')
            .select('id, name, first_name, last_name, email, role, profile_photo_url')
            .eq('id', userId)
            .abortSignal(controller.signal)
            .single();

          clearTimeout(timeoutId);

          if (error) {
            console.error('Database error fetching user profile:', error);
            if (error.code === 'PGRST116') {
              console.log('User profile not found in database - this is normal for new users');
              return null;
            }
            throw error;
          }
          
          console.log('User profile fetched successfully:', data);
          return data as User;
        } catch (error: any) {
          console.error(`Error in fetchUserProfile (attempt ${retryCount + 1}):`, error);
          
          // Reintentar en caso de errores de red o timeout
          if (retryCount < maxRetries && (
            error.name === 'AbortError' ||
            error instanceof TypeError && error.message?.includes('fetch') ||
            error.message?.includes('timeout') ||
            error.message?.includes('network')
          )) {
            console.log(`Retrying fetchUserProfile in 2 seconds... (${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return fetchUserProfile(userId, retryCount + 1);
          }
          
          if (error instanceof TypeError && error.message?.includes('fetch')) {
            setError('Erro de conexão com o banco de dados. Verifique sua conexão.');
            return null;
          }
          if (error.message?.includes('Invalid API key') || error.message?.includes('Project not found')) {
            setError('Erro de configuração do Supabase.');
            return null;
          }
          if (error.name === 'AbortError' || error.message?.includes('Timeout')) {
            setError('Tempo limite excedido ao buscar perfil. Tente novamente.');
            return null;
          }
          
          setError('Erro desconhecido ao buscar perfil.');
          return null;
        }
      })(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout ao buscar perfil')), timeoutMs))
    ]);
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    // Obtener sesión inicial
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return;
      
      if (error) {
        console.error('Error getting session:', error);
        setError('Error de autenticación');
        setSession(null);
        setUser(null);
        setIsLoading(false);
        return;
      }

      setSession(session);

      if (session?.user) {
        // 1. Carrega do cache imediatamente
        const cachedProfile = localStorage.getItem('user_profile');
        if (cachedProfile) {
          setUser(JSON.parse(cachedProfile));
          setIsLoading(false); // Libera a interface rapidamente
        }

        // 2. Atualiza do servidor em paralelo
        fetchUserProfile(session.user.id).then((profile: User | null) => {
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

    // Listener para cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        console.log('Auth state changed:', event, session);

        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            setSession(null);
            setUser(null);
            setError(null);
            localStorage.removeItem('user_profile');
          } else if (event === 'TOKEN_REFRESHED' && session) {
            setSession(session);
            setError(null);
          }
        } else if (event === 'SIGNED_IN' && session) {
          setSession(session);
          setError(null);
          
          if (session.user) {
            try {
              const profile = await fetchUserProfile(session.user.id);
              setUser(profile);
              if (profile) {
                localStorage.setItem('user_profile', JSON.stringify(profile));
              }
            } catch (err) {
              console.error('Error fetching profile after sign in:', err);
            }
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
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
      
      // Limpiar datos locales primero
      setUser(null);
      setSession(null);
      setError(null);
      localStorage.removeItem('user_profile');
      
      // Intentar logout en Supabase
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Error during logout, but local session cleared:', error);
        // No thrower el error porque ya limpiamos la sesión local
      }
    } catch (err: any) {
      console.error('Logout error:', err);
      // Asegurar que el estado local esté limpio incluso si hay error
      setUser(null);
      setSession(null);
      setError(null);
      localStorage.removeItem('user_profile');
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