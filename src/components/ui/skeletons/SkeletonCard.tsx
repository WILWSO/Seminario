import React from 'react';
import { SkeletonText } from './SkeletonText';

interface SkeletonCardProps {
  showImage?: boolean;
  showTitle?: boolean;
  showDescription?: boolean;
  showActions?: boolean;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  showImage = true,
  showTitle = true,
  showDescription = true,
  showActions = false,
  className = ''
}) => {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-md p-6 ${className}`}>
      {showImage && (
        <div className="w-full h-48 bg-slate-200 dark:bg-slate-700 rounded-lg mb-4 animate-pulse"></div>
      )}
      
      {showTitle && (
        <SkeletonText width="75%" height="h-6" className="mb-3" />
      )}
      
      {showDescription && (
        <div className="space-y-2 mb-4">
          <SkeletonText width="100%" height="h-4" />
          <SkeletonText width="85%" height="h-4" />
          <SkeletonText width="60%" height="h-4" />
        </div>
      )}
      
      {showActions && (
        <div className="flex gap-2">
          <SkeletonText width="80px" height="h-8" />
          <SkeletonText width="100px" height="h-8" />
        </div>
      )}
    </div>
  );
};
