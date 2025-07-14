import React, { ReactNode, memo, useEffect, useState } from 'react';
import { OptimizedComponent } from '../ui/performance/OptimizedComponent';
import { ProgressiveLoader } from '../ui/loaders/ProgressiveLoader';
import { LazyLoader } from '../ui/loaders/LazyLoader';

interface PerformanceWrapperProps {
  children: ReactNode;
  cacheKey?: string;
  dependencies?: any[];
  enableLazyLoading?: boolean;
  enableProgressiveLoading?: boolean;
  enableOptimization?: boolean;
  isLoading?: boolean;
  skeleton?: ReactNode;
  lazyThreshold?: number;
  lazyRootMargin?: string;
  className?: string;
  onMount?: () => void;
  onUnmount?: () => void;
  measurePerformance?: boolean;
}

const PerformanceWrapperBase: React.FC<PerformanceWrapperProps> = ({
  children,
  cacheKey,
  dependencies = [],
  enableLazyLoading = false,
  enableProgressiveLoading = false,
  enableOptimization = true,
  isLoading = false,
  skeleton,
  lazyThreshold = 0.1,
  lazyRootMargin = '50px',
  className = '',
  onMount,
  onUnmount,
  measurePerformance = false
}) => {
  const [performanceMetrics, setPerformanceMetrics] = useState<{
    renderTime?: number;
    mountTime?: number;
  }>({});

  useEffect(() => {
    if (measurePerformance) {
      const startTime = performance.now();
      
      const handleMount = () => {
        const mountTime = performance.now() - startTime;
        setPerformanceMetrics(prev => ({ ...prev, mountTime }));
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Component mounted in ${mountTime.toFixed(2)}ms`, { cacheKey });
        }
        
        if (onMount) onMount();
      };

      // Simular tiempo de mount en el próximo tick
      const timeoutId = setTimeout(handleMount, 0);
      
      return () => {
        clearTimeout(timeoutId);
        if (onUnmount) onUnmount();
      };
    } else {
      if (onMount) onMount();
      return () => {
        if (onUnmount) onUnmount();
      };
    }
  }, [measurePerformance, cacheKey, onMount, onUnmount]);

  // Función para medir tiempo de renderizado
  const measureRenderTime = () => {
    if (measurePerformance) {
      const startTime = performance.now();
      
      // Usar requestAnimationFrame para medir después del render
      requestAnimationFrame(() => {
        const renderTime = performance.now() - startTime;
        setPerformanceMetrics(prev => ({ ...prev, renderTime }));
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`Component rendered in ${renderTime.toFixed(2)}ms`, { cacheKey });
        }
      });
    }
  };

  useEffect(measureRenderTime, [children, measurePerformance, cacheKey]);

  // Componente base
  let component = children;

  // Aplicar Progressive Loading si está habilitado
  if (enableProgressiveLoading) {
    component = (
      <ProgressiveLoader
        isLoading={isLoading}
        skeleton={skeleton}
        animationDuration={0.3}
        fadeIn={true}
      >
        {component}
      </ProgressiveLoader>
    );
  }

  // Aplicar Optimización de componente si está habilitado
  if (enableOptimization) {
    component = (
      <OptimizedComponent
        cacheKey={cacheKey}
        dependencies={dependencies}
        className={className}
        lazy={enableLazyLoading}
        threshold={lazyThreshold}
        onMount={() => {
          if (measurePerformance && onMount) onMount();
        }}
        onUnmount={onUnmount}
      >
        {component}
      </OptimizedComponent>
    );
  }

  // Aplicar Lazy Loading si está habilitado y no se está usando OptimizedComponent
  if (enableLazyLoading && !enableOptimization) {
    component = (
      <LazyLoader
        threshold={lazyThreshold}
        rootMargin={lazyRootMargin}
        className={className}
        fallback={skeleton}
      >
        {component}
      </LazyLoader>
    );
  }

  // Añadir métricas de performance en desarrollo
  if (measurePerformance && process.env.NODE_ENV === 'development') {
    return (
      <div>
        {component}
        <div className="text-xs text-gray-400 mt-1">
          {performanceMetrics.renderTime && (
            <span>Render: {performanceMetrics.renderTime.toFixed(2)}ms</span>
          )}
          {performanceMetrics.mountTime && (
            <span className="ml-2">Mount: {performanceMetrics.mountTime.toFixed(2)}ms</span>
          )}
        </div>
      </div>
    );
  }

  return <>{component}</>;
};

export const PerformanceWrapper = memo(PerformanceWrapperBase);

// Hook para configuración de performance por defecto
export const usePerformanceConfig = () => {
  return {
    enableLazyLoading: true,
    enableProgressiveLoading: true,
    enableOptimization: true,
    measurePerformance: process.env.NODE_ENV === 'development'
  };
};

export default PerformanceWrapper;
