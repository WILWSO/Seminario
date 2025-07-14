import React, { ReactNode } from 'react';
import { ProgressiveLoader } from '../ui';
import { CourseHeaderSkeleton, ProgressSkeleton, ModulesSkeleton } from '../ui';

interface OptimizedPageProps {
  title?: string;
  description?: string;
  children: ReactNode;
  isLoading?: boolean;
  skeleton?: 'stats' | 'cards' | 'list' | 'custom';
  customSkeleton?: ReactNode;
  error?: Error | null;
  onRetry?: () => void;
  headerActions?: ReactNode;
  className?: string;
}

export const OptimizedPage = ({
  title,
  description,
  children,
  isLoading = false,
  skeleton = 'cards',
  customSkeleton,
  error,
  onRetry,
  headerActions,
  className = ''
}: OptimizedPageProps) => {
  const getSkeletonComponent = () => {
    if (customSkeleton) return customSkeleton;
    
    switch (skeleton) {
      case 'stats':
        return <ProgressSkeleton />;
      case 'cards':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CourseHeaderSkeleton key={i} />
            ))}
          </div>
        );
      case 'list':
        return <ModulesSkeleton />;
      default:
        return <CourseHeaderSkeleton />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      {(title || description || headerActions) && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          {(title || description) && (
            <div>
              {title && (
                <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
                  {title}
                </h1>
              )}
              {description && (
                <p className="text-slate-600 dark:text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>
          )}
          {headerActions && (
            <div className="mt-4 md:mt-0">
              {headerActions}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <ProgressiveLoader
        isLoading={isLoading}
        skeleton={getSkeletonComponent()}
        error={error}
        onRetry={onRetry}
        delay={100}
      >
        {children}
      </ProgressiveLoader>
    </div>
  );
};
