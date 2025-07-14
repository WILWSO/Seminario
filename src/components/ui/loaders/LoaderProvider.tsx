import React, { createContext, useContext, ReactNode } from 'react';

interface LoaderConfig {
  defaultDelay?: number;
  defaultThreshold?: number;
  enableIntersectionObserver?: boolean;
  lazyLoadImages?: boolean;
}

interface LoaderProviderProps {
  children: ReactNode;
  config?: LoaderConfig;
}

const LoaderContext = createContext<LoaderConfig>({
  defaultDelay: 0,
  defaultThreshold: 0.1,
  enableIntersectionObserver: true,
  lazyLoadImages: true
});

export const LoaderProvider: React.FC<LoaderProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const defaultConfig: LoaderConfig = {
    defaultDelay: 0,
    defaultThreshold: 0.1,
    enableIntersectionObserver: true,
    lazyLoadImages: true,
    ...config
  };

  return (
    <LoaderContext.Provider value={defaultConfig}>
      {children}
    </LoaderContext.Provider>
  );
};

export const useLoaderConfig = () => {
  const context = useContext(LoaderContext);
  if (!context) {
    throw new Error('useLoaderConfig must be used within a LoaderProvider');
  }
  return context;
};

export default LoaderProvider;
