import { useEffect, useState } from 'react';
import { supabase } from '../config/supabase';

export function useConnectionStatus(showError: (title: string, msg: string, ms?: number) => void) {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);
  const [dbConnected, setDbConnected] = useState(true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      showError('Sin conexión', 'Sin conexión a internet.', 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showError]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const pingDb = async () => {
      try {
        // Faz um select simples só para testar a conexão
        const { error } = await supabase.from('users').select('id').limit(1);
        if (error) throw error;
        setDbConnected(true);
      } catch {
        setDbConnected(false);
        showError('Error de conexión', 'No se puede conectar con la base de datos.', 5000);
      }
    };

    // Testa a cada 30 segundos
    interval = setInterval(pingDb, 30000);
    pingDb();

    return () => clearInterval(interval);
  }, [showError]);

  return { isOnline, dbConnected };
}