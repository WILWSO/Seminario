import React, { createContext, useContext, ReactNode } from 'react';

interface SkeletonConfig {
  baseColor?: string;
  highlightColor?: string;
  speed?: number;
  direction?: 'ltr' | 'rtl';
  borderRadius?: string;
  enableAnimation?: boolean;
}

interface SkeletonProviderProps {
  children: ReactNode;
  config?: SkeletonConfig;
}

const SkeletonContext = createContext<SkeletonConfig>({
  baseColor: 'bg-slate-200 dark:bg-slate-700',
  highlightColor: 'bg-slate-300 dark:bg-slate-600',
  speed: 2,
  direction: 'ltr',
  borderRadius: 'rounded',
  enableAnimation: true
});

export const SkeletonProvider: React.FC<SkeletonProviderProps> = ({ 
  children, 
  config = {} 
}) => {
  const defaultConfig: SkeletonConfig = {
    baseColor: 'bg-slate-200 dark:bg-slate-700',
    highlightColor: 'bg-slate-300 dark:bg-slate-600',
    speed: 2,
    direction: 'ltr',
    borderRadius: 'rounded',
    enableAnimation: true,
    ...config
  };

  return (
    <SkeletonContext.Provider value={defaultConfig}>
      {children}
    </SkeletonContext.Provider>
  );
};

export const useSkeletonConfig = () => {
  const context = useContext(SkeletonContext);
  if (!context) {
    // Return default config if no provider found
    return {
      baseColor: 'bg-slate-200 dark:bg-slate-700',
      highlightColor: 'bg-slate-300 dark:bg-slate-600',
      speed: 2,
      direction: 'ltr' as const,
      borderRadius: 'rounded',
      enableAnimation: true
    };
  }
  return context;
};

export default SkeletonProvider;
