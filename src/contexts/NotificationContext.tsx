import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextProps {
  showNotification: (type: NotificationType, title: string, message?: string, duration?: number) => void;
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within a NotificationProvider');
  return ctx;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const showNotification = useCallback(
    (type: NotificationType, title: string, message?: string, duration: number = 4000) => {
      const id = Math.random().toString(36).substr(2, 9);
      setNotifications(prev => [
        ...prev,
        { id, type, title, message, duration }
      ]);
      // Remove automaticamente após o tempo
      setTimeout(() => removeNotification(id), duration);
    },
    [removeNotification]
  );

  const showSuccess = useCallback((title: string, message?: string, duration?: number) => {
    showNotification('success', title, message, duration);
  }, [showNotification]);

  const showError = useCallback((title: string, message?: string, duration?: number) => {
    showNotification('error', title, message, duration);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message?: string, duration?: number) => {
    showNotification('info', title, message, duration);
  }, [showNotification]);

  const showWarning = useCallback((title: string, message?: string, duration?: number) => {
    showNotification('warning', title, message, duration);
  }, [showNotification]);

  return (
    <NotificationContext.Provider value={{ showNotification, showSuccess, showError, showInfo, showWarning }}>
      {children}
      <div className="fixed top-4 right-4 z-50 space-y-2">
       <AnimatePresence>         
        {notifications.map(n => (
        <motion.div
            key={n.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            >
          <div
            key={n.id} 
            className={`
              px-4 py-3 rounded shadow text-white border-l-4
              ${n.type === 'success' ? 'bg-green-600 border-green-800' : ''}
              ${n.type === 'error' ? 'bg-red-600 border-red-800' : ''}
              ${n.type === 'info' ? 'bg-blue-600 border-blue-800' : ''}
              ${n.type === 'warning' ? 'bg-yellow-500 border-yellow-700 text-black' : ''}
            `}
          >
            <div className="font-bold">{n.title}</div>
            {n.message && <div className="text-sm">{n.message}</div>}
          </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};