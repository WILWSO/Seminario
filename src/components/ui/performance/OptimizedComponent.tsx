import React, { memo, useCallback, useMemo, ReactNode } from 'react';

interface OptimizedComponentProps {
  children: ReactNode;
  dependencies?: any[];
  shouldUpdate?: (prevProps: any, nextProps: any) => boolean;
  className?: string;
  onOptimizedClick?: (event: React.MouseEvent) => void;
}

const defaultShouldUpdate = (prevProps: any, nextProps: any) => {
  // Simple shallow comparison for optimization
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);
  
  if (prevKeys.length !== nextKeys.length) {
    return true;
  }
  
  return prevKeys.some(key => prevProps[key] !== nextProps[key]);
};

export const OptimizedComponent: React.FC<OptimizedComponentProps> = memo(({
  children,
  dependencies = [],
  shouldUpdate = defaultShouldUpdate,
  className = '',
  onOptimizedClick
}) => {
  // Memoize children based on dependencies
  const memoizedChildren = useMemo(() => {
    return children;
  }, dependencies);

  // Optimized click handler with useCallback
  const handleClick = useCallback((event: React.MouseEvent) => {
    // Prevent unnecessary event bubbling
    event.stopPropagation();
    
    // Call custom click handler if provided
    if (onOptimizedClick) {
      onOptimizedClick(event);
    }
  }, [onOptimizedClick]);

  // Optimized render with minimal re-renders
  return (
    <div 
      className={`optimized-component ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e as any);
        }
      }}
    >
      {memoizedChildren}
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  if (prevProps.shouldUpdate) {
    return !prevProps.shouldUpdate(prevProps, nextProps);
  }
  return !defaultShouldUpdate(prevProps, nextProps);
});

OptimizedComponent.displayName = 'OptimizedComponent';

export default OptimizedComponent;
