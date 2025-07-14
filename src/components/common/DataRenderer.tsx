import React, { ReactNode, memo } from 'react';
import { ProgressiveLoader } from '../ui/loaders/ProgressiveLoader';

interface DataRendererProps<T> {
  data: T | null;
  isLoading: boolean;
  error?: Error | string | null;
  children: (data: T) => ReactNode;
  skeleton?: ReactNode;
  errorComponent?: ReactNode;
  emptyComponent?: ReactNode;
  loadingText?: string;
  retryButton?: boolean;
  onRetry?: () => void;
  className?: string;
}

const DataRendererBase = <T,>({
  data,
  isLoading,
  error,
  children,
  skeleton,
  errorComponent,
  emptyComponent,
  loadingText = 'Cargando...',
  retryButton = false,
  onRetry,
  className = ''
}: DataRendererProps<T>) => {
  // Estado de error
  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }

    const errorMessage = typeof error === 'string' ? error : error.message;
    
    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-red-500 dark:text-red-400 mb-4">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
            Error al cargar los datos
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
            {errorMessage}
          </p>
          {retryButton && onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    );
  }

  // Estado de carga
  if (isLoading) {
    return (
      <ProgressiveLoader
        isLoading={true}
        skeleton={skeleton}
        loadingText={loadingText}
        showLoadingText={!skeleton}
        className={className}
      >
        <div />
      </ProgressiveLoader>
    );
  }

  // Estado vacío
  if (!data || (Array.isArray(data) && data.length === 0)) {
    if (emptyComponent) {
      return <>{emptyComponent}</>;
    }

    return (
      <div className={`text-center py-8 ${className}`}>
        <div className="text-slate-400 dark:text-slate-500">
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2M4 13h2m13-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
            No hay datos disponibles
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            No se encontraron elementos para mostrar
          </p>
        </div>
      </div>
    );
  }

  // Renderizar datos
  return (
    <div className={className}>
      {children(data)}
    </div>
  );
};

// Memoización para evitar re-renders innecesarios
export const DataRenderer = memo(DataRendererBase) as <T>(
  props: DataRendererProps<T>
) => JSX.Element;

export default DataRenderer;
