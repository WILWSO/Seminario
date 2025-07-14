import React, { Suspense, ReactNode, Component, ErrorInfo, memo } from 'react';

interface AsyncComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  errorFallback?: React.ComponentType<{ error: Error; reset: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  className?: string;
}

// Error Boundary simple
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class SimpleErrorBoundary extends Component<
  {
    children: ReactNode;
    fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.props.onError?.(error, errorInfo);
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback || DefaultErrorFallback;
      return <Fallback error={this.state.error} reset={this.reset} />;
    }

    return this.props.children;
  }
}

const DefaultErrorFallback: React.ComponentType<{ error: Error; reset: () => void }> = ({ 
  error, 
  reset 
}) => (
  <div className="text-center py-8">
    <div className="text-red-500 dark:text-red-400 mb-4">
      <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
      </svg>
      <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
        Algo salió mal
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
        {error.message}
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 transition"
      >
        Intentar de nuevo
      </button>
    </div>
  </div>
);

const DefaultSuspenseFallback = () => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600"></div>
    <span className="ml-2 text-slate-600 dark:text-slate-400">Cargando...</span>
  </div>
);

const AsyncComponentBase: React.FC<AsyncComponentProps> = ({
  children,
  fallback = <DefaultSuspenseFallback />,
  errorFallback = DefaultErrorFallback,
  onError,
  className = ''
}) => {
  const handleError = (error: Error, errorInfo: ErrorInfo) => {
    console.error('AsyncComponent Error:', error, errorInfo);
    if (onError) {
      onError(error, errorInfo);
    }
  };

  return (
    <div className={className}>
      <SimpleErrorBoundary
        fallback={errorFallback}
        onError={handleError}
      >
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      </SimpleErrorBoundary>
    </div>
  );
};

export const AsyncComponent = memo(AsyncComponentBase);

// HOC para envolver componentes automáticamente
export const withAsyncComponent = <P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AsyncComponentProps, 'children'>
) => {
  const WrappedComponent = memo((props: P) => (
    <AsyncComponent {...options}>
      <Component {...props} />
    </AsyncComponent>
  ));

  WrappedComponent.displayName = `withAsyncComponent(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

export default AsyncComponent;
