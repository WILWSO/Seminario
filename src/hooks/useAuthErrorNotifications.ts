import { useEffect } from 'react';
import { useNotifications } from '../contexts/NotificationContext';

// Hook personalizado para manejar errores de autenticación
export const useAuthErrorNotifications = () => {
  const { showError, showWarning } = useNotifications();

  useEffect(() => {
    const handleAuthError = (event: CustomEvent) => {
      const { type, message } = event.detail;
      
      switch (type) {
        case 'invalid_token':
          showWarning(
            'Sesión expirada',
            'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.',
            5000
          );
          break;
        case 'network_error':
          showError(
            'Error de conexión',
            'Problema de conectividad. Verifica tu conexión a internet.',
            5000
          );
          break;
        default:
          showError(
            'Error de autenticación',
            message || 'Ha ocurrido un error inesperado.',
            5000
          );
      }
    };

    // Escuchar eventos personalizados de error de autenticación
    window.addEventListener('auth-error', handleAuthError as EventListener);

    return () => {
      window.removeEventListener('auth-error', handleAuthError as EventListener);
    };
  }, [showError, showWarning]);
};

// Función utilitaria para disparar eventos de error de autenticación
export const emitAuthError = (type: string, message?: string) => {
  const event = new CustomEvent('auth-error', {
    detail: { type, message }
  });
  window.dispatchEvent(event);
};
