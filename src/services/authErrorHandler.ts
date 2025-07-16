export interface AuthErrorHandler {
  onInvalidToken: () => void;
  onNetworkError: () => void;
}

let errorHandler: AuthErrorHandler | null = null;

export const setAuthErrorHandler = (handler: AuthErrorHandler) => {
  errorHandler = handler;
};

export const handleSupabaseError = (error: any) => {
  if (!error) return;

  const isInvalidTokenError = error?.message?.includes('refresh_token_not_found') || 
                             error?.message?.includes('Invalid Refresh Token') ||
                             error?.message?.includes('refresh_token_expired') ||
                             error?.message?.includes('JWT expired');

  const isNetworkError = error?.message?.includes('fetch') || 
                        error?.message?.includes('Network') ||
                        error?.message?.includes('Failed to fetch');

  if (isInvalidTokenError && errorHandler) {
    console.warn('Token inválido detectado, manejando...');
    errorHandler.onInvalidToken();
  } else if (isNetworkError && errorHandler) {
    console.warn('Error de red detectado, manejando...');
    errorHandler.onNetworkError();
  }
};

// Función utilitaria para verificar errores en respuestas de Supabase
export const checkSupabaseResponse = (response: any) => {
  if (response?.error) {
    handleSupabaseError(response.error);
  }
  return response;
};
