import React from 'react';
import { SkeletonText } from './SkeletonText';

// Componentes de skeleton específicos para backward compatibility

export const CourseHeaderSkeleton: React.FC = () => (
  <div className="relative h-64 rounded-xl overflow-hidden animate-pulse">
    <div className="absolute inset-0 bg-slate-300 dark:bg-slate-600"></div>
    <div className="absolute bottom-0 left-0 p-6">
      <div className="h-8 bg-slate-400 dark:bg-slate-500 rounded w-64 mb-2"></div>
      <div className="h-4 bg-slate-400 dark:bg-slate-500 rounded w-48"></div>
    </div>
  </div>
);

export const ProgressSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
    <div className="animate-pulse space-y-4">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
      <div className="space-y-2">
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
        <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
      </div>
      <div className="flex justify-between items-center">
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-24"></div>
        <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded w-40"></div>
      </div>
    </div>
  </div>
);

export const ModulesSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md overflow-hidden">
    <div className="border-b border-slate-200 dark:border-slate-700 p-6">
      <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-48 animate-pulse"></div>
    </div>
    <div className="divide-y divide-slate-200 dark:divide-slate-700">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="p-6">
          <div className="animate-pulse flex items-center justify-between">
            <div className="flex-1">
              <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
            </div>
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ModuleContentSkeleton: React.FC = () => (
  <div className="px-6 pb-4">
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="ml-4 border-l-2 border-slate-200 dark:border-slate-600 pl-4">
          <div className="animate-pulse">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center mb-2">
                  <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded-full mr-2"></div>
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                </div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full mb-2"></div>
                <div className="space-y-2">
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                </div>
              </div>
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-24 ml-4"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

// Alias para backward compatibility
export const SkeletonLoader = SkeletonText;
