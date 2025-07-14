import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';
import { handleAuthError, isAuthError } from './config/supabase';

// Global error handler for Supabase auth errors
window.addEventListener('unhandledrejection', (event) => {
  if (isAuthError(event.reason)) {
    console.warn('Unhandled auth error detected:', event.reason);
    handleAuthError(event.reason);
    event.preventDefault(); // Prevent the error from being logged to console
  }
});

// Global function to clear corrupted session (can be called from browser console)
(window as any).clearSupabaseSession = async () => {
  try {
    console.log('Clearing Supabase session...');
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all supabase related items
    Object.keys(localStorage).forEach(key => {
      if (key.includes('supabase') || key.includes('auth') || key.includes('user_profile')) {
        localStorage.removeItem(key);
      }
    });
    
    console.log('Session cleared. Please refresh the page.');
    window.location.reload();
  } catch (error) {
    console.error('Error clearing session:', error);
  }
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <App />
    </BrowserRouter>
  </StrictMode>
);