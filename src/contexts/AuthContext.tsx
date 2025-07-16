import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase, User } from '../config/supabase';
import type { Session } from '@supabase/supabase-js';
import { setAuthErrorHandler, handleSupabaseError } from '../services/authErrorHandler';
import { emitAuthError } from '../hooks/useAuthErrorNotifications';

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

  // Función utilitaria para limpiar completamente la sesión
  const clearSession = () => {
    setUser(null);
    setSession(null);
    setError(null);
    localStorage.removeItem('user_profile');
    
    // Limpiar todos los tokens de Supabase del localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.includes('-auth-token')) {
        localStorage.removeItem(key);
      }
    });
  };

  // Función para verificar si es un error de token inválido
  const isInvalidTokenError = (error: any) => {
    return error?.message?.includes('refresh_token_not_found') || 
           error?.message?.includes('Invalid Refresh Token') ||
           error?.message?.includes('refresh_token_expired') ||
           error?.message?.includes('JWT expired');
  };

  // Configurar el manejador global de errores de autenticación
  useEffect(() => {
    setAuthErrorHandler({
      onInvalidToken: () => {
        console.log('Manejador global: Token inválido detectado');
        emitAuthError('invalid_token', 'Token de sesión inválido o expirado');
        clearSession();
      },
      onNetworkError: () => {
        console.log('Manejador global: Error de red detectado');
        emitAuthError('network_error', 'Error de conexión con el servidor');
        setError('Error de conexión. Verifica tu conexión a internet.');
      }
    });
  }, []);

  // Función robusta para buscar perfil com timeout
  const fetchUserProfile = async (userId: string) => {
    return Promise.race([
      (async () => {
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('Fetching user profile for ID:', userId);
          }
          const { data, error } = await supabase
            .from('users')
            .select('id, name, first_name, last_name, email, role, profile_photo_url')
            .eq('id', userId)
            .single();

          if (error) {
            console.error('Database error fetching user profile:', error);
            handleSupabaseError(error);
            
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

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!isMounted) return;
      
      // Manejo mejorado de errores de token expirado o inválido
      if (error) {
        if (isInvalidTokenError(error)) {
          console.log('Token inválido o expirado, limpiando sesión...');
          clearSession();
          setIsLoading(false);
          return;
        }
        
        // Otros errores de autenticación
        console.error('Error al obtener sesión:', error);
        setError('Error de autenticación');
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
        fetchUserProfile(session.user.id).then(profile => {
          if (profile && JSON.stringify(profile) !== JSON.stringify(user)) {
            setUser(profile as User);
            localStorage.setItem('user_profile', JSON.stringify(profile));
          }
          setIsLoading(false);
        }).catch(() => setIsLoading(false));
      } else {
        setUser(null);
        localStorage.removeItem('user_profile');
        setIsLoading(false);
      }
    });

    // Listener para mudanças de auth com manejo de erros mejorado
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        
        // Manejar errores específicos de refresh token
        if (event === 'TOKEN_REFRESHED' && !session) {
          console.log('Token refresh falló, limpiando sesión...');
          clearSession();
          return;
        }
        
        if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
          if (event === 'SIGNED_OUT') {
            setUser(null);
            setSession(null);
            localStorage.removeItem('user_profile');
          }
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(session);
          if (session?.user) {
            try {
              const profile = await fetchUserProfile(session.user.id);
              setUser(profile as User);
              if (profile) {
                localStorage.setItem('user_profile', JSON.stringify(profile));
              }
            } catch (error: any) {
              console.log('Error loading profile after auth change:', error);
              
              // Si hay error de autenticación, limpiar sesión
              if (isInvalidTokenError(error)) {
                clearSession();
              }
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
        setUser(profile as User);
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
      clearSession();
    } catch (err: any) {
      console.error('Logout error:', err);
      // Incluso si hay error, limpiar la sesión local
      clearSession();
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

  // Solo mostrar logs en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log('AuthContext:', { user: user?.id, session: !!session, isLoading, error });
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};